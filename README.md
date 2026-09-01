<div align="center">

# 📸 Instagram Saved Posts Tracker

**A modern, self-hosted web app to archive, monitor, and explore your Instagram saved posts.**

[![GitHub Release](https://img.shields.io/github/v/release/gitnasr/Instagram-Saved-Posts?style=flat-square&color=blue)](https://github.com/gitnasr/Instagram-Saved-Posts/releases)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue?style=flat-square&logo=docker)](https://github.com/gitnasr/Instagram-Saved-Posts/pkgs/container/instagram-saved-posts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

[⚡ Quick Start](#-quick-start-1-command) • [🚀 Deploy on PaaS](#-1-click-paas-deployment) • [✨ Key Features](#-key-features) • [📖 Documentation](#-documentation--wiki) • [🛠️ Configuration](#%EF%B8%8F-configuration)

</div>

---

## 🌟 Overview

Instagram doesn't provide a native search or long-term archive for your saved posts. When creators delete their accounts, change handles, or make posts private, you lose access to bookmarked content. 

**Instagram Saved Posts Tracker** solves this by giving you full ownership over your bookmarks:
- 🔄 **Continuous Sync & Archival**: Scrapes and stores saved posts, carousel media, captions, and account metadata.
- 👥 **Multi-Profile Switching**: Netflix-style profile selector supporting multiple Instagram accounts simultaneously.
- 🕒 **Account Timeline & History**: Detects when accounts change usernames, lose verification, get deleted/banned, or go private.
- 🚀 **1-Command Zero-Config Deploy**: Start with a single terminal command or deploy directly to **Dokploy** / **Coolify**.

---

## ⚡ Quick Start (1 Command)

No clone, build, or manual `.env` configuration needed. Run the one-liner for your operating system:

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/install.sh | bash
```

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/install.ps1 | iex
```

### Docker Compose
Create a `docker-compose.yml` file and launch:
```yaml
services:
  app:
    image: ghcr.io/gitnasr/instagram-saved-posts:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/instagram?replicaSet=rs0&directConnection=true
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

```bash
docker compose up -d
```

🎉 Open **`http://localhost:3000`** in your browser and complete the 60-second onboarding wizard!

---

## 🚀 1-Click PaaS Deployment

Deploy easily to your self-hosted cloud platform of choice:

### Dokploy
1. In Dokploy, click **Create Project** -> **Compose**.
2. Copy and paste the contents of [`dokploy-compose.yml`](dokploy-compose.yml).
3. Set your custom domain and click **Deploy**.
4. Read the [Dokploy Deployment Guide](docs/deployment/dokploy.md) for full instructions.

### Coolify
1. In Coolify, create a **New Resource** -> **Docker Compose**.
2. Paste the contents of [`coolify-compose.yml`](coolify-compose.yml).
3. Configure your domain and click **Deploy**.
4. Read the [Coolify Deployment Guide](docs/deployment/coolify.md) for detailed configuration.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🧙‍♂️ **Interactive Onboarding** | Built-in setup wizard with real-time Instagram cookie testing and avatar preview. |
| 👥 **Multi-Profile Support** | Manage multiple Instagram accounts with separate sessions and isolated bookmarks. |
| 📈 **Account Timelines** | Automatically records username changes, bio updates, verification changes, and lost accounts. |
| 🛡️ **Resumable Scraper** | Automatic rate-limit detection, exponential backoff, and checkpointed resume support. |
| ☁️ **Permanent Media CDN** | Optional Cloudinary sync to ensure media URLs never break when Instagram CDN links expire. |
| 🔐 **Reverse Proxy & SSO** | Native support for Authentik / Authelia headers with read-only viewer mode. |
| 🌙 **Dark & Light Mode** | Modern, responsive UI built with Tailwind CSS v4 and Radix UI. |

---

## 📖 Documentation & Wiki

Detailed guides are available in the [`/docs`](docs/) directory:

- 🔑 [How to Get Your Instagram Cookie](docs/getting-started/how-to-get-instagram-cookie.md)
- 🐳 [Docker Compose Deployment Guide](docs/deployment/docker-compose.md)
- 🟣 [Dokploy Self-Hosting Guide](docs/deployment/dokploy.md)
- 🔷 [Coolify Self-Hosting Guide](docs/deployment/coolify.md)
- 🔒 [Reverse Proxy & Authentik SSO Guide](docs/deployment/reverse-proxy-and-sso.md)
- ☁️ [Cloudinary Permanent CDN Setup](docs/features/cloudinary-cdn.md)
- 💾 [Backup & Database Migration](docs/operations/backup-and-restore.md)
- ❓ [Troubleshooting & FAQ](docs/operations/troubleshooting-faq.md)

---

## 🛠️ Configuration

When running via Docker Compose, **zero environment variables are required**. Optional settings can be configured via `.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port exposed on host |
| `DATABASE_URL` | `mongodb://mongo:27017/instagram?replicaSet=rs0&directConnection=true` | MongoDB connection string (replica set enabled) |
| `CLOUDINARY_CLOUD_NAME` | `""` | Optional Cloudinary cloud name for permanent media |
| `CLOUDINARY_API_KEY` | `""` | Optional Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `""` | Optional Cloudinary API secret |
| `LOG_LEVEL` | `info` | Logging verbosity (`info`, `debug`, `warn`, `error`) |

---

## 🧑‍💻 Local Development

```bash
# 1. Clone repository
git clone https://github.com/gitnasr/Instagram-Saved-Posts.git
cd Instagram-Saved-Posts

# 2. Install dependencies
npm install

# 3. Start local MongoDB with replica set (required for Prisma transactions)
docker run -d -p 27017:27017 --name ig_mongo mongo:7.0 --replSet rs0
docker exec ig_mongo mongosh --eval "rs.initiate()"

# 4. Generate Prisma client & start dev server
export DATABASE_URL="mongodb://localhost:27017/instagram?replicaSet=rs0&directConnection=true"
npx prisma generate
npm run dev
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Check out [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
