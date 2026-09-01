# 🔑 How to Get Your Instagram Cookie

This guide explains how to extract your Instagram session cookie to authenticate the scraper.

---

## 📌 Important Security Notes

> [!IMPORTANT]
> - Your cookie acts like a digital password for your Instagram session. **Never share it publicly.**
> - Do **NOT** log out of Instagram in the browser where you extracted the cookie, as logging out immediately revokes the session ID. Simply close the tab instead.
> - Using a secondary burner Instagram account or exporting from a dedicated browser profile is recommended for extra isolation.

---

## 🌐 Method 1: Using Browser DevTools (Recommended)

Works on **Google Chrome**, **Brave**, **Microsoft Edge**, and **Firefox**.

### Step-by-Step Walkthrough

1. **Log in to Instagram**:
   Open [https://www.instagram.com](https://www.instagram.com) on your desktop browser and ensure you are logged in.

2. **Open Developer Tools**:
   Press `F12` (or right-click anywhere on the page and select **Inspect** / `Ctrl+Shift+I` on Windows, `Cmd+Option+I` on Mac).

3. **Navigate to the Network Tab**:
   - Click the **Network** tab at the top of the Developer Tools panel.
   - In the filter box, type `graphql` or `instagram.com`.

4. **Trigger a Request**:
   - Refresh the page (`F5` or `Cmd+R`) or click on your profile/saved tab.
   - You will see multiple network requests populate in the list.

5. **Copy the Cookie**:
   - Click on any request made to `instagram.com` (e.g. `graphql/query` or `feed/saved/`).
   - In the right-hand panel, select the **Headers** tab.
   - Scroll down to the **Request Headers** section.
   - Locate `cookie:` or `Cookie:`.
   - Right-click the value and select **Copy value** (or select all text and copy).

```
┌────────────────────────────────────────────────────────────────────────┐
│ Request Headers                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ accept: */*                                                            │
│ cookie: csrftoken=...; ds_user_id=123456789; sessionid=123456%3A...;  │
│ user-agent: Mozilla/5.0 ...                                            │
└────────────────────────────────────────────────────────────────────────┘
```

6. **Paste into InstaSave Tracker**:
   Paste the full cookie string into the **Onboarding Wizard** or **Settings** page and click **Test & Verify Cookie**.

---

## 🧩 Method 2: Using a Cookie Extension (Alternative)

If you prefer using an extension:

1. Install a reputable cookie manager like [Cookie-Editor](https://cookie-editor.cgagnier.ca/) (available for Chrome and Firefox).
2. Navigate to [instagram.com](https://www.instagram.com).
3. Click the Cookie-Editor icon in your browser toolbar.
4. Click **Export** -> **Export as Header String**.
5. Paste the exported string into InstaSave Tracker.

---

## 🔍 Required Cookie Tokens

For successful scraping, the cookie string must contain at least:
- `sessionid`: Your active Instagram session token.
- `ds_user_id`: Your Instagram numeric user ID.
- `csrftoken`: The CSRF verification token.

If any of these are missing, Instagram will reject the request with `login_required`.
