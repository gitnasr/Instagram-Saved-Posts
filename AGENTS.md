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
- `docs/` here is the canonical copy of the landing docs: `scripts/sync-docs.mjs` and `.github/workflows/sync-docs.yml` replace the landing `content/docs/` wholesale. Edit docs here first and mirror the same change to the landing repo, or the next sync reverts it.

## Releases and versioning

Releases are automated; never hand-edit `package.json` version or create tags. The pipeline lives in `.github/scripts/` (`calculate-version.mjs`, `release-lib.mjs`, `generate-release-notes.mjs`) and runs from `.github/workflows/release.yml` on every push to master.

- Write commit subjects and PR titles as conventional commits (`feat:`, `fix:`, `perf:`, `docs:`, `chore:`; `!` or a `BREAKING CHANGE:` body line for breaking changes). The bump is derived from them plus the changed files: docs/CI-only changes publish no release, `feat` bumps minor, anything else functional bumps patch, major only on an explicit breaking marker. Rules are in CONTRIBUTING.md.
- Write the user-facing sentence for a release as a `Release-Note:` commit trailer (or in the PR template field) when the subject alone would not tell a user what changed. Add `Release-Note: skip` to keep a change out of the notes.
- Release notes follow the contract in the wiki (`../wiki/release-contract.md`): `## What to expect` verdict, grouped changes, `## Upgrade`, and a final `<!-- ig-release-meta:{...} -->` line. The in-app updater and the landing page parse this format, so changing it means changing `src/lib/updates.ts`, the landing `src/lib/github-release.ts`, and the tests together.
- Changing `prisma/schema.prisma`, `.env.example`, or a compose file makes the release read as "needs attention" automatically; say what users must do in the commit body or `Release-Note:`.
- Run `npm run test:release` after touching `.github/scripts/`, and `npm run test:updates` after touching `src/lib/updates.ts`.

## In-app update check

- `GET /api/updates` (`src/lib/updates.ts`, `src/components/settings/updates-settings.tsx`, sidebar `update-indicator.tsx`) reads GitHub Releases from the server and never updates the container itself.
- `DISABLE_UPDATE_CHECK=true` must keep working: no outbound call, no error UI. Keep it documented in `.env.example`, README, and `docs/operations/updating.md`.
- Any new outbound request from the server is a privacy claim: document it and make it opt-out.
