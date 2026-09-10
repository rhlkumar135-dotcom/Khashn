# Khashn — UAE Property Intelligence Platform

> Real-time price heatmaps, AI-powered yield forecasts, deal alerts, and portfolio tracking across every community in Dubai and Abu Dhabi.

## Features

- **Price Heatmap** — Interactive map of 39+ UAE communities colour-graded by AED/sqft
- **Community Detail Pages** — Price summaries, trend charts, yield panels, transaction feeds, live listings
- **Yield Calculator** — Gross/net yields, mortgage simulation, break-even analysis with INR equivalents
- **Mortgage Simulator** — EMI calculation, amortization schedules, bank rate comparison
- **Deal Alerts** — Below-market listing detection with push/email/WhatsApp notifications
- **Portfolio Tracker** — Property holdings, rental income, cash flow, diversification charts
- **Watchlist** — Track communities with price change alerts
- **Tiered Access** — Free / Pro (AED 49/mo) / Elite (AED 149/mo)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS + Recharts |
| Backend | Hono (Bun) + Prisma 7 + SQLite |
| Design | Gold-on-midnight brand system (Georgia + Inter) |
| Data | DLD transactions, Bayut/PropertyFinder/Dubizzle listings, OSM POI data |

## Getting Started

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run generate

# Seed the database
bun run scripts/seed-khashn.ts

# Start development
bun run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/khashn/communities` | GET | All communities with heatmap data |
| `/api/khashn/communities/:slug` | GET | Community detail with listings |
| `/api/khashn/communities/:slug/trend` | GET | Monthly price trend data |
| `/api/khashn/communities/:slug/transactions` | GET | Paginated transaction history |
| `/api/khashn/portfolio` | GET | User portfolio summary |
| `/api/khashn/watchlist` | GET | User watchlisted communities |
| `/api/khashn/deals` | GET | Below-market listings |
| `/api/khashn/yield/calculate` | POST | Yield calculation |
| `/api/khashn/mortgage/simulate` | POST | Mortgage EMI simulation |
| `/api/khashn/stats` | GET | Platform statistics |

## Deployment

### Railway + GoDaddy (Production)

#### Step 1: Deploy to Railway
1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"** → select `rhlkumar135-dotcom/Khashn`
3. Wait for initial build (first deploy takes ~2-3 minutes)

#### Step 2: Add PostgreSQL Database
1. In the Railway project dashboard, click **"+ New"** (top-left)
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for it to provision (~30 seconds)

#### Step 3: Connect Database to App
1. Click on your **Khashn** service
2. Go to **"Variables"** tab
3. Add this variable:
   - **Name:** `DATABASE_URL`
   - **Value:** `${{Postgres.DATABASE_URL}}`
4. Click **"Save"** — Railway auto-redeploys with the database connected

#### Step 4: Add Custom Domain (sqftlab.com)
1. In your Khashn service, go to **"Settings"** tab
2. Under **"Networking"** → click **"Generate Domain"** first (to get a `.up.railway.app` URL)
3. Then click **"Custom Domain"** → enter `sqftlab.com`
4. Railway will show you DNS records to configure

#### Step 5: Configure GoDaddy DNS
1. Log in to [GoDaddy](https://dcc.godaddy.com)
2. Find **sqftlab.com** → click **DNS / Manage DNS**
3. Add the DNS records Railway provided:
   - **Type:** CNAME | **Name:** @ | **Value:** `your-service.up.railway.app` | **TTL:** 600
   - **Type:** CNAME | **Name:** www | **Value:** `your-service.up.railway.app` | **TTL:** 600
4. Save and wait 5-15 minutes for propagation
5. Railway auto-verifies and provisions SSL certificate

#### Step 6: Verify
1. Visit **https://sqftlab.com** — should load the Khashn platform
2. Check all pages: Heatmap, Communities, Listings, Portfolio, Calculator

### Manual

```bash
bun run build
bun run start
```

## Design System

- **Brand**: `#0A2540` (midnight navy)
- **Accent**: `#C8A96E` (warm gold)
- **Positive**: `#0E7C6E` (UAE teal)
- **Background**: `#F5F0E8` (desert sand)
- **Typography**: Georgia (display) + Inter (UI)

## License

Apache-2.0
