#!/usr/bin/env python3
"""Deploy the dental clinic (Django backend + React PWA) to a server over SSH.

Combines the generic SSH deploy tool with this repo's own scripts:
- provisions the server if needed: nginx, git, rsync, Python, Node, certbot
- clones/updates the repo on the server
- writes backend/shared/.env once (secret key, hosts, CORS, database)
- runs backend/deploy/deploy.sh and web/deploy/deploy.sh (releases, symlink switch, rollback)
- optional Let's Encrypt certificates, verification and a desktop pop-up when done

Usage: deploy.py [production] [--update]   (--update skips provisioning and SSL)
"""
import argparse
import http.client
import json
import shlex
import shutil
import socket
import ssl
import subprocess
import sys
import time
from pathlib import Path

import yaml  # pip install pyyaml

ROOT = Path(__file__).resolve().parent
CONFIG = ROOT / "config.yml"
ENVIRONMENTS = ("production",)

_current_step = "starting"


def step(msg):
    global _current_step
    _current_step = msg
    print(f"\n==> {msg}")


def load_config(env):
    if not CONFIG.exists():
        sys.exit(f"{CONFIG.name} not found. Copy config.yml.example to config.yml and fill it in.")
    cfg = (yaml.safe_load(CONFIG.read_text()) or {}).get(env)
    if not isinstance(cfg, dict):
        sys.exit(f"No '{env}' section in {CONFIG.name}")
    required = {
        "": ["ip", "username", "ssh_file", "repo", "frontend", "backend"],
        "repo": ["git_url", "branch", "checkout", "install_root", "name"],
        "frontend": ["domain"],
        "backend": ["domain"],
    }
    missing = []
    for section, keys in required.items():
        node = cfg.get(section, {}) if section else cfg
        missing += [f"{section + '.' if section else ''}{k}" for k in keys if not node.get(k)]
    if missing:
        sys.exit(f"Missing in {CONFIG.name} ({env}): {', '.join(missing)}")
    if cfg.get("ssl") and not cfg.get("ssl_email"):
        sys.exit(f"Missing in {CONFIG.name} ({env}): ssl_email (required when ssl: true)")
    return cfg


def scheme(cfg):
    return "https" if cfg.get("ssl") else "http"


class Server:
    def __init__(self, cfg):
        self.target = f"{cfg['username']}@{cfg['ip']}"
        self.key = str(Path(cfg["ssh_file"]).expanduser())
        self.ssh_opts = ["-i", self.key, "-o", "StrictHostKeyChecking=accept-new"]

    def run(self, script):
        """Run a bash script on the server."""
        subprocess.run(["ssh", *self.ssh_opts, self.target, "bash -s"],
                       input=f"set -e\n{script}", text=True, check=True)

    def test(self, script):
        """Run a bash script on the server and return True if it exits 0."""
        return subprocess.run(["ssh", *self.ssh_opts, self.target, "bash -s"],
                              input=script, text=True, capture_output=True).returncode == 0


def bootstrap(srv, cfg):
    node_major = int(cfg["frontend"].get("node_major", 22))
    step("Installing required tools if missing")
    srv.run(f"""
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get install -y nginx git curl rsync sqlite3 python3 python3-venv python3-pip ca-certificates \\
    certbot python3-certbot-nginx
sudo systemctl enable --now nginx
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt {node_major} ]; then
    curl -fsSL https://deb.nodesource.com/setup_{node_major}.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
""")


def git_sync(srv, cfg):
    r = cfg["repo"]
    path, url, br = shlex.quote(r["checkout"]), shlex.quote(r["git_url"]), shlex.quote(r["branch"])
    step(f"Updating the repo on the server ({r['git_url']} @ {r['branch']})")
    srv.run(f"""
sudo mkdir -p {path} && sudo chown "$(id -un):" {path}
cd {path}
if [ ! -d .git ]; then
    git init -q
    git remote add origin {url}
fi
git remote set-url origin {url}
git fetch -q origin {br}
git checkout -q -f -B {br} origin/{br}
echo "checked out $(git rev-parse --short HEAD)"
""")


def write_backend_env(srv, cfg):
    """Create shared/.env once from backend/deploy/env.template; later deploys keep it."""
    r, be, fe = cfg["repo"], cfg["backend"], cfg["frontend"]
    shared = f"{r['install_root']}/backend/shared"
    db = be.get("database_url") or f"sqlite:///{shared}/db.sqlite3"
    step("Writing backend settings (shared/.env, only if missing)")
    srv.run(f"""
sudo install -d {shlex.quote(shared)}
if [ ! -f {shlex.quote(shared)}/.env ]; then
    secret=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
    sed -e 's|__DOMAIN__|{be["domain"]}|g' -e "s|__SECRET__|$secret|" \\
        -e 's|^DATABASE_URL=.*|DATABASE_URL={db}|' \\
        -e '/CHANGE_ME with/d' \\
        -e 's|^GUNICORN_WORKERS=.*|GUNICORN_WORKERS={be.get("workers", 2)}|' \\
        {shlex.quote(r["checkout"])}/backend/deploy/env.template \\
      | sudo tee {shlex.quote(shared)}/.env >/dev/null
    echo 'CORS_ALLOWED_ORIGINS={scheme(cfg)}://{fe["domain"]}' | sudo tee -a {shlex.quote(shared)}/.env >/dev/null
    id -u {r["name"]} >/dev/null 2>&1 || sudo useradd --system --home-dir {shlex.quote(r["install_root"])}/backend/.home \\
        --no-create-home --shell /usr/sbin/nologin {r["name"]}
    sudo chown {r["name"]}:{r["name"]} {shlex.quote(shared)}/.env
    sudo chmod 600 {shlex.quote(shared)}/.env
    echo "created {shared}/.env"
else
    echo "{shared}/.env exists: kept"
fi
""")


def deploy_apps(srv, cfg):
    r, be, fe = cfg["repo"], cfg["backend"], cfg["frontend"]
    common = f"--path {shlex.quote(r['install_root'])} --name {shlex.quote(r['name'])}"
    redirect = f"--root-redirect {shlex.quote(be['root_redirect'])}" if be.get("root_redirect") else ""
    step("Deploying the backend (backend/deploy/deploy.sh)")
    srv.run(f"cd {shlex.quote(r['checkout'])}\n"
            f"sudo backend/deploy/deploy.sh --domain {be['domain']} --port {be.get('port', 8000)} {common} {redirect}")
    step("Deploying the web/PWA (web/deploy/deploy.sh)")
    srv.run(f"cd {shlex.quote(r['checkout'])}\n"
            f"sudo web/deploy/deploy.sh --domain {fe['domain']} --api-url {scheme(cfg)}://{be['domain']} {common}")


def dns_points_to_server(domain, ip):
    try:
        addrs = sorted({a[4][0] for a in socket.getaddrinfo(domain, 80, socket.AF_INET)})
    except socket.gaierror:
        return False, []
    return ip in addrs, addrs


def setup_ssl(srv, cfg):
    """One Let's Encrypt certificate per domain that already points at this server."""
    step("Installing SSL certificates (Let's Encrypt)")
    for side in ("frontend", "backend"):
        domain = cfg[side]["domain"]
        if not dns_points_to_server(domain, cfg["ip"])[0]:
            print(f"  [warn] skipping {domain}: DNS does not point to {cfg['ip']} (certbot would fail)")
            continue
        srv.run(f"sudo certbot --nginx --non-interactive --agree-tos --redirect "
                f"-m {shlex.quote(cfg['ssl_email'])} -d {shlex.quote(domain)}")


class _HTTPSToIP(http.client.HTTPSConnection):
    """HTTPS to a fixed IP while sending the domain as SNI and verifying its certificate."""

    def __init__(self, domain, ip, timeout):
        super().__init__(domain, 443, timeout=timeout, context=ssl.create_default_context())
        self._ip = ip

    def connect(self):
        sock = socket.create_connection((self._ip, 443), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)


def http_get(ip, domain, path, use_ssl=False, retries=10, delay=3):
    """GET straight from the server IP (works before DNS is set up). Returns (status, body|error)."""
    last = "no response"
    for _ in range(retries):
        try:
            conn = _HTTPSToIP(domain, ip, 10) if use_ssl else http.client.HTTPConnection(ip, 80, timeout=10)
            conn.request("GET", path, headers={"Host": domain})
            res = conn.getresponse()
            body = res.read().decode(errors="replace")
            conn.close()
            if res.status < 500:
                return res.status, body
            last = f"HTTP {res.status}"
        except (OSError, ssl.SSLError) as e:
            last = str(e)
        time.sleep(delay)
    return None, last


def verify(cfg, use_ssl):
    step("Verifying deployment")
    ip, fe, be = cfg["ip"], cfg["frontend"], cfg["backend"]
    health_path = be.get("health_path", "/api/health/")
    sch = "https" if use_ssl else "http"
    ok, lines = True, []

    def report(line):
        print(f"  {line}")
        lines.append(line)

    for domain in (fe["domain"], be["domain"]):
        points, addrs = dns_points_to_server(domain, ip)
        if points:
            report(f"[ok] DNS {domain} -> {ip}")
        else:
            report(f"[warn] DNS {domain} -> {', '.join(addrs) or 'does not resolve'} (expected {ip})")

    status, body = http_get(ip, be["domain"], health_path, use_ssl)
    url = f"{sch}://{be['domain']}{health_path}"
    if status == 200:
        try:
            report(f"[ok] API {url} -> {json.loads(body)}")
        except ValueError:
            report(f"[ok] API {url} -> 200")
    else:
        ok = False
        report(f"[fail] API {url} -> {status or body}")

    status, body = http_get(ip, fe["domain"], "/", use_ssl)
    if status == 200:
        report(f"[ok] Frontend {sch}://{fe['domain']}/ -> 200")
    else:
        ok = False
        report(f"[fail] Frontend {sch}://{fe['domain']}/ -> {status or body}")
    return ok, lines


def notify(title, message, ok):
    """Desktop pop-up when the deploy finishes. Never raises."""
    if shutil.which("notify-send"):
        subprocess.run(["notify-send", "-u", "normal" if ok else "critical", title, message],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser(description="Deploy the backend and the PWA to the server.")
    parser.add_argument("environment", nargs="?", choices=ENVIRONMENTS, default="production")
    parser.add_argument("--update", action="store_true",
                        help="routine update: skip provisioning and SSL, just pull and deploy")
    args = parser.parse_args()
    env = args.environment
    cfg = load_config(env)
    srv = Server(cfg)
    print(f"Deploying {env} to {srv.target}")

    try:
        if not args.update:
            bootstrap(srv, cfg)
        git_sync(srv, cfg)
        write_backend_env(srv, cfg)
        deploy_apps(srv, cfg)
        if cfg.get("ssl") and not args.update:
            setup_ssl(srv, cfg)
        healthy, lines = verify(cfg, bool(cfg.get("ssl")))
    except Exception:
        notify(f"Deploy {env} FAILED", f"Failed during: {_current_step}", ok=False)
        raise

    notify(f"Deploy {env} {'OK' if healthy else 'FAILED'}", "\n".join(lines), ok=healthy)
    if not healthy:
        sys.exit("\nVerification failed:\n  " + "\n  ".join(l for l in lines if l.startswith("[fail]")))
    print("\nDone.")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        sys.exit(f"\nFailed: {' '.join(map(str, e.cmd))[:200]} (exit {e.returncode})")
