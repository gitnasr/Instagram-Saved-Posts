# ☁️ Cloudinary Permanent Media CDN

By default, Instagram media CDN URLs expire after a few days or weeks. To ensure your saved post images and profile pictures remain accessible forever, InstaSave Tracker includes first-class **Cloudinary integration**.

---

## 🎯 Why Use Cloudinary?

- **Permanent URLs**: Images are cloned and served directly from Cloudinary's global high-speed CDN.
- **Configurable in the UI**: Enter credentials directly in the **Onboarding Wizard** or **Settings** page without editing `.env` or recreating Docker containers.
- **Live Account Statistics**: Track your storage usage, asset count, bandwidth consumption, and plan limits in real time.
- **Automatic Background Sync**: Newly discovered media during scrapes is automatically uploaded to your Cloudinary storage.
- **Generous Free Tier**: Cloudinary provides 25 monthly credits (~25GB storage/bandwidth), sufficient for tens of thousands of saved posts.

---

## 🚀 Setup Instructions

1. **Sign Up for Free**:
   Create a free account at [cloudinary.com](https://cloudinary.com/users/register_free).

2. **Retrieve API Credentials**:
   From your [Cloudinary Console Dashboard](https://console.cloudinary.com/) (under **Settings** &rarr; **Access keys**), copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

3. **Configure in InstaSave Tracker**:
   - Go to **Settings** &rarr; **Cloudinary CDN** (or configure during initial onboarding).
   - Enter your credentials and click **Save & Test Connection**.
   - Your connection will be verified in real time, and your active quota stats will appear immediately!

4. **Sync Existing Media**:
   - In **Settings** &rarr; **Cloudinary CDN**, click **Sync All Media to Cloudinary** to upload all previously saved post thumbnails and carousel slides.
