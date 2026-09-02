---
title: "In-Browser & Qdrant AI Vector Search (Coming Soon)"
description: "Roadmap for in-browser Transformer.js, self-hosted Qdrant vector indexing, and facial recognition."
---

# In-Browser & Qdrant AI Vector Search

> **Status: Coming Soon / In-Browser Active Development**
>
> We are actively developing client-side in-browser inference using Transformer.js (WebGPU) and optional self-hosted Qdrant vector backend integration.

Saved Posts Tracker is designing privacy-first deep learning models for visual understanding and facial identification without requiring expensive third-party AI APIs.

## 1. Multimodal CLIP Embeddings (In-Browser & Qdrant)

- **Model**: HuggingFace CLIP (`Xenova/clip-vit-base-patch32`) executed locally in-browser via `@huggingface/transformers` or on backend.
- **Dimensionality**: 512 floating-point vectors.
- **Query Mechanism**: Both image pixels and text descriptions are projected into the same latent embedding space.
- **Vector Storage**: Client-side vector index with optional [Qdrant](https://qdrant.tech) backend for large-scale self-hosted instances.

### Example Natural Language Queries:
- `"Moody neon cyberpunk street"`
- `"Warm wooden Scandinavian interior"`
- `"Minimalist typography posters with Swiss grid"`

## 2. In-Browser Face Detection & Facial Descriptors

- **Model**: `@vladmandic/face-api` running on `@tensorflow/tfjs` in-browser backend.
- **Dimensionality**: 128-dimensional facial descriptor vectors.
- **Clustering**: Automatically detects faces in saved images, extracts biometric embeddings, and allows filtering all posts containing matching individuals with zero biometric data leakage.

## Reindexing Vectors CLI

When vector indexing is activated, you will be able to run:

```bash
npm run reindex:vectors
```
