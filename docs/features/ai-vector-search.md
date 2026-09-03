---
title: "AI Vector Search"
description: "CLIP-based semantic image search, facial recognition, and Qdrant vector indexing."
---

# AI Vector Search

Saved Posts Tracker indexes every saved post's image (and detected faces) into
[Qdrant](https://qdrant.tech) for semantic search — no third-party AI APIs, self-hosted.

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
