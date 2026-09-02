---
title: "System Architecture"
description: "In-depth breakdown of the data models, background pipelines, and storage engines."
---

# System Architecture

Saved Posts Tracker is built using modern Next.js App Router server components, Prisma ORM, and background workers.

## Data Layer & Models

The system models relationships using Prisma schemas optimized for multi-profile isolation:

- **`Profile`**: Root tenant owning session credentials, user-agents, and scoped collections.
- **`Account`**: Unique Instagram creators whose posts you have saved. Includes handle history, follower counts, verification state, and lost/recovered markers.
- **`AccountEvent`**: Append-only audit log tracking changes (`username_changed`, `privacy_private`, `lost`, `recovered`).
- **`Post`**: Core bookmark record with taken timestamp, caption, like/comment counts, and Cloudinary thumbnail URLs.
- **`CarouselMedia`**: Ordered media items for multi-slide posts.
- **`ScrapeRun`**: Execution audit tracking status, pages scraped, error kinds, and checkpoint markers.

## Architecture Flow Diagram

```
+------------------+       +---------------------+
|  Instagram Web   | ----> | Resumable Scraper   |
|   Private API    |       | (Checkpoint Engine) |
+------------------+       +---------------------+
                                      |
                     +----------------+----------------+
                     |                                 |
                     v                                 v
          +--------------------+             +-------------------+
          |  MongoDB / SQLite  |             |  Cloudinary CDN   |
          |  (Prisma Schema)   |             |  (Media Mirror)   |
          +--------------------+             +-------------------+
                     |                                 |
                     +----------------+----------------+
                                      |
                                      v
                             +-------------------+
                             |   Qdrant Engine   |
                             |  (CLIP + FaceAPI) |
                             +-------------------+
```

## Fault Tolerance & Isolation

- **Scoped Multi-Tenancy**: Every database query is filtered by `profileId`, guaranteeing no cross-contamination between different Instagram accounts.
- **Idempotent Ingestion**: Posts and carousel media use composite unique keys `[profileId, pk]` to ensure scraping can safely be resumed at any time without data corruption.
