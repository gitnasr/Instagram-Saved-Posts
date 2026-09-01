# 🐳 Docker Compose Deployment Guide

Deploying **Instagram Saved Posts Tracker** using Docker Compose is the most straightforward method for standalone servers, home labs, and VPS instances.

---

## 📋 Prerequisites

- Docker Engine (v24.0+ recommended)
- Docker Compose (v2.0+)

Verify your installation:
```bash
docker --version
docker compose version
```

---

## 🚀 Production Deployment

### 1. Create a Project Directory
```bash
mkdir -p ~/instagram-saved-posts && cd ~/instagram-saved-posts
```

### 2. Download `docker-compose.yml`
```bash
curl -fsSL https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/docker-compose.yml -o docker-compose.yml
```

### 3. Launch the Stack
```bash
docker compose up -d
```

### 4. Verify Running Containers
```bash
docker compose ps
```
You should see:
- `instagram_saved_posts_app`: Next.js frontend and scraper engine (port 3000).
- `instagram_saved_posts_mongo`: MongoDB database instance (healthy).

---

## ⚙️ Volume & Data Persistence

The MongoDB database stores all profiles, saved posts, carousel media, account history, and notes inside the Docker volume `instagram_saved_posts_mongo_data`.

To check volume details:
```bash
docker volume inspect instagram_saved_posts_mongo_data
```

---

## 🔄 Automatic Updates with Watchtower

To keep your InstaSave instance updated with the latest releases automatically, you can add Watchtower to your compose stack:

```yaml
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower_instasave
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 --cleanup instagram_saved_posts_app
```

---

## 🛑 Common Management Commands

```bash
# View live logs
docker compose logs -f app

# Restart application
docker compose restart app

# Stop the stack
docker compose down

# Update to latest version manually
docker compose pull && docker compose up -d
```
