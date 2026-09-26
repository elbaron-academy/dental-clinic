"""gunicorn settings for production (used by the systemd service).

Values can be overridden in shared/.env; see backend/deploy/env.template.
"""

import multiprocessing
import os

bind = os.environ.get("GUNICORN_BIND", "127.0.0.1:8000")
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "30"))
graceful_timeout = 30
keepalive = 5

# Recycle workers now and then to contain memory leaks.
max_requests = 1000
max_requests_jitter = 100

# Log to stdout/stderr so journald collects everything.
accesslog = "-"
errorlog = "-"

# Only nginx on this host may set X-Forwarded-* headers.
forwarded_allow_ips = "127.0.0.1"
