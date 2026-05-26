# Vektr Prism — Ship Checklist

## Before You Push to GitHub

- [ ] Test locally: `npm run dev` works
- [ ] Build works: `npm run build` creates `dist/` folder
- [ ] Preview works: `npm run preview` opens the app
- [ ] Onboarding appears on first visit
- [ ] File browser works (click "Open Folder")
- [ ] Chat panel works (select a provider, type a message)
- [ ] Provider list includes ChatGPT, Claude, Gemini, etc.

## Repository Setup

- [ ] Create GitHub repo: https://github.com/new
  - Name: `vektr-prism`
  - Public (for visibility)
  - No initial README (you have one)
  
- [ ] Clone locally and push:
  ```bash
  git clone https://github.com/USERNAME/vektr-prism.git
  cd vektr-prism
  # Copy all files here
  git add .
  git commit -m "Initial commit: Vektr Prism"
  git push -u origin main
  ```

- [ ] Verify on GitHub: https://github.com/USERNAME/vektr-prism
  - See all your files (`src/`, `package.json`, etc.)?

## Cloudflare Pages Deployment

- [ ] Create Cloudflare account: https://dash.cloudflare.com/
- [ ] Connect GitHub:
  - Workers & Pages → Create → Connect to Git
  - Select `vektr-prism` repo
  
- [ ] Set build settings:
  - Build command: `npm run build`
  - Build output: `dist`
  - Click **Save and Deploy**
  
- [ ] Wait for build to complete (~2-3 min)
  - Check: Deployments tab
  - You'll get a `.pages.dev` URL

- [ ] Test the temporary URL:
  - Visit `https://vektr-prism-xxxxx.pages.dev`
  - Click "Open Folder" → works?
  - Try asking AI → works?

## Custom Domain: vektrprism.site

### Where is your domain registered?
- [ ] Namecheap?
- [ ] GoDaddy?
- [ ] Google Domains?
- [ ] Other?

### Connect it to Cloudflare

**Option 1: Nameserver transfer (easiest)**
- [ ] In Cloudflare: copy nameservers
- [ ] In your registrar: change nameservers
- [ ] Wait 5-10 minutes
- [ ] In Cloudflare Pages: add custom domain `vektrprism.site`
- [ ] Test: https://vektrprism.site loads?

**Option 2: CNAME (if you keep current nameservers)**
- [ ] In Cloudflare Pages: add custom domain → get CNAME
- [ ] In registrar: add CNAME record
- [ ] Wait 5-10 minutes
- [ ] Test: https://vektrprism.site loads?

## Final Tests

- [ ] Visit https://vektrprism.site
- [ ] Onboarding wizard appears
- [ ] "Open Folder" button works
- [ ] Chat panel loads
- [ ] Provider dropdown has options
- [ ] Asking AI opens chatbot tab
- [ ] "Ask AI" button copies to clipboard

## Go Live

- [ ] Share link: https://vektrprism.site
- [ ] Share GitHub repo: https://github.com/USERNAME/vektr-prism
- [ ] Post to Twitter/LinkedIn/HN
- [ ] Collect feedback

## Post-Launch

- [ ] Monitor Cloudflare dashboard daily for first week
- [ ] Check browser console for errors (F12)
- [ ] Fix any bugs reported
- [ ] Celebrate! 🎉

---

## If Something Goes Wrong

### Build failed?
- Check Cloudflare deployment logs
- Common cause: Node version mismatch
- Fix: Set Node.js to v22 in Cloudflare settings

### Site shows blank page?
- Check browser console (F12)
- Common issues:
  - File System Access API not supported (use Chrome)
  - localStorage not available (permission issue)
  - CSS not loading (check dist/ folder)

### Domain not resolving?
- Use https://dnschecker.org/ to check DNS
- Wait 24 hours for full propagation
- If stuck, contact domain registrar support

### Everything stuck?
- Read DEPLOYMENT.md (more detail there)
- Check Cloudflare Pages docs: https://developers.cloudflare.com/pages/

---

## Time Estimate

- Repository setup: 5 min
- Cloudflare Pages: 5 min (+ 3 min build)
- Custom domain: 5 min (+ 5-10 min DNS)
- **Total: ~25 minutes**

---

**You're ready. Let's go! 🚀**
