# Deploy Nanak Migration Backend on Ubuntu EC2

Use: **GitHub clone → Node → PM2 → Nginx → Certbot (SSL)**

Repo: https://github.com/singhpuneet81-ux/nanak-migration-BE  
App port (internal): `5001`  
Public URL (example): `https://api.yourdomain.com`

---

## 0) Before you start (AWS)

1. EC2 Ubuntu 22.04 / 24.04
2. Security Group inbound:
   - `22` SSH (your IP)
   - `80` HTTP (0.0.0.0/0)
   - `443` HTTPS (0.0.0.0/0)
   - Do **not** open `5001` publicly (Nginx proxies it)
3. DNS: create **A record**  
   `api.yourdomain.com` → EC2 Elastic IP / public IP

---

## 1) SSH into the server

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 2) System update + packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx ufw
```

---

## 3) Install Node.js 20 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

---

## 4) Install PM2 (global)

```bash
sudo npm install -g pm2
```

---

## 5) Clone the backend from GitHub

```bash
sudo mkdir -p /var/www
sudo chown -R ubuntu:ubuntu /var/www
cd /var/www
git clone https://github.com/singhpuneet81-ux/nanak-migration-BE.git
cd nanak-migration-BE
npm install --omit=dev
```

Private repo? Use a deploy key or:

```bash
git clone https://YOUR_GITHUB_USERNAME:YOUR_PAT@github.com/singhpuneet81-ux/nanak-migration-BE.git
```

---

## 6) Create production `.env`

```bash
nano /var/www/nanak-migration-BE/.env
```

Paste (edit values):

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?appName=nanak-migration
JWT_SECRET=put-a-long-random-secret-here
INTAKE_API_KEY=put-a-strong-intake-key-here
PORT=5001
CORS_ORIGIN=https://your-admin-vercel-url.vercel.app,http://localhost:5174
SEED_ADMIN_EMAIL=admin@nanakmigration.com.au
SEED_ADMIN_PASSWORD=ChooseAStrongPassword!
NODE_ENV=production
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

Seed admin + demo data (first time only):

```bash
cd /var/www/nanak-migration-BE
npm run seed
```

---

## 7) Start API with PM2 (24×7)

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R ubuntu:ubuntu /var/log/pm2

cd /var/www/nanak-migration-BE
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs nanak-migration-api --lines 50
```

Survive reboot:

```bash
pm2 startup systemd
# run the command PM2 prints (sudo env PATH=...)
pm2 save
```

Local health check:

```bash
curl http://127.0.0.1:5001/api/health
```

Expected: `{"success":true,"service":"nanak-migration-backend"}`

---

## 8) Nginx site config

```bash
sudo nano /etc/nginx/sites-available/nanak-migration-api
```

Paste contents of `deploy/nginx-nanak-migration-api.conf` from this repo  
**(change `api.yourdomain.com` to your real domain)**.

Or copy from the repo:

```bash
sudo cp /var/www/nanak-migration-BE/deploy/nginx-nanak-migration-api.conf /etc/nginx/sites-available/nanak-migration-api
sudo nano /etc/nginx/sites-available/nanak-migration-api
# edit server_name
```

Enable site:

```bash
sudo ln -sf /etc/nginx/sites-available/nanak-migration-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9) Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 10) SSL with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Follow prompts (email, agree TOS). Certbot edits Nginx for HTTPS + auto-renew.

Test renew:

```bash
sudo certbot renew --dry-run
```

Public checks:

```bash
curl https://api.yourdomain.com/api/health
```

---

## 11) Point the admin frontend at the API

In Vercel (nanak-migration-FE) set:

```
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

Redeploy the frontend. Also keep that URL in backend `CORS_ORIGIN`.

---

## Day-to-day updates (after git push)

```bash
cd /var/www/nanak-migration-BE
git pull origin main
npm install --omit=dev
pm2 restart nanak-migration-api
pm2 logs nanak-migration-api --lines 30
```

---

## Useful PM2 / Nginx commands

```bash
pm2 status
pm2 restart nanak-migration-api
pm2 stop nanak-migration-api
pm2 logs nanak-migration-api
pm2 monit

sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway | `pm2 status` — API down? `curl 127.0.0.1:5001/api/health` |
| CORS blocked | Add Vercel URL to `CORS_ORIGIN`, then `pm2 restart nanak-migration-api` |
| Certbot fail | DNS A record not pointing to this EC2 yet |
| Mongo connection | Whitelist EC2 public IP (or `0.0.0.0/0`) in Atlas Network Access |
| Permission denied on clone | Use PAT / deploy key for private repo |
