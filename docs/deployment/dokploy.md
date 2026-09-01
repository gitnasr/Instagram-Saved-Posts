# 🟣 Dokploy Self-Hosting Guide

[Dokploy](https://dokploy.com) is a modern, lightweight, open-source alternative to Heroku, Netlify, and Portainer with built-in Traefik reverse proxy and SSL automation.

---

## 🚀 1-Click Compose Deployment in Dokploy

### Step 1: Create a New Project & Service
1. Log in to your **Dokploy Dashboard**.
2. Click **Create Project** (e.g. `InstaSave`).
3. Click **Add Service** -> Select **Compose**.

### Step 2: Configure Compose Stack
1. In the Compose Configuration editor, paste the contents of [`dokploy-compose.yml`](../../dokploy-compose.yml):

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/gitnasr/instagram-saved-posts:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/instagram
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      # Optional: Cloudinary credentials
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
    depends_on:
      mongo:
        condition: service_healthy

  mongo:
    image: mongo:7.0
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD-SHELL", "mongosh --eval 'db.adminCommand(\"ping\")' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  mongo_data:
```

### Step 3: Configure Domain & SSL
1. In Dokploy, open the **Domains** tab for the `app` service.
2. Add your custom domain (e.g. `instagram.yourdomain.com`).
3. Select Port `3000`.
4. Enable **HTTPS (Let's Encrypt)**.

### Step 4: Deploy
Click **Deploy** at the top right. Dokploy will pull the container images, verify MongoDB health, and start the application automatically!

---

## 🔒 Optional: Dokploy Environment Variables

If you wish to configure permanent Cloudinary media sync, go to the **Environment** tab in Dokploy and add:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
