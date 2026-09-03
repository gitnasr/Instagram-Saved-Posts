# 🔷 Coolify Self-Hosting Guide

[Coolify](https://coolify.io) is an all-in-one self-hostable PaaS with support for multiple servers, push-to-deploy, and automatic SSL certificates.

---

## 🚀 Deployment Steps in Coolify

### Step 1: Add New Resource
1. Open your **Coolify Dashboard**.
2. Navigate to your Project and click **+ New Resource**.
3. Select **Docker Compose**.

### Step 2: Paste Configuration
Paste the contents of [`coolify-compose.yml`](../coolify-compose.yml):

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/gitnasr/instagram-saved-posts:latest
    pull_policy: always
    restart: unless-stopped
    expose:
      - "5050"
    ports:
      - "${PORT:-5050}:3000"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/instagram?replicaSet=rs0&directConnection=true
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - QDRANT_URL=http://qdrant:6333
      - QDRANT_PORT=${QDRANT_PORT:-6335}
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
      - "${QDRANT_PORT:-6335}:6333"
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

### Step 3: Domain & Routing
1. In the Coolify resource view, enter your **FQDN / Domain** (e.g. `https://instagram.example.com`).
2. Set the destination port to `5050`.
3. (Optional) To expose the Qdrant Dashboard UI, create a subdomain pointing to port `6335` (`https://qdrant.example.com/dashboard`).

### Step 4: Deploy
Click **Deploy**. Coolify will orchestrate the containers, provision Traefik routing, issue Let's Encrypt certificates, and make your app accessible securely over HTTPS!
