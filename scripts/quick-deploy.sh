#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  sqftLab — One-Command Railway Deploy
#  Run this on your LOCAL machine (not in Shogo)
# ═══════════════════════════════════════════════════════════
set -euo pipefail

echo ""
echo "  ⚡ sqftLab — Automated Railway Deploy"
echo "  ═══════════════════════════════════════"
echo ""

# Step 1: Install Railway CLI
if ! command -v railway &>/dev/null; then
  echo "📦 Installing Railway CLI..."
  npm install -g @railway/cli
fi

# Step 2: Login (opens browser)
echo "🔐 Opening Railway login in browser..."
railway login

# Step 3: Create project (or link existing)
echo ""
echo "📁 Select your project (the one with Postgres):"
railway link

# Step 4: Connect database
echo "🗄️ Connecting PostgreSQL..."
railway variables set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
railway variables set NODE_ENV=production

# Step 5: Deploy
echo "🚀 Deploying sqftLab..."
railway up

# Step 6: Add custom domain
echo ""
echo "🌐 Adding custom domain..."
echo "   (Do this in Railway dashboard: Settings → Networking → Custom Domain → sqftlab.com)"
echo ""

# Step 7: Verify
echo "⏳ Waiting 30 seconds for deployment..."
sleep 30
railway open

echo ""
echo "✅ Done! sqftLab is live!"
echo "   Dashboard: https://railway.app/dashboard"
echo ""
