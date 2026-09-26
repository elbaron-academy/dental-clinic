# Deployment TODO

Checklist for deploying the backend and the Web/PWA to one Ubuntu 24.04 VM
behind nginx. Work through it top to bottom; later sections assume the earlier ones are done.

Replace `clinic.example.com` with your domain everywhere.

## Current deployment (2026-09-26)

| | |
|---|---|
| VM | `dental-clinic`, GCP `hossam-project-503909`, `us-central1-a`, e2-medium, `34.123.215.195`. Connect with `ssh dental` |
| PWA | https://dental.hossam-ameen.online, built with `--api-url https://api.dental.hossam-ameen.online` |
| API / admin | https://api.dental.hossam-ameen.online. CORS allows the PWA origin |
| Database | SQLite at `/srv/dental-clinic/backend/shared/db.sqlite3` (for now) |
| gunicorn | 2 workers (`GUNICORN_WORKERS=2` in `shared/.env`) |
| Repo | cloned over HTTPS (the repo is public), no deploy key |
| TLS | Let's Encrypt for both domains (no email registered), auto-renew via `certbot.timer` |

The PWA and the API use two domains here, not the single-origin layout described below.
Routine deploy:

```bash
ssh dental
cd /srv/dental-clinic/repo && git pull --ff-only
sudo backend/deploy/deploy.sh --domain api.dental.hossam-ameen.online
sudo web/deploy/deploy.sh --domain dental.hossam-ameen.online --api-url https://api.dental.hossam-ameen.online
```

Back up the SQLite database with
`sudo sqlite3 /srv/dental-clinic/backend/shared/db.sqlite3 ".backup /var/backups/dental-$(date +%F).sqlite3"`.

## How it fits together

```
                     ┌──────────────── nginx (80/443, TLS by certbot) ────────────────┐
browser / PWA ──────►│ /            → /srv/dental-clinic/web/current  (built PWA)     │
                     │ /static/     → /srv/dental-clinic/backend/current/staticfiles  │
                     │ /api/ /admin → gunicorn 127.0.0.1:8000 (systemd service)       │
                     └────────────────────────────────────────────────────────────────┘
                                                        │
                                                   PostgreSQL (local)
```

* One domain serves everything (same origin), as `docs/ARCHITECTURE.md` requires.
  The PWA needs HTTPS for its service worker.
* "Frontend" and "PWA" are the same app: `web/` (React + vite-plugin-pwa).
  `mobile/` (Flutter) isn't deployed to the server.
* Deploy scripts:
  * `backend/deploy/deploy.sh`: gunicorn systemd service, nginx `/api` `/admin` `/static`
  * `backend/deploy/manage.sh`: runs `manage.py` commands in production
  * `web/deploy/deploy.sh`: builds the PWA, nginx `/`, caching and security headers
* Each deploy is a new timestamped release plus an atomic `current` symlink
  switch, a health check and an automatic rollback if the check fails. Five releases are kept.

Server layout:

```
/srv/dental-clinic/
  repo/                       git clone (owned by your login user)
  backend/releases/<ts>/      code + .venv + staticfiles   (root-owned, read-only)
  backend/current -> …
  backend/shared/.env         secrets, kept across releases (mode 600)
  web/releases/<ts>/          built dist/
  web/current -> …
/etc/systemd/system/dental-clinic-backend.service
/etc/nginx/sites-available/clinic.example.com.conf     server block (certbot edits this)
/etc/nginx/dental-clinic/clinic.example.com/backend.conf
/etc/nginx/dental-clinic/clinic.example.com/web.conf
```

---

## 1. VM and DNS

- [ ] Reserve the VM's IP as static, so it survives stop/start:
  ```bash
  gcloud compute addresses create dental-clinic-ip --project=hossam-project-503909 \
    --region=us-central1 --addresses=34.123.215.195
  ```
- [ ] At your DNS provider, add an `A` record: `clinic.example.com → 34.123.215.195`.
  Check it with `dig +short clinic.example.com`.
- [ ] Optional: restrict SSH (port 22) to your own IP in the `allow-ssh` firewall rule.

## 2. Server packages

SSH in with `ssh -i ~/.ssh/id_ed25519 hossam@34.123.215.195`, then:

- [ ] Update the system:
  ```bash
  sudo apt update && sudo apt -y full-upgrade
  sudo apt -y install nginx git rsync curl python3 python3-venv \
    postgresql certbot python3-certbot-nginx unattended-upgrades
  ```
- [ ] Install Node 22 (Ubuntu's own Node is too old for Vite 8):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt -y install nodejs && node -v
  ```
- [ ] Confirm automatic security updates: `systemctl status unattended-upgrades`.
- [ ] Optional: remove nginx's default site with
  `sudo rm /etc/nginx/sites-enabled/default && sudo systemctl reload nginx`.

## 3. PostgreSQL

- [ ] Create the database and its user with a random password:
  ```bash
  DB_PASS="$(openssl rand -hex 24)"; echo "DB password: $DB_PASS"   # keep it for step 5
  sudo -u postgres psql -c "CREATE USER dental WITH PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "CREATE DATABASE dental_clinic OWNER dental;"
  ```
- [ ] PostgreSQL listens on localhost only by default; leave it that way.

## 4. Connect GitHub (read-only deploy key)

A deploy key gives this one VM read access to this one repo, without your personal credentials.

- [ ] On the VM, create a key:
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/github_dental_clinic -N "" -C "dental-clinic VM"
  cat >> ~/.ssh/config <<'EOF'
  Host github.com
      IdentityFile ~/.ssh/github_dental_clinic
      IdentitiesOnly yes
  EOF
  cat ~/.ssh/github_dental_clinic.pub
  ```
- [ ] Add the key to GitHub: repo **elbaron-academy/dental-clinic → Settings → Deploy keys → Add
  deploy key**. Paste the public key and leave **Allow write access** unchecked.
  If you use the gh CLI on your laptop instead:
  `gh repo deploy-key add key.pub --repo elbaron-academy/dental-clinic --title "dental-clinic VM"`.
- [ ] Test it: `ssh -T git@github.com` should greet the repo.
- [ ] Clone:
  ```bash
  sudo mkdir -p /srv/dental-clinic/repo && sudo chown "$USER": /srv/dental-clinic/repo
  git clone git@github.com:elbaron-academy/dental-clinic.git /srv/dental-clinic/repo
  ```

## 5. First backend deploy

- [ ] Run once. It creates `/srv/dental-clinic/backend/shared/.env` and stops:
  ```bash
  cd /srv/dental-clinic/repo
  sudo backend/deploy/deploy.sh --domain clinic.example.com
  ```
- [ ] Edit the env file. Replace `CHANGE_ME` with the DB password and set `DJANGO_TIME_ZONE`:
  `sudo nano /srv/dental-clinic/backend/shared/.env`
- [ ] Run it again. This time it builds, migrates, starts `dental-clinic-backend` and checks `/api/health/`:
  `sudo backend/deploy/deploy.sh --domain clinic.example.com`
- [ ] Create the admin account (you're asked for a phone number, not a username):
  `sudo backend/deploy/manage.sh createsuperuser`
- [ ] Don't run `seed_demo` in production. It creates accounts with a known password.

## 6. First Web/PWA deploy

- [ ] `sudo web/deploy/deploy.sh --domain clinic.example.com`
- [ ] Open `http://clinic.example.com/`. The login portal should load.

## 7. HTTPS

- [ ] Get a certificate and redirect HTTP to HTTPS:
  ```bash
  sudo certbot --nginx -d clinic.example.com --redirect -m you@example.com --agree-tos -n
  ```
- [ ] Confirm renewal works: `sudo certbot renew --dry-run`. The timer shows in
  `systemctl list-timers | grep certbot`.
- [ ] Check the site at `https://clinic.example.com/`: the lock icon shows, the PWA can be
  installed, and `https://clinic.example.com/api/health/` returns `{"status":"ok"}`.
- [ ] Optional: test the TLS setup at https://www.ssllabs.com/ssltest/.

## 8. Set up the clinic

- [ ] In `https://clinic.example.com/admin/`, add the clinic, doctors, assistants,
  receptionists, catalog and payment methods, as in "Setting up a real clinic" in `README.md`.

## 9. Routine deploys

```bash
ssh hossam@34.123.215.195
cd /srv/dental-clinic/repo && git pull --ff-only
sudo backend/deploy/deploy.sh --domain clinic.example.com   # backend first (migrations)
sudo web/deploy/deploy.sh --domain clinic.example.com
```

- [ ] Deploy the backend before the web app, so the API is ready for the new UI.
- [ ] Keep migrations backward compatible (add first, remove in a later release).
  A rollback switches the code back but doesn't undo migrations.
- [ ] Deploy only commits that passed CI.

Rollback:

```bash
sudo backend/deploy/deploy.sh --domain clinic.example.com --rollback
sudo web/deploy/deploy.sh --domain clinic.example.com --rollback
```

## 10. Operations

- [ ] Logs: `journalctl -u dental-clinic-backend -f`, `/var/log/nginx/access.log`, `/var/log/nginx/error.log`.
- [ ] Service: `sudo systemctl status|restart dental-clinic-backend`.
- [ ] Deployed revision: `cat /srv/dental-clinic/backend/current/REVISION`.
- [ ] Nightly database backup, keeping 14 days:
  ```bash
  sudo mkdir -p /var/backups/dental-clinic && sudo chown postgres: /var/backups/dental-clinic
  echo '0 2 * * * postgres pg_dump -Fc dental_clinic > /var/backups/dental-clinic/db-$(date +\%F).dump && find /var/backups/dental-clinic -name "*.dump" -mtime +14 -delete' \
    | sudo tee /etc/cron.d/dental-clinic-backup
  ```
- [ ] Copy backups off the VM too, e.g. to a Cloud Storage bucket
  (`gsutil cp … gs://<bucket>/`), and do a test restore once:
  `pg_restore -d <scratch_db> db-YYYY-MM-DD.dump`.
- [ ] Turn on a GCP scheduled disk snapshot for the VM's boot disk.
- [ ] Add an uptime check (GCP Monitoring or similar) on `https://clinic.example.com/api/health/`.
- [ ] Optional: fail2ban for SSH, and a Content-Security-Policy header once
  the PWA's needs are known.

## 11. Later: automate deploys from GitHub

- [ ] Add a GitHub Actions job that runs after CI passes on `main`. It SSHes to the VM with a
  separate deploy user and key, stored as repo secrets, and runs the commands in section 9.
