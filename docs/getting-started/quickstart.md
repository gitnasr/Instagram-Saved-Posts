---
title: "Quickstart Guide"
description: "Get Saved Posts Tracker up and running on your system in under 5 minutes."
---

# Quickstart Guide

Get Saved Posts Tracker running on your system with our one-command installer script or manual clone.

## Option A: One-Command Automated Install (Recommended)

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/install.sh | bash
```

### Windows (PowerShell)
```bash
irm https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/install.ps1 | iex
```

---

## Option B: Manual Installation

### Prerequisites

- [Node.js 20+](https://nodejs.org/) or [Docker](https://docs.docker.com/get-docker/)
- A [Cloudinary](https://cloudinary.com) account for permanent CDN storage
- Your Instagram Session Cookie (extracted from your browser)

### Step 1: Clone the Repository

```bash
git clone https://github.com/gitnasr/Instagram-Saved-Posts.git
cd Instagram-Saved-Posts
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Database connection
DATABASE_URL="mongodb://localhost:27017/instagram"

# Cloudinary CDN Credentials
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### Step 3: Install & Start Development Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser (or [http://localhost:5050](http://localhost:5050) if running via Docker Compose).
