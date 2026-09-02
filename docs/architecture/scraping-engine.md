---
title: "Resumable Scraping Engine"
description: "How the checkpoint pagination and error classification mechanisms prevent data loss."
---

# Resumable Scraping Engine

Instagram limits pagination and may trigger rate limits during long scraping sessions. Saved Posts Tracker uses a resilient checkpoint engine designed to handle these interruptions gracefully.

## Checkpoint System

During execution, the scraper saves a pagination cursor token (`checkpointMaxId`) after every fetched page:

- If the server restarts or network drops, the run state is preserved.
- When resuming, the scraper supplies `max_id: checkpointMaxId`, picking up immediately from the last unseen post.

## Error Taxonomy

When an error occurs, the scraper automatically classifies it into one of four error kinds:

| Error Kind | Description | Resumable? | Recommended Action |
| :--- | :--- | :--- | :--- |
| `rate_limited` | HTTP 429 received from Instagram | Yes | Wait 15-30 minutes and click **Resume Run**. |
| `transient` | Network timeout or temporary socket error | Yes | Click **Resume Run** immediately. |
| `auth` | Session cookie expired or checkpoint challenge | No | Update session cookie in Profile Settings. |
| `fatal` | Unrecoverable JSON parse or schema failure | No | Inspect error log in Dashboard. |

## Timeline Event Generation

As posts are fetched, the scraper compares new accounts against historical data to generate append-only timeline events:

- **`username_changed`**: Detects when an account PK has a different `username`.
- **`lost`**: Flags accounts where previous posts return 404/deleted.
- **`recovered`**: Flags previously lost accounts that have reappeared.
- **`privacy_private`**: Detects when a public creator switches to private.
