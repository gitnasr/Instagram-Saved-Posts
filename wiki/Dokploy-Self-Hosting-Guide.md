# 🟣 Dokploy Self-Hosting Guide

[Dokploy](https://dokploy.com) is a modern, lightweight, open-source alternative to Heroku and Portainer with built-in Traefik reverse proxy and automatic SSL certificates.

---

## 🚀 1-Click Compose Deployment in Dokploy

### Step 1: Create a Project & Service
1. Log in to your **Dokploy Dashboard**.
2. Click **Create Project** (e.g. `InstaSave`).
3. Click **Add Service** &rarr; Select **Compose**.

### Step 2: Configure Compose Stack
In the Compose editor, paste the contents of `dokploy-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/gitnasr/instagram-saved-posts:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/instagram?replicaSet=rs0&directConnection=true
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    depends_on:
      mongo:
        condition: service_healthy

  mongo:
    image: mongo:7.0
    restart: unless-stopped
    command: ["--replSet", "rs0", "--bind_ip_all", "--port", "27017"]
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: >
        mongosh --port 27017 --eval "
          try {
            rs.status().ok
          } catch (e) {
            rs.initiate({
              _id: 'rs0',
              members: [{ _id: 0, host: 'mongo:27017' }]
            }).ok
          }
        " || exit 1
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 2s

volumes:
  mongo_data:
```

### Step 3: Configure Domain & SSL
1. Open the **Domains** tab for the `app` service in Dokploy.
2. Add your custom domain (e.g. `instagram.yourdomain.com`).
3. Set Port to `3000`.
4. Enable **HTTPS (Let's Encrypt)**.

### Step 4: Deploy
Click **Deploy**. Dokploy will pull the container images, verify MongoDB replica set health, and launch the application behind Traefik SSL!
