---
title: "Updating & Releases"
description: "How releases are versioned, what the 'What to expect' note means, how to update or pin a version on Docker Compose, Dokploy, and Coolify, and how to turn off the update check."
---

Saved Posts Tracker runs in a container and never updates itself. You decide when to move to a new version. This page covers how releases work, how to update, and how to stay on a specific version.

---

## How releases work

- Releases are published on [GitHub Releases](https://github.com/gitnasr/Instagram-Saved-Posts/releases) with tags like `v1.3.12`, following [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.
- Each release publishes a matching Docker image to GitHub Container Registry. `:latest` always points at the newest stable release.
- Beta builds (`-beta.N`) are Docker-only previews. They are not GitHub Releases, and the update check ignores them.

### The "What to expect" note

Every release opens with a **What to expect** section: a one-line verdict about your upgrade, then a few bullets on concrete impact. It reads like this:

> **What to expect:** Safe to update. Pull the new image and restart. No config or database changes.

The verdict falls into one of three levels:

| Level | Meaning | What to do |
|-------|---------|------------|
| Routine | No database, environment variable, or compose file changes. | Pull the new image and restart. |
| Needs attention | The release changes the database schema, `.env.example`, or a compose file. | [Back up first](./backup-and-restore.md), read the notes, then apply any listed config changes before restarting. |
| Breaking | The release includes a breaking change. | Back up, read the notes in full, and follow the upgrade steps in the release. |

Releases published before this format existed have no summary. The app shows them as "No summary" and links to the full notes.

---

## Updating

### Docker Compose

```bash
docker compose pull && docker compose up -d
```

The compose file uses `pull_policy: always` with the `:latest` tag, so `docker compose up -d` also fetches the newest image. Your data lives in the `instagram_saved_posts_mongo_data` volume and is untouched by an image update.

If you added [Watchtower](../deployment/docker-compose.md), it applies new `:latest` images on its own schedule. Skip it if you want to read the "What to expect" note before each update.

### Dokploy

Open your Compose service in the Dokploy dashboard and click **Deploy** (or **Redeploy**). The stack pulls the newest `:latest` image and restarts the app. If you pinned a version tag, change the tag in the Compose editor first.

### Coolify

Open the resource and click **Redeploy**. If you pinned a version tag, edit it in the Compose configuration first.

---

## Pinning a version

To stay on a known version, or to roll back, replace `latest` in the `app` service image with a release tag:

```yaml
services:
  app:
    image: ghcr.io/gitnasr/instagram-saved-posts:v1.3.12
```

Then apply it:

```bash
docker compose up -d
```

Available tags for each release:

| Tag | Moves? | Use it for |
|-----|--------|------------|
| `:latest` | Yes, every release | Always run the newest stable release. |
| `:vX.Y.Z` (and `:X.Y.Z`) | No | Pin an exact version or roll back. |
| `:X.Y` | Yes, within a minor line | Take patch fixes only. |

While pinned, the app still tells you when a newer release exists, but it never installs anything. To update, change the tag and redeploy.

> [!NOTE]
> Rolling back the image does not roll back your database. If a release changed the schema, restore a backup taken before the update. See [Backup & Restore](./backup-and-restore.md).

---

## In-app update indicator

When a newer stable release exists, a small **Update** link appears in the app sidebar. Its dot shows the level: green for routine, amber for needs attention, red for breaking. It opens **Settings**.

In **Settings → Updates** you can see:

- The version you are running.
- Whether a newer release is available and when it was published.
- The release's **What to expect** note and the level, plus flags if it changes the database, environment variables, or compose file.
- Every release you skipped, if you are several versions behind.
- A copy button for the update command, and a **Check for updates** button.

The app checks at most once an hour and caches the result. If your server cannot reach GitHub, the card says so and your install keeps working normally.

---

## Privacy and turning the check off

The update check is a request from **your own server** to the public GitHub Releases API (`api.github.com`). Your browser only talks to your own instance. No telemetry or account data is sent: GitHub sees an ordinary API request from your server's IP address with a user agent containing the app name and version.

To disable it, set this environment variable and restart:

```bash
DISABLE_UPDATE_CHECK=true
```

In Docker Compose, add it to the `app` service:

```yaml
    environment:
      - DISABLE_UPDATE_CHECK=true
```

On Dokploy or Coolify, add it in the service's **Environment** tab. With the check off, the app makes no request to GitHub, the sidebar indicator never appears, and the Updates card links to the releases page instead. Check [GitHub Releases](https://github.com/gitnasr/Instagram-Saved-Posts/releases) yourself when you want to update.
