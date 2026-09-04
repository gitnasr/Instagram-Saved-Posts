---
title: "AI Vector Search (Beta)"
description: "Optional CLIP-based semantic image search, facial recognition, and Qdrant vector indexing. Off by default."
---

# AI Vector Search (Beta)

> **This feature is optional and switched off by default.**
> A standard install has no Qdrant service and no `QDRANT_URL`, the Search page
> shows a "not enabled" notice, and no model weights are ever downloaded.

Once enabled, Saved Posts Tracker indexes every saved post's image (and detected
faces) into [Qdrant](https://qdrant.tech) for semantic search — no third-party AI
APIs, self-hosted.

## Should you enable it?

It is worth it if you want to find posts by describing them, by uploading a
similar image, or by a person's face. It costs:

| | |
|---|---|
| **Extra service** | One Qdrant container plus a storage volume |
| **First-run download** | ~600 MB of CLIP and face-recognition model weights |
| **Memory** | Roughly 1–2 GB more while indexing |
| **Indexing time** | Every saved image is embedded once; large archives take a while |

If you only want the archive, the scraper and the dashboard, skip it. Everything
else works exactly the same without it.

## Enabling it

Search turns on when the app can see a `QDRANT_URL`. That is the only switch —
there is no separate feature flag.

### Docker Compose

A second compose file layers the Qdrant service and the env var onto the base
stack, so nothing needs editing:

```bash
docker compose -f docker-compose.yml -f docker-compose.search.yml up -d
```

To turn it back off, drop the second file and recreate:

```bash
docker compose -f docker-compose.yml up -d --remove-orphans
```

Your posts are untouched either way — vectors are derived data and are rebuilt
by reindexing.

### Dokploy / Coolify

Those templates are pasted as a single file, so add the pieces by hand. In the
`app` service `environment:` block:

```yaml
      - QDRANT_URL=http://qdrant:6333
```

Give the app a volume for the downloaded model weights, so they survive
restarts and image upgrades:

```yaml
    volumes:
      - model_cache:/app/node_modules/@huggingface/transformers/.cache
```

Add `qdrant` to the app's `depends_on:`:

```yaml
    depends_on:
      mongo:
        condition: service_healthy
      qdrant:
        condition: service_healthy
```

Then add the service and its volume:

```yaml
  qdrant:
    image: qdrant/qdrant:v1.13.4
    restart: unless-stopped
    ports:
      # Loopback only — see the security note below.
      - "127.0.0.1:6335:6333"
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
  qdrant_data:
  model_cache:
```

### After enabling

Open **Search** and press **Index Archive Now** (or `POST /api/search/reindex`).
The first run downloads the model weights, so it is slower than later ones.

> **Security:** Qdrant ships with **no authentication**. Publishing its port on
> `0.0.0.0` exposes every vector and payload — and lets anyone delete your
> collections. Keep the `127.0.0.1:` prefix, or set
> `QDRANT__SERVICE__API_KEY` and put it behind your reverse proxy. The app
> refuses to send `QDRANT_API_KEY` over plaintext HTTP to a non-local host.

## 1. Multimodal CLIP Embeddings

- **Model**: HuggingFace CLIP (`Xenova/clip-vit-base-patch16`), run server-side via `@huggingface/transformers` at full precision.
- **Dimensionality**: 512-d vectors, cosine distance.
- **Query mechanism**: post images and text queries are both projected into the same latent space, so a plain-language query retrieves visually matching posts (`/search`, "text prompt" tab). Captions and creator usernames are also matched lexically and merged in via Reciprocal Rank Fusion.
- **Storage**: `post_images` Qdrant collection, one point per post thumbnail / carousel slide.

### Example natural language queries:
- `"Moody neon cyberpunk street"`
- `"Warm wooden Scandinavian interior"`
- `"Minimalist typography posters with Swiss grid"`

## 2. Face Detection & Facial Descriptors

- **Model**: `@vladmandic/face-api` on `@tensorflow/tfjs`, run server-side during indexing.
- **Dimensionality**: 128-d facial descriptor vectors, Euclidean distance.
- **Storage**: `post_faces` Qdrant collection — lets you filter all posts containing a matching face.

## Reindexing Vectors

After changing the embedding model, or to index newly saved posts, run:

```bash
npm run reindex:vectors -- --all
```

or trigger it per-profile from the UI, or via `POST /api/search/reindex`.
