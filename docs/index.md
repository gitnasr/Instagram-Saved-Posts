---
title: "Introduction"
description: "Overview of the Instagram Saved Posts Tracker, its features, and how it safeguards your visual bookmarks."
---

# Welcome to Saved Posts Tracker

**Saved Posts Tracker** is a production-grade, self-hosted web application designed to automatically synchronize, mirror, and intelligently index your saved Instagram bookmarks into a database and media storage that you control.

```
+--------------------------------------------------------------------+
|                      Saved Posts Tracker                           |
|                                                                    |
|  +----------------+   +-------------------+   +-----------------+  |
|  | Multi-Profile  |-->| Resumable Scraper |-->| Cloudinary Sync |  |
|  +----------------+   +-------------------+   +-----------------+  |
|                                                       |            |
|  +----------------+   +-------------------+           v            |
|  | Event Timeline |<--| Qdrant Vector AI  |<-- [ High-Res CDN ]    |
|  +----------------+   +-------------------+                        |
+--------------------------------------------------------------------+
```

## Why We Built This

Instagram saved collections suffer from several critical shortcomings:

1. **Expiring Media Signatures**: Direct Instagram CDN URLs expire after a short time.
2. **Account Deletions & Renames**: When creators change their handle or get banned, links break permanently.
3. **Zero Semantic Search**: Native Instagram offers no visual concept or facial recognition search.
4. **Single-Account Friction**: Switching between research and personal accounts requires continuous logout/login cycles.

Saved Posts Tracker addresses every one of these problems with a unified, self-hosted architecture.

## Key Capabilities

- **Netflix-Style Multi-Profile Architecture**: Connect multiple Instagram accounts with isolated cookies, custom user-agents, avatars, and separate datasets.
- **Resumable Checkpoint Scraper**: Uses `checkpointMaxId` to safely pause and resume scraping across rate limits and network interruptions without duplicates.
- **Append-Only Event Timelines**: Detects and logs username renames (`from @old to @new`), account deletions (`lost`), recoveries, and privacy flips.
- **Cloudinary CDN Mirroring**: Automatically syncs photos, multi-slide carousels, and video clips to permanent cloud storage.
- **In-Browser & Qdrant Vector AI (Coming Soon)**: 512-dimensional CLIP multimodal search and TensorFlow.js in-browser biometric face detection.

## Next Steps

- Check out the [Quickstart Guide](/docs/getting-started/quickstart) to deploy in 5 minutes.
- Learn about the [System Architecture](/docs/architecture/system-overview).
---

## 🗺️ Documentation Index

### 🚀 Getting Started
- [Quickstart Guide](getting-started/quickstart.md): Get up and running in under 5 minutes with automated scripts or manual setup.
- [How to Get Your Instagram Cookie](getting-started/how-to-get-instagram-cookie.md): Visual walkthrough to securely extract your session cookie from Chrome, Firefox, Safari, or extensions.

### 🏛️ System Architecture
- [System Architecture Overview](architecture/system-overview.md): Data models, Prisma schema, background pipelines, and storage engines.
- [Multi-Profile Isolation](architecture/multi-profile.md): Managing multiple accounts with isolated credentials and datasets.
- [Resumable Scraping Engine](architecture/scraping-engine.md): Checkpoint pagination, backoff retry logic, and error classification.

### ✨ Features & Integrations
- [Cloudinary Permanent CDN](features/cloudinary-cdn.md): Permanent media hosting to protect against expiring Instagram CDN links.
- [AI Vector Search & Face Recognition](features/ai-vector-search.md): Multimodal CLIP search and biometric face clustering.

### 🚢 Deployment Guides
- [Docker Compose](deployment/docker-compose.md): Standalone server, home lab, and VPS deployment.
- [Coolify Self-Hosting](deployment/coolify.md): 1-click Docker Compose apps on Coolify PaaS.
- [Dokploy Self-Hosting](deployment/dokploy.md): Multi-service stack with automated Traefik SSL on Dokploy.
- [Reverse Proxy & Authentik SSO](deployment/reverse-proxy-and-sso.md): Protecting your instance behind Cloudflare Tunnels, Nginx Proxy Manager, and Authentik SSO.

### 🛠️ Operations & Maintenance
- [Backup & Restore](operations/backup-and-restore.md): Automated MongoDB dump/restore procedures and volume management.
- [Troubleshooting & FAQ](operations/troubleshooting-faq.md): Solving Instagram rate limits, checkpoint challenges, and common Docker issues.
