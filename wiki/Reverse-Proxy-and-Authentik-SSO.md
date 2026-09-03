# 🔒 Reverse Proxy & Authentik SSO Guide

InstaSave Tracker is designed to sit cleanly behind any reverse proxy and supports header-based SSO authentication with built-in role enforcement.

---

## 🛡️ Authentik Integration & Viewer Mode

InstaSave Tracker detects the `x-authentik-groups` header forwarded by Authentik Forward Auth or Traefik Middleware.

### Role Permissions

| Authentik Group | Permission Level |
| :--- | :--- |
| Any standard group / admin | **Full Access**: Can add profiles, update cookies, trigger scrapes, edit notes, configure Cloudinary, and export CSVs. |
| `viewer` or `viewers` | **Read-Only Mode**: Can browse accounts, view saved posts, read timelines, but cannot edit settings, modify credentials, or initiate scrapes. |

### Traefik ForwardAuth Middleware Example
```yaml
http:
  middlewares:
    authentik:
      forwardAuth:
        address: "https://authentik.yourdomain.com/outpost.goauthentik.io/auth/traefik"
        trustForwardHeader: true
        authResponseHeaders:
          - "x-authentik-username"
          - "x-authentik-groups"
          - "x-authentik-email"
```

---

## 🌐 Nginx Proxy Manager / Nginx Configuration

```nginx
server {
    listen 80;
    server_name instagram.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name instagram.yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ☁️ Cloudflare Tunnels (Zero Trust)

If using Cloudflare Tunnels:
1. In Cloudflare Zero Trust &rarr; **Access** &rarr; **Tunnels**, create a tunnel.
2. Add a Public Hostname pointing to `http://localhost:5050` (or `http://app:3000` if on docker network).
3. Optional: Add Cloudflare Access Applications for email OTP or OAuth authentication.
