# 🤝 Contributing to Instagram Saved Posts Tracker

Thank you for your interest in contributing! We welcome bug reports, feature requests, documentation improvements, and pull requests.

---

## 🛠️ Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/your-username/Instagram-Saved-Posts.git
   cd Instagram-Saved-Posts
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Local MongoDB with Replica Set (required for Prisma transactions)**:
   ```bash
   docker run -d -p 27017:27017 --name ig_mongo mongo:7.0 --replSet rs0
   docker exec ig_mongo mongosh --eval "rs.initiate()"
   ```

4. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   # DATABASE_URL="mongodb://localhost:27017/instagram?replicaSet=rs0&directConnection=true"
   ```

5. **Generate Prisma Client & Run Dev Server**:
   ```bash
   npx prisma generate
   npm run dev
   ```

---

## 🧪 Testing & Code Quality

Before opening a pull request, please verify:
```bash
npm run lint          # Run ESLint checks
npx tsc --noEmit      # Run TypeScript typechecks
npm run build         # Test Next.js production build
```

---

## 🏷️ Commit messages & releases

Every push to `master` is released automatically. `.github/scripts/calculate-version.mjs` picks the version and `.github/scripts/generate-release-notes.mjs` writes the GitHub Release notes (what users should expect, grouped changes, upgrade commands). Both read your commit messages and changed files, so you steer the result like this (rules live in `.github/scripts/release-lib.mjs`, tests in `release.test.mjs`).

**Is there a release at all?** Only if a user-facing file changed. If everything since the last tag is Markdown (`*.md`), `wiki/`, `.github/`, `.agents/` or similar meta files, no release is made. Public user documentation is maintained in the [documentation site](https://insta-saved.gitnasr.com/docs). Changes under `src/`, `prisma/`, `Dockerfile`, compose files, `package*.json`, `scripts/` etc. always release at least a patch.

**Which bump?** The highest signal among the releasable commits wins:

| Bump | Signal |
| --- | --- |
| major | `!` after the type (`feat!: ...`), `BREAKING CHANGE` in the subject, or a `BREAKING CHANGE:` line in the commit body / PR description. Only an explicit marker bumps major: a `prisma/schema.prisma` change alone does not. |
| minor | `feat:` / `feat(scope):`, or a plain subject starting with Add, Introduce, Implement, Support, Enable, Allow or Create. |
| patch | Everything else that changes functionality (`fix:`, `perf:`, `refactor:`, `Fix ...`, `Remove ...`, dependency bumps, ...). |

Conventional prefixes (`feat`, `fix`, `perf`, `docs`, `refactor`, `chore`, `ci`, `build`, `test`, `style`) are optional; plain imperative subjects such as `Fix crash on empty feed` work too. A trailing `(#123)` is stripped. `chore(release)` commits and merge commits are ignored. You can still force a bump from the **Automated Release** workflow (`bump_type` / `custom_version`).

**Release notes.** Subjects are turned into plain-language bullets: `Highlights` (features and user-visible UI changes), `Fixes`, `Performance`, `Under the hood`, `Docs`; dependency bumps collapse into one line. To say it better than the subject, add a trailer to the commit body (or the PR description when squash-merging):

```
Release-Note: Scrapes no longer stall on private accounts
```

Use `Release-Note: skip` to hide a commit from the notes. The notes also tell users up front whether the update is routine, needs attention (`prisma/schema.prisma`, `.env.example` or a compose file changed) or is breaking (explicit marker).

Check your changes locally with `node --test ".github/scripts/*.test.mjs"` and preview notes with `node .github/scripts/generate-release-notes.mjs <prevTag> HEAD --out=notes.md`.

---

## 📝 Pull Request Guidelines

- Create a feature branch (`git checkout -b feat/my-feature`).
- Keep PRs focused and well-scoped.
- Document any new environment variables in `.env.example` and `README.md`.
- Open a PR against `master` with a clear description of changes.
