"""MailTrace AI — Enterprise Structured Logging."""

import logging
import sys
import time
from typing import Any


class ColoredFormatter(logging.Formatter):
    """Clean, structured console formatter with cyber SOC colorization."""

    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    MAGENTA = "\033[95m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

    LEVEL_COLORS = {
        logging.DEBUG: CYAN,
        logging.INFO: GREEN,
        logging.WARNING: YELLOW,
        logging.ERROR: RED,
        logging.CRITICAL: MAGENTA + BOLD,
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.LEVEL_COLORS.get(record.levelno, self.RESET)
        record.levelname_colored = f"{color}{record.levelname:<7}{self.RESET}"
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(record.created))
        prefix = f"[{timestamp}] [{record.levelname_colored}] [{record.name}]"
        return f"{prefix} {record.getMessage()}"


def setup_logger(name: str = "mailtrace", level: int = logging.INFO) -> logging.Logger:
    """Configures and returns a standardized logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(ColoredFormatter())
        logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False
    return logger


# Global application logger
logger = setup_logger("mailtrace.core")
