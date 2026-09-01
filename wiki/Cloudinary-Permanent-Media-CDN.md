# ☁️ Cloudinary Permanent Media CDN

By default, Instagram media CDN URLs expire after a few days or weeks. To ensure your saved post images and profile pictures remain accessible forever, InstaSave Tracker includes first-class **Cloudinary integration**.

---

## 🎯 Why Use Cloudinary?

- **Permanent URLs**: Images are cloned and served directly from Cloudinary's global high-speed CDN.
- **Configurable directly from the UI**: No need to edit `.env` or recreate containers. Enter credentials directly in the **Onboarding Wizard** or **Settings** page.
- **Live Account Statistics**: Track your storage usage, asset count, bandwidth consumption, and plan limits in real time.
- **Automatic Background Sync**: Newly discovered media during scrapes is automatically uploaded to your Cloudinary storage.
- **Generous Free Tier**: Cloudinary provides 25 monthly credits (~25GB storage/bandwidth), sufficient for tens of thousands of saved posts.

---

## 🚀 Setup Instructions

### 1. Create a Free Cloudinary Account
Sign up for free at [cloudinary.com](https://cloudinary.com/users/register_free).

### 2. Retrieve Your API Credentials
From your [Cloudinary Console Dashboard](https://console.cloudinary.com/) (under **Settings** &rarr; **Access Keys**), copy:
- **Cloud Name**
- **API Key**
- **API Secret**

### 3. Enter Credentials in InstaSave Tracker
You can configure Cloudinary at any time in two places:
1. **During Onboarding**: Step 3 ("Cloudinary CDN") provides an interactive setup form with live verification.
2. **From Settings**: Go to **Settings** &rarr; **Cloudinary CDN** in the dashboard.

Click **Test & Save Connection**. InstaSave Tracker will validate the credentials directly against Cloudinary and display your live account quota!

---

## 📊 Live Usage Metrics

Once connected, the Settings page displays real-time statistics:
- **Storage Used / Limit**: Visual progress bar showing consumed storage against your quota.
- **Total Assets**: Count of media assets stored in Cloudinary.
- **Bandwidth Usage**: Monthly egress metrics.
- **Account Plan**: Active tier (e.g. Free, Plus, Advanced).

---

## 🔄 Syncing Existing Media

If you previously scraped posts before connecting Cloudinary:
1. Open **Settings** &rarr; **Cloudinary CDN**.
2. Click **Sync All Media to Cloudinary**.
3. Watch real-time progress for profile pictures, post thumbnails, and carousel slides!
