# Agent Instructions

## Project repositories

- This repository, Instagram-Saved-Posts, is the source of truth for product behavior.
- Its public site and user-facing documentation live in the sibling repository ../instagram-saved-posts-landing.

## Required landing-page sync

Every change to this app requires a review of the landing-page repository before the task is handed back, even when the app change appears internal.

- For any change that affects user-visible features, setup, configuration, deployment, compatibility, security or privacy claims, limitations, or documented behavior, update the relevant landing page or documentation in the same task.
- If the app change has no user-facing or documentation impact, do not invent copy changes. State that the landing repository was reviewed and why no update was needed.
- Read and follow [the landing sync skill](.agents/skills/keep-landing-in-sync/SKILL.md).
- Keep the landing site's design and organization intact. Do not copy the app README wholesale.
- Local repository edits are in scope when needed for synchronization. Do not push, publish, deploy, or create external issues unless the user explicitly asks.
