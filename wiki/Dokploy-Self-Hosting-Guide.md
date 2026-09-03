# 🟣 Dokploy Self-Hosting Guide

[Dokploy](https://dokploy.com) is an open-source alternative to Heroku and Coolify with automatic Traefik SSL and multi-service compose orchestration.

---

## 🚀 1-Click Compose Deployment in Dokploy

### Step 1: Create a New Project & Service
1. Log in to your **Dokploy Dashboard**.
2. Click **Create Project** (e.g. `InstaSave`).
3. Click **Add Service** -> Select **Compose**.

### Step 2: Configure Compose Stack
In the Compose editor, paste the contents of `dokploy-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/gitnasr/instagram-saved-posts:latest
    pull_policy: always
    restart: unless-stopped
    ports:
      - "5050:3000"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/instagram?replicaSet=rs0&directConnection=true
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - QDRANT_URL=http://qdrant:6333
      - QDRANT_PORT=6335
    depends_on:
      mongo:
        condition: service_healthy
      qdrant:
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

  qdrant:
    image: qdrant/qdrant:v1.13.4
    restart: unless-stopped
    ports:
      - "6335:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
    healthcheck:
      test: ["CMD-SHELL", "bash -c ': >/dev/tcp/127.0.0.1/6333' || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 2s

volumes:
  mongo_data:
  qdrant_data:
```

### Step 3: Configure Domain & SSL
1. Open the **Domains** tab for the `app` service in Dokploy.
2. Add your custom domain (e.g. `instagram.yourdomain.com`).
3. Set Port to `5050`.
4. Enable **HTTPS (Let's Encrypt)**.
5. (Optional) Create a domain mapping for the Qdrant Dashboard UI on port `6335` (e.g. `qdrant.yourdomain.com/dashboard`).

### Step 4: Deploy
Click **Deploy**. Dokploy will pull the container images, verify MongoDB and Qdrant health, and launch the application behind Traefik SSL!
