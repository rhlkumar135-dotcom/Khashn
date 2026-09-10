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

### Railway (Recommended)

1. Push to GitHub
2. Connect Railway to your GitHub repo
3. Add a PostgreSQL database service in Railway
4. Set environment variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `NODE_ENV=production`
5. Railway auto-deploys on push to `main`

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
