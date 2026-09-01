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

3. **Start Local MongoDB**:
   ```bash
   docker run -d -p 27017:27017 --name ig_mongo mongo:7.0
   ```

4. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   # DATABASE_URL="mongodb://localhost:27017/instagram"
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

## 📝 Pull Request Guidelines

- Create a feature branch (`git checkout -b feat/my-feature`).
- Keep PRs focused and well-scoped.
- Document any new environment variables in `.env.example` and `README.md`.
- Open a PR against `master` with a clear description of changes.
