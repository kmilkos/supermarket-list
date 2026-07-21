# HTTPS Setup for SuperMarketList

The barcode scanner requires camera access, which modern browsers only allow over **HTTPS** (or localhost). Below are two methods to enable HTTPS.

---

## Option 1: mkcert (Local / LAN — Recommended)

Creates a trusted self-signed certificate for your local IP / hostname.

### 1. Install mkcert

```bash
sudo apt install libnss3-tools
curl -JLO https://dl.filippo.io/mkcert/latest?for=linux/amd64
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
mkcert -install
```

### 2. Generate a certificate for your LAN IP

Replace `192.168.1.155` with your actual LAN IP:

```bash
mkcert 192.168.1.155 localhost 127.0.0.1
```

This produces `192.168.1.155+2.pem` (cert) and `192.168.1.155+2-key.pem` (key).

### 3. Move certs to the project

```bash
mkdir -p ~/SuperMarketList/certs
mv 192.168.1.155+2.pem ~/SuperMarketList/certs/cert.pem
mv 192.168.1.155+2-key.pem ~/SuperMarketList/certs/key.pem
```

### 4. Create an HTTPS wrapper script

Create `server/https.js`:

```js
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./index'); // your Express app

const PORT = process.env.PORT || 3001;

const options = {
  key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'cert.pem')),
};

https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://0.0.0.0:${PORT}`);
});
```

### 5. Run with HTTPS

```bash
node server/https.js
```

---

## Option 2: Let's Encrypt (Public Domain)

Use this if you have a public domain pointing to your server.

### 1. Install certbot

```bash
sudo apt install certbot
```

### 2. Obtain a certificate

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

Certificates are stored in `/etc/letsencrypt/live/yourdomain.com/`.

### 3. Update systemd service

Edit `/etc/systemd/system/supermarket-list.service` and set:

```
ExecStart=/usr/bin/node /home/youruser/SuperMarketList/server/index.js
Environment=NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

Then create an HTTPS wrapper pointing to the Let's Encrypt certs (same as Option 1 but using `/etc/letsencrypt/live/yourdomain.com/privkey.pem` and `fullchain.pem`).

---

## Option 3: Reverse proxy (nginx + Let's Encrypt)

Recommended for production — nginx handles HTTPS while your app stays HTTP on localhost.

### 1. Install nginx

```bash
sudo apt install nginx
```

### 2. Configure site

Create `/etc/nginx/sites-available/supermarket-list`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

### 3. Enable and restart

```bash
sudo ln -s /etc/nginx/sites-available/supermarket-list /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

---

## Verify camera access

After setting up HTTPS, navigate to `https://your-ip-or-domain:3001` and test the barcode scanner. The browser will prompt for camera permission — allow it.

> **Note:** Android Chrome also requires the page to be opened via HTTPS, not HTTP. If you're testing locally on the same machine, `http://localhost:3001` works even without HTTPS.
