# 🔷 Coolify Self-Hosting Guide

[Coolify](https://coolify.io) is an all-in-one self-hostable PaaS with support for multiple servers, push-to-deploy, and automatic SSL certificates.

---

## 🚀 Deployment Steps in Coolify

### Step 1: Add New Resource
1. Open your **Coolify Dashboard**.
2. Navigate to your Project and click **+ New Resource**.
3. Select **Docker Compose**.

### Step 2: Paste Configuration
Paste the contents of [`coolify-compose.yml`](../../coolify-compose.yml):

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/gitnasr/instagram-saved-posts:latest
    restart: unless-stopped
    expose:
      - "3000"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/instagram
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME:-}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY:-}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET:-}
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

### Step 3: Domain & Routing
1. In the Coolify resource view, configure your **FQDN / Domain** (e.g. `https://instagram.example.com`).
2. Set the destination port to `3000`.

### Step 4: Deploy
Click **Deploy**. Coolify will orchestrate the containers, provision Traefik routing, issue Let's Encrypt certificates, and make your app accessible securely over HTTPS!
