# BAASH GROWTH — Production Deployment Guide

This guide describes how to deploy the BAASH GROWTH platform onto a production Linux server (Ubuntu 22.04/24.04 LTS or Amazon Linux 2023) using Node.js, PostgreSQL, Redis, PM2, and Nginx with Let's Encrypt TLS.

---

## 1. System Requirements & Prerequisites

- **Hardware**: Minimum 2 vCPU, 4 GB RAM, 20 GB SSD.
- **Operating System**: Ubuntu 22.04 LTS / 24.04 LTS.
- **Runtime & DB**:
  - Node.js `v20.x LTS` & `npm v10+`
  - PostgreSQL `v14+`
  - Redis `v7+`
  - Nginx `v1.18+`
  - PM2 (`npm install -g pm2`)
  - Certbot for SSL (`certbot python3-certbot-nginx`)

---

## 2. Infrastructure Setup & Provisioning

### 2.1 Install Base Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib redis-server certbot python3-certbot-nginx

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2.2 Configure PostgreSQL Database
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE baash_growth;
CREATE USER baash_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE baash_growth TO baash_user;
\q
```

---

## 3. Application Build & Setup

### 3.1 Clone & Setup Environment
```bash
cd /var/www
sudo git clone https://github.com/baash/baash-growth.git
cd baash-growth
sudo chown -R $USER:$USER /var/www/baash-growth
```

### 3.2 Backend Configuration & Build
```bash
cd /var/www/baash-growth/backend
cp ../.env.example .env

# Edit .env with production credentials:
nano .env
# Set DATABASE_URL="postgresql://baash_user:YOUR_STRONG_PASSWORD_HERE@localhost:5432/baash_growth?schema=public"
# Set JWT_SECRET, JWT_REFRESH_SECRET, and Provider Keys

# Install dependencies and build
npm ci
npx prisma generate
npx prisma migrate deploy
npm run seed  # Seeds initial super admin and channel pricing
npm run build
```

### 3.3 Frontend Configuration & Build
```bash
cd /var/www/baash-growth/frontend
npm ci
npm run build
# Output will be located in /var/www/baash-growth/frontend/dist
```

---

## 4. Process Management (PM2)

Create an `ecosystem.config.js` in `/var/www/baash-growth`:

```javascript
module.exports = {
  apps: [
    {
      name: 'baash-growth-api',
      cwd: '/var/www/baash-growth/backend',
      script: 'dist/src/main.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
```

Start the application under PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 5. Nginx & SSL Configuration

Create `/etc/nginx/sites-available/growth.baash.in`:

```nginx
server {
    listen 80;
    server_name growth.baash.in;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request-uri;
}

server {
    listen 443 ssl http2;
    server_name growth.baash.in;

    # SSL managed by Certbot
    ssl_certificate /etc/letsencrypt/live/growth.baash.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/growth.baash.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend Single Page Application (Static assets)
    root /var/www/baash-growth/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Backend API & Webhooks Reverse Proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
```

Enable site and acquire SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/growth.baash.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d growth.baash.in
sudo systemctl reload nginx
```

---

## 6. Health Monitoring & Zero-Downtime Deployment

### 6.1 Readiness Verification Script
Verify that the service is operational:
```bash
curl -f http://localhost:4000/api/health/ready || exit 1
```

### 6.2 Zero-Downtime Reload Script
Save as `/var/www/baash-growth/deploy.sh`:
```bash
#!/bin/bash
set -e
echo "Starting BAASH GROWTH deployment..."
cd /var/www/baash-growth

git pull origin main

cd backend
npm ci
npx prisma migrate deploy
npm run build

cd ../frontend
npm ci
npm run build

# Reload backend cluster with zero downtime
pm2 reload baash-growth-api

# Check health
sleep 3
curl -f http://localhost:4000/api/health/ready
echo "Deployment completed successfully!"
```
```bash
chmod +x /var/www/baash-growth/deploy.sh
```

---

## 7. Automated Backups

Create a daily PostgreSQL backup cron job:
```bash
crontab -e
```
Add:
```cron
0 2 * * * pg_dump -U baash_user -h localhost baash_growth | gzip > /var/backups/baash_growth_$(date +\%Y\%m\%d).sql.gz
```
