# ☁️ Cloudinary Permanent Media CDN

By default, Instagram media CDN URLs expire after a few days or weeks. To ensure your saved post images and profile pictures remain accessible forever, InstaSave Tracker includes optional **Cloudinary integration**.

---

## 🎯 Why Use Cloudinary?

- **Permanent URLs**: Images are cloned and served directly from Cloudinary's global CDN.
- **Automatic Uploads**: During regular scrapes, newly discovered media is automatically uploaded in the background.
- **Free Tier**: Cloudinary's generous free tier provides 25 monthly credits (~25,000 transformations or 25GB storage/bandwidth), sufficient for thousands of saved posts.

---

## 🚀 Setup Instructions

1. **Sign Up for Free**:
   Create a free account at [cloudinary.com](https://cloudinary.com/users/register_free).

2. **Retrieve API Credentials**:
   From your Cloudinary Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

3. **Configure in InstaSave Tracker**:
   Add the variables to your `.env` or Docker configuration:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Sync Existing Media**:
   - Navigate to **Settings** in the web dashboard.
   - Click **Sync All Media** to upload all previously scraped thumbnails and carousel slides.
