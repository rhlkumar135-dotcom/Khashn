# 🚀 Khashn — Deployment Guide

## Prerequisites
- GitHub account ✅ (repo created: `rhlkumar135-dotcom/Khashn`)
- Railway account (free tier works)
- GoDaddy domain: `sqftlab.com`

---

## Part 1: Deploy to Railway

### Step 1: Connect GitHub to Railway
1. Go to 👉 **https://railway.app**
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub Repo"**
5. Authorize Railway to access your GitHub
6. Select **`rhlkumar135-dotcom/Khashn`**
7. Click **"Deploy"** — first build takes 2-3 minutes

### Step 2: Add PostgreSQL Database
1. In the Railway project dashboard, click **"+ New"** (top-left corner)
2. Select **"Database"** → **"PostgreSQL"**
3. Wait ~30 seconds for it to provision
4. You'll see a new **Postgres** service appear in your project

### Step 3: Connect Database to App
1. Click on your **Khashn** service (not the Postgres one)
2. Go to the **"Variables"** tab
3. Add this variable:
   - **Name:** `DATABASE_URL`
   - **Value:** `${{Postgres.DATABASE_URL}}`
4. Click **"Save"**
5. Railway will auto-redeploy with the database connected

### Step 4: Verify Deployment
1. Once deployed (green checkmark), click on the Khashn service
2. Under **"Settings"** → **"Networking"** → click **"Generate Domain"**
3. This gives you a temporary URL like `khashn-xxx.up.railway.app`
4. Open it and verify the app loads

---

## Part 2: Connect Custom Domain (sqftlab.com)

### Step 5: Add Custom Domain in Railway
1. In your Khashn service, go to **"Settings"** tab
2. Under **"Networking"**, click **"Custom Domain"**
3. Enter: `sqftlab.com`
4. Railway will show you DNS records to configure (copy these!)

### Step 6: Configure GoDaddy DNS
1. Go to 👉 **https://dcc.godaddy.com**
2. Find **sqftlab.com** → click **"DNS / Manage DNS"**
3. **Delete** any existing A or CNAME records for `@` and `www`
4. **Add** the records Railway provided:
   - **Type:** CNAME | **Name:** `@` | **Value:** `khashn-xxx.up.railway.app` | **TTL:** 600
   - **Type:** CNAME | **Name:** `www` | **Value:** `khashn-xxx.up.railway.app` | **TTL:** 600
5. Click **"Save"**
6. Wait 5-15 minutes for DNS propagation

### Step 7: Verify Custom Domain
1. Railway automatically verifies DNS and provisions SSL
2. Visit **https://sqftlab.com** — should load the Khashn platform
3. Visit **https://www.sqftlab.com** — should also work

---

## Part 3: Post-Deployment Checks

### Verify All Pages
- [ ] Landing page loads
- [ ] Heatmap shows 39 communities
- [ ] Community detail pages work
- [ ] Listings feed loads
- [ ] Yield calculator works
- [ ] Mortgage simulator works
- [ ] Portfolio tracker loads
- [ ] Watchlist loads
- [ ] Deal alerts load

### Verify API Endpoints
```bash
curl https://sqftlab.com/api/khashn/stats
curl https://sqftlab.com/api/khashn/communities
curl https://sqftlab.com/api/khashn/deals
curl https://sqftlab.com/api/khashn/portfolio
```

---

## Troubleshooting

### Build Fails
- Check Railway build logs in the "Deployments" tab
- Most common: Prisma generate fails — ensure `DATABASE_URL` is set

### Database Connection Error
- Ensure `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}`
- Redeploy the service after setting the variable

### Domain Not Working
- DNS propagation can take up to 48 hours (usually 15-30 minutes)
- Use https://dnschecker.org to verify propagation
- Ensure CNAME records point to the correct Railway URL

### App Loads but API Returns 404
- Railway may need a restart — go to Deployments → click "Redeploy"
- Check that the build completed successfully

---

## Environment Variables Reference

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | PostgreSQL connection string |
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `3000` | Server port (Railway sets this automatically) |

---

## GitHub Actions CI/CD

The repo includes a GitHub Actions workflow that:
- Runs on every push to `main`
- Deploys to Railway automatically
- Checks build health

To enable:
1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add secret: `RAILWAY_TOKEN` (get from Railway dashboard → Account → Tokens)
3. Add secret: `RAILWAY_SERVICE_ID` (get from Railway service settings)

---

## Rollback

If something breaks:
1. Go to Railway dashboard → Deployments
2. Find the last working deployment
3. Click "Rollback to this version"

Or use Git:
```bash
git revert HEAD
git push origin main
```
Railway auto-deploys on push.
