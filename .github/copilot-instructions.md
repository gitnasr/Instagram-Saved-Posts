# Copilot Workspace Instructions

## Overview
This project is a [Next.js](https://nextjs.org) application bootstrapped with `create-next-app`. It uses TypeScript, Drizzle ORM (with SQLite), Tailwind CSS, and a modular app directory structure. The backend logic is colocated with the frontend using Next.js API routes. 

## Build & Development
- **Development:** `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`)
- **Production build:** `npm run build`
- **Start production server:** `npm run start`
- **Lint:** `npm run lint`

## Key Conventions
- **App Directory:** Uses Next.js `app/` directory for routing and layouts.
- **API Routes:** All backend logic is in `src/app/api/`.
- **Database:** Drizzle ORM with SQLite, schema in `src/db/schema.ts`, config in `drizzle.config.ts`.
- **Components:** UI and feature components in `src/components/` (organized by domain).
- **Hooks:** Custom React hooks in `src/hooks/`.
- **Lib:** Utility and integration logic in `src/lib/`.
- **Types:** Shared types in `src/types/`.

## Project Structure
- `src/app/` — Next.js app directory (pages, layouts, API routes)
- `src/components/` — UI and feature components
- `src/db/` — Database schema and index
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utility and integration logic
- `src/types/` — Shared TypeScript types
- `data/` — SQLite database file(s)

## Common Pitfalls
- **Drizzle migrations:** Use Drizzle Kit CLI for schema changes. See `drizzle.config.ts`.
- **Database location:** SQLite DB is at `data/instagram.db` (ensure this path exists and is writable).
- **API route imports:** Use relative imports within `src/app/api/`.
- **Component imports:** Prefer absolute imports from `src/` root for maintainability.

## Useful References
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## Example Prompts
- "Add a new API route to fetch user analytics."
- "Refactor the account card component for better accessibility."
- "Add a new field to the database schema and update related API routes."
- "Write a custom React hook for fetching scrape history."

---
For advanced customization, consider creating agent hooks or additional instructions for specific subdirectories (e.g., `src/app/api/`, `src/components/`).
