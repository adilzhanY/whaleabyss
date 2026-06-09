# nginx rate limiting — prod VM setup

Run these on the VM (the one serving whaleabyss.ru), in order.

## 1. Back up the current config

```bash
sudo cp /etc/nginx/sites-enabled/whaleabyss ~/whaleabyss.nginx.bak
```

## 2. Write the new config

Quoted `'EOF'` is required — it stops the shell from expanding the `$` variables.

```bash
sudo tee /etc/nginx/sites-enabled/whaleabyss > /dev/null <<'EOF'
# --- Rate limiting (http-scope: this file is included inside http{}) ---
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_status 429;

server {
    server_name whaleabyss.ru www.whaleabyss.ru;

    # API: throttle abusive bursts before they reach Node (cost / flood protection)
    location /api/ {
        limit_req zone=api burst=30 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/whaleabyss.ru/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/whaleabyss.ru/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.whaleabyss.ru) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = whaleabyss.ru) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name whaleabyss.ru www.whaleabyss.ru;
    return 404; # managed by Certbot
}
EOF
```

## 3. Validate (must pass before reloading)

```bash
sudo nginx -t
```

Expected: `syntax is ok` / `test is successful`. If it errors, **do not reload** — restore the backup:

```bash
sudo cp ~/whaleabyss.nginx.bak /etc/nginx/sites-enabled/whaleabyss
```

## 4. Reload (zero-downtime)

```bash
sudo systemctl reload nginx
```

## 5. Verify

```bash
# Site still up?
curl -s -o /dev/null -w "home: %{http_code}\n" https://whaleabyss.ru

# Hammer the API — 200s should flip to 429s as the burst is exhausted:
for i in $(seq 1 80); do curl -s -o /dev/null -w "%{http_code}\n" https://whaleabyss.ru/api/events; done | sort | uniq -c

# Confirm real client IPs now reach the app (per-IP limits no longer global):
pm2 logs whaleabyss --lines 20 --nostream
```

A batch of `200`s followed by `429`s = working.

## Rollback (any time)

```bash
sudo cp ~/whaleabyss.nginx.bak /etc/nginx/sites-enabled/whaleabyss
sudo nginx -t && sudo systemctl reload nginx
```

## Tuning notes

- `rate=10r/s` + `burst=30` is per client IP (≈600 req/min average, bursts to 30).
- If real users ever get 429s (e.g. many customers behind one mobile-carrier IP),
  raise `rate` to `20r/s` and reload.
- Only `/api/` is limited — page loads and `/_next/*` static assets are never throttled.
