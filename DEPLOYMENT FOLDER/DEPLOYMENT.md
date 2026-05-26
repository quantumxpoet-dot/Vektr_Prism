# Vektr Prism — Deployment Guide

## Overview

Vektr Prism is deployed to **Cloudflare Pages** as a static site. The entire app runs in the browser with no backend server.

---

## Step 1: Prepare Your GitHub Repository

### 1a. Create a new GitHub repo

1. Go to https://github.com/new
2. Name: `vektr-prism` (or your preferred name)
3. Description: `Browser-native agentic IDE`
4. Visibility: Public or Private (up to you)
5. **Do NOT** initialize with README (we have one)
6. Click **Create repository**

### 1b. Push your code to GitHub

```bash
# Clone the repo locally (replace USERNAME with your GitHub username)
git clone https://github.com/USERNAME/vektr-prism.git
cd vektr-prism

# Copy all project files into this directory
# (You should have: src/, package.json, vite.config.js, index.html, etc.)

# Initialize git and push
git add .
git commit -m "Initial commit: Vektr Prism static site"
git branch -M main
git remote add origin https://github.com/USERNAME/vektr-prism.git
git push -u origin main
```

### Verify on GitHub
- Visit https://github.com/USERNAME/vektr-prism
- You should see all your files (src/, package.json, etc.)

---

## Step 2: Connect to Cloudflare Pages

### 2a. Log into Cloudflare

1. Go to https://dash.cloudflare.com/
2. Sign in (or create a free account if needed)

### 2b. Create a Pages project

1. In the sidebar, click **Workers & Pages**
2. Click the **Create** button
3. Select **Pages → Connect to Git**
4. Select your GitHub account and authorize Cloudflare
5. Find and select the `vektr-prism` repository
6. Click **Begin setup**

### 2c. Configure the build

Fill in the build settings:

| Setting | Value |
|---------|-------|
| **Production branch** | `main` |
| **Framework preset** | `Vite` (or None) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (leave blank) |
| **Environment variables** | (leave empty) |

Click **Save and Deploy**

### Wait for deployment
Cloudflare will:
1. Clone your repo
2. Run `npm install`
3. Run `npm run build`
4. Deploy the `dist/` folder
5. Assign a temporary `*.pages.dev` URL

**Your site is live!** You'll get a URL like:
```
https://vektr-prism-xxxxx.pages.dev
```

---

## Step 3: Point Your Custom Domain

You have the domain **vektrprism.site**. Connect it to Cloudflare Pages.

### Option A: Transfer Nameservers (Recommended for new domains)

1. **In Cloudflare:**
   - Pages → Your project → Settings
   - Copy the nameservers Cloudflare provides

2. **At your domain registrar** (wherever you bought vektrprism.site):
   - Log in
   - Find **Nameservers** or **DNS** settings
   - Replace with Cloudflare's nameservers:
     ```
     ns1.cloudflare.com
     ns2.cloudflare.com
     ```
   - Save

3. **Wait 5-10 minutes** for propagation

4. **Back in Cloudflare:**
   - Pages → Your project → Custom domain
   - Enter: `vektrprism.site`
   - Click **Add custom domain**
   - Confirm it's pointing to your Pages project

### Option B: CNAME (If you want to keep current nameservers)

1. **In Cloudflare:**
   - Pages → Your project → Custom domain
   - Enter: `vektrprism.site`
   - Cloudflare gives you a CNAME target

2. **At your registrar:**
   - Add a CNAME record:
     ```
     Name: vektrprism
     Type: CNAME
     Value: <cloudflare-assigned-cname>
     ```

3. **Wait 5-10 minutes** for DNS propagation

---

## Step 4: Test Your Deployment

1. **Visit your live site:**
   ```
   https://vektrprism.site
   ```

2. **Test the onboarding:**
   - You should see the welcome screen
   - Click "Get Started"
   - Select AI chatbots
   - Open tabs (you'll need to be logged in)

3. **Test file access:**
   - Click "Open Folder"
   - Approve the permission prompt
   - Browse your local files
   - Open a file

4. **Test AI interaction:**
   - Type a prompt
   - Click "Ask AI"
   - Prompt should copy and open your AI chatbot
   - Paste, get response, paste back

---

## Step 5: Set Up Automatic Deployments

Every time you push to GitHub, Cloudflare will automatically redeploy.

### Push an update:
```bash
git add .
git commit -m "Update: add new feature"
git push origin main
```

### Check deployment status:
- Go to https://dash.cloudflare.com/
- Workers & Pages → vektr-prism → Deployments
- Watch the build run in real-time

---

## Troubleshooting

### Build fails with "npm: command not found"

**Solution:** Cloudflare sometimes doesn't install the right Node version.

1. Go to Settings → Build configuration
2. Set **Node.js version**: `20` or `22`
3. Redeploy

### Custom domain not working

**Solution:** DNS propagation takes time.

1. Check status: https://dnschecker.org/
2. Enter: `vektrprism.site`
3. Wait for all servers to show Cloudflare's IPs
4. If stuck after 24h, contact your registrar

### App loads but shows blank page

**Solution:** Check browser console.

1. Open DevTools (`F12`)
2. Go to **Console** tab
3. Look for red errors
4. Common issues:
   - `File System Access API not supported` → use Chrome/Edge
   - `Cannot read localStorage` → check for permission issues
   - `Module not found` → might be a build issue

### How to rebuild?

If you make changes locally:

```bash
# Update code
# Commit and push
git add .
git commit -m "Fix: xyz"
git push origin main

# Cloudflare will automatically rebuild and deploy
# Check status in https://dash.cloudflare.com/
```

---

## Monitoring & Maintenance

### Check deployment logs:
- https://dash.cloudflare.com/
- Workers & Pages → vektr-prism → Deployments
- Click any deployment to see build output

### Monitor traffic:
- Workers & Pages → vektr-prism → Analytics
- View page views, user locations, etc.

### Update dependencies:
```bash
npm update
npm audit fix
git add package.json package-lock.json
git commit -m "deps: update packages"
git push origin main
```

---

## Next Steps

1. **Celebrate** 🎉 Your app is live!
2. **Share the link** → https://vektrprism.site
3. **Get feedback** → Create issues on GitHub
4. **Add features** → Send PRs
5. **Monitor** → Check Cloudflare dashboard occasionally

---

## Questions?

- **Cloudflare Pages docs:** https://developers.cloudflare.com/pages/
- **Vite docs:** https://vitejs.dev/
- **File System Access API:** https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API

Good luck! 🚀
