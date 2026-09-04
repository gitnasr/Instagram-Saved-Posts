---
title: "Docker Compose Deployment"
description: "Deploy Instagram Saved Posts Tracker using Docker Compose on VPS, home labs, or bare metal."
---

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

> **Optional: AI Vector Search (Beta).** Semantic image and face search is not
> part of the default stack — it needs an extra Qdrant service and downloads
> ~600 MB of model weights on first index. To include it, layer the add-on file:
>
> ```bash
> docker compose -f docker-compose.yml -f docker-compose.search.yml up -d
> ```
>
> See [AI Vector Search](../features/ai-vector-search.md).

### 4. Verify Running Containers
```bash
docker compose ps
```
You should see:
- `instagram_saved_posts_app`: Next.js frontend and scraper engine (port 5050, accessible at `http://localhost:5050`).
- `instagram_saved_posts_mongo`: MongoDB database instance (healthy).

Plus, only if you launched with the search add-on:
- `instagram_saved_posts_qdrant`: Qdrant vector database (port 6335, Dashboard at `http://localhost:6335/dashboard`).

> [!NOTE]
> The compose configuration uses `pull_policy: always` for the `app` service. This ensures `docker compose up -d` always pulls the latest image update from GitHub Container Registry (GHCR) when tracking `:latest` or `:beta`.

---

## ⚙️ Volume & Data Persistence

The MongoDB database stores all profiles, saved posts, carousel media, account history, and notes inside the Docker volume `instagram_saved_posts_mongo_data`.

To check volume details:
```bash
docker volume inspect instagram_saved_posts_mongo_data
```

With the search add-on enabled there are two more: `instagram_saved_posts_qdrant_data`
holds the vectors and `instagram_saved_posts_model_cache` holds the downloaded model
weights. Both are derived data — deleting them costs a reindex, not your archive.

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
