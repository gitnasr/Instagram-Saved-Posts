# ❓ Troubleshooting & Frequently Asked Questions

Common questions, error resolutions, and operational tips.

---

## 🚫 Scraping & Cookie Errors

### 1. `login_required` or `checkpoint_required`
- **Cause**: Instagram expired the session or flagged the IP/session.
- **Solution**:
  1. Open [instagram.com](https://www.instagram.com) in your browser.
  2. If a challenge/captcha appears, solve it.
  3. Extract a fresh cookie (see [[How to Get Your Instagram Cookie|How-to-Get-Your-Instagram-Cookie]]).
  4. Paste the new cookie in **Settings** or the **Profile Picker**.

### 2. `rate_limited` or "Please wait a few minutes"
- **Cause**: Scraping too many pages rapidly from a datacenter IP.
- **Solution**:
  - The built-in scraper has automatic exponential backoff with jitter and pauses before retrying.
  - If a scrape run halts due to rate limits, it is marked as **Resumable**. You can click **Resume Scrape** anytime from the Scrape page to continue from the exact page where it stopped without duplicating posts!

---

## 🐳 Docker & Database Issues

### 1. `Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set (P2031)`
- **Cause**: Prisma uses MongoDB transactions for multi-document operations and profile initialization, requiring a replica set (`rs0`).
- **Fix**: Ensure your MongoDB container runs with `--replSet rs0` and has been initiated via `rs.initiate()`. The included `docker-compose.yml`, `dokploy-compose.yml`, and `coolify-compose.yml` templates automatically configure and initialize this on first startup. If running MongoDB manually, execute:
  ```bash
  docker exec <mongo_container_name> mongosh --eval "rs.initiate()"
  ```
  And ensure your connection string includes `?replicaSet=rs0&directConnection=true`.

### 2. Missing Images / Broken Post Thumbnails
- **Explanation**: Instagram URLs include temporary CDN tokens that expire after several days.
- **Fix**: Connect a free Cloudinary account in **Settings** &rarr; **Cloudinary CDN** (or during initial Onboarding) and run **Sync All Media** to permanently mirror all media assets to Cloudinary.

---

## ❓ Frequently Asked Questions

**Q: Can I run multiple Instagram accounts?**  
A: Yes! Click on the profile switcher in the top navigation or sidebar to create additional profiles. Each profile maintains its own session cookie, bookmarks, timeline, and scrape runs independently.

**Q: Will scraping get my Instagram account banned?**  
A: The scraper operates in read-only mode, only requesting the `/feed/saved/` endpoint at human-like intervals. However, using a secondary burner account to save posts is always good practice.

**Q: Can I export my saved accounts to CSV?**  
A: Yes! On the Accounts page, click **Export CSV** to download a complete spreadsheet of all discovered accounts, follower status, verification, and saved post counts.
