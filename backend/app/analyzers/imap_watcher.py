"""
Live IMAP Mailbox Watcher & Real-Time Ingestion Engine for MailTrace AI.

Provides real-time mailbox monitoring (Gmail, Outlook, Yahoo, Custom IMAP).
Fetches raw emails over IMAP4_SSL and automatically passes them to the
analysis and correlation pipeline.
"""

from __future__ import annotations

import email
import imaplib
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Callable

logger = logging.getLogger('mailtrace.imap_watcher')


class ImapWatcher:
    def __init__(self):
        self.lock = threading.Lock()
        self.is_running = False
        self.is_connected = False
        self.thread: threading.Thread | None = None
        self.stop_event = threading.Event()

        # Config
        self.host = ''
        self.port = 993
        self.username = ''
        self.password = ''
        self.use_ssl = True
        self.folder = 'INBOX'
        self.poll_interval = 15  # seconds
        self.only_unread = False

        # State & Stats
        self.last_sync_time: str | None = None
        self.last_error: str | None = None
        self.synced_count = 0
        self.processed_msg_ids: set[str] = set()
        self.activity_log: list[dict] = []

        self.on_email_received: Callable[[bytes, str], None] | None = None

    def log_event(self, message: str, level: str = 'INFO'):
        entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'message': message,
            'level': level,
        }
        with self.lock:
            self.activity_log.append(entry)
            if len(self.activity_log) > 50:
                self.activity_log.pop(0)

    def connect_and_start(self, host: str, username: str, password: str,
                          port: int = 993, use_ssl: bool = True,
                          folder: str = 'INBOX', poll_interval: int = 15,
                          only_unread: bool = False) -> tuple[bool, str]:
        with self.lock:
            if self.is_running:
                self.stop()

            self.host = host.strip()
            self.port = int(port)
            self.username = username.strip()
            self.password = password
            self.use_ssl = use_ssl
            self.folder = folder.strip() or 'INBOX'
            self.poll_interval = max(5, int(poll_interval))
            self.only_unread = only_unread
            self.last_error = None

        # Test initial connection
        ok, msg = self._test_connection()
        if not ok:
            self.last_error = msg
            self.log_event(f'Connection failed: {msg}', 'ERROR')
            return False, msg

        self.stop_event.clear()
        self.is_running = True
        self.is_connected = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.thread.start()

        self.log_event(f'Connected to {self.host} as {self.username}. Live mailbox monitoring active.', 'SUCCESS')
        return True, 'Connected successfully. Live monitoring active.'

    def _test_connection(self) -> tuple[bool, str]:
        pwd = (self.password or '').replace(' ', '').strip()
        user = (self.username or '').strip()
        try:
            if self.use_ssl:
                client = imaplib.IMAP4_SSL(self.host, self.port, timeout=25)
            else:
                client = imaplib.IMAP4(self.host, self.port, timeout=25)
            client.login(user, pwd)
            client.select(self.folder, readonly=True)
            client.logout()
            return True, 'Success'
        except imaplib.IMAP4.error as exc:
            err_str = str(exc)
            if 'AUTHENTICATIONFAILED' in err_str or 'Invalid credentials' in err_str or 'Failure' in err_str:
                return False, 'AUTHENTICATION FAILED: Invalid credentials. For Gmail/Outlook, make sure you are using a 16-character App Password (not your regular account password).'
            return False, f'IMAP Error: {err_str}'
        except TimeoutError:
            return False, 'Connection timed out while contacting IMAP server. Check network or server status.'
        except Exception as exc:
            return False, f'Connection failed ({type(exc).__name__}): {str(exc)}'

    def stop(self):
        self.stop_event.set()
        self.is_running = False
        self.is_connected = False
        self.username = ''
        self.password = ''
        self.host = ''
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=3)
        self.log_event('Mailbox watcher stopped.', 'INFO')

    def sync_now(self) -> dict:
        """Triggers an immediate sync and returns the count of new emails fetched."""
        if not self.host or not self.username:
            return {'success': False, 'message': 'IMAP watcher is not configured.'}
        return self._fetch_and_process(limit=10)

    def _worker_loop(self):
        while not self.stop_event.is_set():
            try:
                self._fetch_and_process(limit=5)
            except Exception as exc:
                self.last_error = str(exc)
                self.log_event(f'Polling error: {exc}', 'WARNING')
            self.stop_event.wait(self.poll_interval)

    def _fetch_and_process(self, limit: int = 5) -> dict:
        pwd = (self.password or '').replace(' ', '').strip()
        user = (self.username or '').strip()
        try:
            if self.use_ssl:
                client = imaplib.IMAP4_SSL(self.host, self.port, timeout=25)
            else:
                client = imaplib.IMAP4(self.host, self.port, timeout=25)

            client.login(user, pwd)
            client.select(self.folder, readonly=False)

            search_criteria = 'UNSEEN' if self.only_unread else 'ALL'
            res, data = client.search(None, search_criteria)
            if res != 'OK' or not data or not data[0]:
                client.logout()
                self.last_sync_time = datetime.now(timezone.utc).isoformat()
                return {'success': True, 'count': 0, 'message': 'No matching messages found.'}

            msg_ids = data[0].split()
            # process the newest messages first
            recent_ids = msg_ids[-limit:]
            new_analyzed = 0

            for mid in reversed(recent_ids):
                mid_str = mid.decode('utf-8', errors='ignore')
                if mid_str in self.processed_msg_ids:
                    continue

                res, msg_data = client.fetch(mid, '(RFC822)')
                if res != 'OK' or not msg_data or not isinstance(msg_data[0], tuple):
                    continue

                raw_email_bytes = msg_data[0][1]
                self.processed_msg_ids.add(mid_str)

                # Dispatch to analysis pipeline callback
                if self.on_email_received:
                    try:
                        self.on_email_received(raw_email_bytes, f'live:imap:{self.username}')
                        new_analyzed += 1
                        self.synced_count += 1
                    except Exception as e:
                        logger.error(f'Error analyzing live email {mid_str}: {e}')

            client.logout()
            self.last_sync_time = datetime.now(timezone.utc).isoformat()
            self.is_connected = True
            if new_analyzed > 0:
                self.log_event(f'Fetched and analyzed {new_analyzed} new live email(s).', 'SUCCESS')

            return {'success': True, 'count': new_analyzed, 'message': f'Synced {new_analyzed} new email(s).'}
        except Exception as exc:
            self.is_connected = False
            self.last_error = str(exc)
            self.log_event(f'Sync failure: {exc}', 'ERROR')
            return {'success': False, 'message': str(exc)}

    def get_status(self) -> dict:
        return {
            'is_running': self.is_running,
            'is_connected': self.is_connected,
            'host': self.host,
            'port': self.port,
            'username': self.username,
            'folder': self.folder,
            'poll_interval': self.poll_interval,
            'only_unread': self.only_unread,
            'last_sync_time': self.last_sync_time,
            'last_error': self.last_error,
            'synced_count': self.synced_count,
            'activity_log': self.activity_log[-15:],
        }


imap_watcher = ImapWatcher()
