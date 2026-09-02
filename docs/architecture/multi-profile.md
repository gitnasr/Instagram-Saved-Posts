---
title: "Multi-Profile Architecture"
description: "How to manage multiple Instagram accounts with isolated sessions and datasets."
---

# Multi-Profile Architecture

Saved Posts Tracker allows you to manage multiple Instagram accounts within a single installation. 

## The Netflix Profile Model

Just like switching accounts on Netflix, each profile operates with complete independence:

1. **Independent Session Cookies**: Each profile stores its own Instagram session cookie and user-agent string.
2. **Dedicated Avatars**: The app automatically fetches the profile's own Instagram avatar and generates a fallback colored tile.
3. **Data Scoping**: Every database model (`Account`, `Post`, `AccountEvent`, `ScrapeRun`) is indexed and filtered by `profileId`.
4. **Independent Scraping**: Scraping runs and checkpoints are isolated per profile.

## Creating a New Profile

1. In the top navigation bar, click on your current profile avatar.
2. Click **Add Profile** or navigate to `/profiles`.
3. Fill in:
   - **Profile Name**: A friendly identifier (e.g. `Personal Feed`, `Brand Inspo`).
   - **Session Cookie**: Extracted from `instagram.com` (`sessionid=...`).
   - **User-Agent**: Matching your browser's user-agent.
4. Save and switch to the new profile.
