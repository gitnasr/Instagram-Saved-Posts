# 📚 InstaSave Tracker Wiki

Welcome to the official **Instagram Saved Posts Tracker** Wiki! Here you'll find comprehensive guides for setup, self-hosting deployments, cloud integrations, and operational best practices.

---

## ⚡ Quick Navigation

| Section | Description | Link |
| :--- | :--- | :--- |
| 🚀 **Getting Started** | Extract your session cookie & start tracking | [[How to Get Your Instagram Cookie\|How-to-Get-Your-Instagram-Cookie]] |
| ☁️ **Media & CDN** | Configure permanent Cloudinary media storage & view live stats | [[Cloudinary Permanent Media CDN\|Cloudinary-Permanent-Media-CDN]] |
| 🐳 **Docker Compose** | Production deployment with MongoDB ReplicaSet on bare-metal / VPS | [[Docker Compose Deployment\|Docker-Compose-Deployment]] |
| 🟣 **Dokploy Guide** | 1-Click stack deployment with automated SSL on Dokploy | [[Dokploy Self-Hosting Guide\|Dokploy-Self-Hosting-Guide]] |
| 🔷 **Coolify Guide** | Push-to-deploy multi-service setup on Coolify | [[Coolify Self-Hosting Guide\|Coolify-Self-Hosting-Guide]] |
| 🔒 **Reverse Proxy & SSO** | Protect your instance with Authentik ForwardAuth and viewer mode | [[Reverse Proxy and Authentik SSO\|Reverse-Proxy-and-Authentik-SSO]] |
| 💾 **Backup & Restore** | Database backup snapshots and server migration guide | [[Backup and Database Migration\|Backup-and-Database-Migration]] |
| ❓ **Troubleshooting & FAQ** | Fix P2031 replica sets, rate limits, and common issues | [[Troubleshooting and FAQ\|Troubleshooting-and-FAQ]] |

---

## 🌟 Key Architecture & Highlights

- **Multi-Profile Support**: Track multiple Instagram accounts independently in a single dashboard.
- **Onboarding-First UX**: Guided setup wizard validates database health, tests session cookies, and links Cloudinary.
- **Resumable Scraping Engine**: Automatically recovers from rate limits with exponential backoff and checkpoint resumption.
- **Permanent Media Archiving**: Direct integration with Cloudinary permanent CDN or standalone on-demand proxy caching.
- **Role-Based Access Control**: Built-in support for header-based ForwardAuth SSO (Authentik / Authelia) with viewer role restrictions.

---

## 🔗 Official Links

- **Repository**: [github.com/gitnasr/Instagram-Saved-Posts](https://github.com/gitnasr/Instagram-Saved-Posts)
- **Container Registry**: [ghcr.io/gitnasr/instagram-saved-posts](https://github.com/gitnasr/Instagram-Saved-Posts/pkgs/container/instagram-saved-posts)
- **Issues & Support**: [github.com/gitnasr/Instagram-Saved-Posts/issues](https://github.com/gitnasr/Instagram-Saved-Posts/issues)
- **Releases**: [github.com/gitnasr/Instagram-Saved-Posts/releases](https://github.com/gitnasr/Instagram-Saved-Posts/releases)
