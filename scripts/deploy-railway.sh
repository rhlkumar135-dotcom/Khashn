#!/usr/bin/env bash
set -euo pipefail

echo "╔══════════════════════════════════════════════╗"
echo "║   sqftLab — Railway Automated Deployment     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Check prerequisites ──────────────────────────────────────
command -v railway >/dev/null 2>&1 || {
  echo "Installing Railway CLI..."
  npm install -g @railway/cli 2>/dev/null || curl -fsSL https://railway.com/install.sh | sh
}

command -v gh >/dev/null 2>&1 || {
  echo "❌ GitHub CLI (gh) not found. Install: brew install gh"
  exit 1
}

# ── Step 1: Authenticate Railway ────────────────────────────
echo "📋 Step 1: Authenticate with Railway"
echo "   A browser window will open. Log in and authorize."
echo "   Press Enter when ready..."
read -r
railway login

# ── Step 2: Link to project ─────────────────────────────────
echo ""
echo "📋 Step 2: Select your Railway project"
echo "   Choose the project that has your PostgreSQL database."
echo ""
railway link

# ── Step 3: Connect PostgreSQL variable ─────────────────────
echo ""
echo "📋 Step 3: Connecting PostgreSQL database..."
railway variables set DATABASE_URL=\${{Postgres.DATABASE_URL}} NODE_ENV=production
echo "   ✅ DATABASE_URL connected from PostgreSQL service"

# ── Step 4: Deploy ──────────────────────────────────────────
echo ""
echo "📋 Step 4: Deploying..."
railway up --service "$(railway status 2>/dev/null | head -1 | awk '{print $1}')" || railway up

echo ""
echo "   ⏳ Waiting for deployment..."
sleep 10

# ── Step 5: Get the URL ─────────────────────────────────────
echo ""
echo "📋 Step 5: Your deployment URL:"
railway open 2>/dev/null || echo "   Check: https://railway.app/dashboard"

# ── Step 6: Custom Domain ───────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Custom Domain Setup (sqftlab.com)           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "   Run this command to add your GoDaddy domain:"
echo ""
echo "   railway domain create sqftlab.com"
echo ""
echo "   Then go to GoDaddy DNS and add the CNAME record"
echo "   Railway shows you after running the command above."
echo ""
echo "══════════════════════════════════════════════"
echo "✅ Deployment complete!"
echo "   Railway Dashboard: https://railway.app/dashboard"
echo "══════════════════════════════════════════════"
