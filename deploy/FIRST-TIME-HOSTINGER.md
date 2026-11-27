# First-time Hostinger: `pos.25nov.tech`

Same VPS family as **sumady-test** (`app.25nov.tech` → PM2 `:4002`).  
POS uses **PM2 `sumady-pos-web` on `127.0.0.1:4003`**.

Cloudflare DNS for `pos.25nov.tech` is already created (proxied). Until Nginx has a dedicated `server_name`, the hostname may show another 25nov site.

## 1. Clone (once)

```bash
sudo mkdir -p /opt/sumady-pos
sudo chown "$USER":"$USER" /opt/sumady-pos
cd /opt/sumady-pos
git clone https://github.com/uysuy/sumady_pos.git .
cp deploy.sumady-pos.example.sh deploy.sh && chmod +x deploy.sh
```

## 2. Env + PayWay sandbox example

```bash
cd /opt/sumady-pos/pos-web
cp .env.example .env
nano .env
```

Paste / fill (use your real ABA sandbox values — do not commit):

```env
HOST=127.0.0.1
PORT=4003
NODE_ENV=production

# ABA PayWay sandbox — required for KHQR on checkout + CDS
PAYWAY_MERCHANT_ID=your_sandbox_merchant_id
PAYWAY_API_KEY=your_sandbox_api_key
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh

# Optional (not used by current KHQR HMAC flow)
PAYWAY_RSA_PUBLIC_KEY=
PAYWAY_RSA_PRIVATE_KEY=
```

After editing `.env`, always restart with `--update-env` (or `bash deploy.sh`) so PM2 reloads secrets.

## 3. Build + PM2 (once)

```bash
cd /opt/sumady-pos
bash deploy.sh
# or first time manually:
# cd pos-web && npm ci && npm run build && pm2 start ecosystem.config.cjs && pm2 save
curl -sI http://127.0.0.1:4003/ | head -3
```

## 4. Nginx (once) — required so `pos.25nov.tech` is not the wrong site

```bash
sudo cp /opt/sumady-pos/deploy/nginx-pos.25nov.tech.conf /etc/nginx/sites-available/pos.25nov.tech
sudo ln -sf /etc/nginx/sites-available/pos.25nov.tech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If other sites use certbot SSL, issue a cert (or copy the SSL block from `app.25nov.tech`):

```bash
sudo certbot --nginx -d pos.25nov.tech
```

Cloudflare SSL/TLS mode: **Full** (or Full strict after certbot).

## 5. Smoke

```bash
curl -sI https://pos.25nov.tech/ | head -5
```

Expect SvelteKit / Coffee Plus — not the 25November marketing landing page.

## Redeploy later

```bash
cd /opt/sumady-pos && bash deploy.sh
```
