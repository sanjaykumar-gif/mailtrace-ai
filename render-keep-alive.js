#!/usr/bin/env node
/**
 * Render Keep-Alive / Anti-Cold-Start Utility for MailTrace AI
 *
 * Render free web services spin down after 15 minutes of inactivity.
 * This script sends a periodic heartbeat ping (default: every 14 minutes)
 * to keep the service warm and eliminate cold-start latency.
 *
 * Usage:
 *   node render-keep-alive.js
 *   node render-keep-alive.js --once
 *   RENDER_URL="https://your-app.onrender.com" node render-keep-alive.js
 */

const https = require('https');
const http = require('http');

// Configuration
const DEFAULT_URL = 'https://mailtrace-ai-1-ml0g.onrender.com/api/health';
const TARGET_URL = process.env.RENDER_URL || process.env.RENDER_HEALTH_URL || DEFAULT_URL;
const INTERVAL_MINUTES = parseFloat(process.env.INTERVAL_MINUTES || '14'); // 14 mins prevents 15 min Render sleep
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
const TIMEOUT_MS = 60000; // 60s timeout for cold start wake-up

const isOnce = process.argv.includes('--once');

// Formatting helpers
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(level, message, color = colors.reset) {
  console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${color}${level}${colors.reset} ${message}`);
}

/**
 * Ping target URL
 */
function ping(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    log('PING', `Sending keep-alive ping to ${colors.bold}${url}${colors.reset}...`, colors.cyan);

    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'MailTrace-Render-KeepAlive/1.0',
            'Accept': 'application/json, text/plain, */*',
          },
          timeout: TIMEOUT_MS,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            const elapsed = Date.now() - startTime;
            if (res.statusCode >= 200 && res.statusCode < 400) {
              log(
                'SUCCESS',
                `Service is AWAKE! Status: ${res.statusCode} | Latency: ${elapsed}ms`,
                colors.green
              );
              resolve({ ok: true, statusCode: res.statusCode, elapsed });
            } else {
              log(
                'WARN',
                `Received non-200 status (${res.statusCode}) in ${elapsed}ms`,
                colors.yellow
              );
              resolve({ ok: false, statusCode: res.statusCode, elapsed });
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        const elapsed = Date.now() - startTime;
        log('TIMEOUT', `Request timed out after ${elapsed}ms (Service might be waking from cold start)`, colors.red);
        resolve({ ok: false, error: 'TIMEOUT', elapsed });
      });

      req.on('error', (err) => {
        const elapsed = Date.now() - startTime;
        log('ERROR', `Connection error: ${err.message} (${elapsed}ms)`, colors.red);
        resolve({ ok: false, error: err.message, elapsed });
      });
    } catch (err) {
      log('ERROR', `Invalid URL or unexpected error: ${err.message}`, colors.red);
      resolve({ ok: false, error: err.message });
    }
  });
}

/**
 * Main loop
 */
async function start() {
  console.log(`${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}🚀 MailTrace AI — Render Keep-Alive / Anti-Sleep Service${colors.reset}`);
  console.log(`🎯 Target:   ${TARGET_URL}`);
  console.log(`⏱️  Interval: Every ${INTERVAL_MINUTES} minutes (${INTERVAL_MS / 1000}s)`);
  console.log(`${colors.cyan}====================================================${colors.reset}\n`);

  // Initial Ping
  await ping(TARGET_URL);

  if (isOnce) {
    log('DONE', 'Single ping completed (--once flag specified). Exiting.', colors.cyan);
    process.exit(0);
  }

  // Periodic Keep-Alive
  const timer = setInterval(async () => {
    await ping(TARGET_URL);
  }, INTERVAL_MS);

  // Graceful Shutdown
  const shutdown = () => {
    console.log(`\n${colors.yellow}Shutting down keep-alive service...${colors.reset}`);
    clearInterval(timer);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
