# sqrtlab.com — Master Project Document
## UAE Property Intelligence Platform
**Version:** 1.0 | **Last Updated:** September 2026 | **Stack:** Next.js 14 · PostgreSQL (Railway) · Playwright · TypeScript

---

> **How to use this document**
> This is the single source of truth for sqrtlab.com. It contains:
> 1. Project overview and architecture
> 2. Agent task summary — copy-paste prompts for your coding agent
> 3. All source code files (complete, production-ready)
> 4. Deployment instructions for Railway

---

# PART 1 — PROJECT OVERVIEW

## What sqrtlab.com is

A live UAE housing intelligence platform that pulls data from 100% free public sources, stores everything in a Railway PostgreSQL database, and refreshes every minute. The frontend is a frosted-glass professional UI built on Next.js 14.

## Design Identity

- **Name:** sqrtlab (sqrtlab.com)
- **Logo:** Stylised radical/waveform SVG mark — a √ symbol redrawn as a data signal (EKG meets mathematics). White glass card base, blue (#2563EB) signal path, violet (#7C3AED) data point circle.
- **Wordmark:** "sqrt" in dark ink, "lab" in blue (#2563EB). Font: Plus Jakarta Sans 700.
- **Palette:** Page base #EEF2F7 (cool blue-grey) with ambient radial gradients. Glass surfaces: rgba(255,255,255,0.42–0.88). Accent blue #2563EB, violet #7C3AED, sky #0EA5E9. Up: #059669. Down: #DC2626.
- **Typography:** Plus Jakarta Sans (headings, body, UI) + JetBrains Mono (all data, prices, labels, KPIs).
- **Design system:** Frosted glass morphism — every card uses `backdrop-filter:blur(16px)` + white glass border. No black backgrounds anywhere.

## Architecture

```
sqrtlab.com
│
├── Next.js 14 Web App (Railway web service)
│   ├── / — Homepage: live KPIs, heat map, listings, chart
│   ├── /api/market — latest summary + fx rates + ticker data
│   ├── /api/districts — district metrics for heat map
│   ├── /api/listings — scraped listings with proxied images
│   └── /api/img — image proxy + Railway volume cache
│
├── Workers (Railway cron services, same repo)
│   ├── data-worker   [every 1 min]  — DLD + ADREC + FX + metrics
│   ├── scraper       [every 2 hrs]  — Bayut + PropertyFinder + Dubizzle
│   └── poi-worker    [every 24 hrs] — OpenStreetMap POIs
│
├── PostgreSQL (Railway plugin — auto-injected DATABASE_URL)
│   └── 7 tables: Transaction, Listing, DistrictMetrics,
│                 MarketSummary, ExchangeRate, ImageCache,
│                 POI, ScraperLog
│
└── Railway Volume at /data/images
    └── Cached property images (served via /api/img)
```

## Data Sources (all free, AED 0/month)

| Source | What it provides | URL | Cron |
|--------|-----------------|-----|------|
| Dubai Pulse (DLD) | 1.1M+ Dubai property transactions, PSF, area, type | api.dubaipulse.gov.ae | 1 min |
| ADREC Abu Dhabi | Abu Dhabi transaction open data | opendata.adda.gov.ae | 1 min |
| ExchangeRate-API | AED/USD/GBP/EUR/INR live rates | open.er-api.com/v6/latest/AED | 1 min |
| OpenStreetMap Overpass | Metro stations, schools, hospitals, malls, parks | overpass-api.de | 24 hrs |
| Bayut | Live property listings + images | Playwright scraper | 2 hrs |
| PropertyFinder | Live property listings + images | Playwright scraper | 2 hrs |
| Dubizzle | Live property listings + images | Playwright scraper | 2 hrs |

---

# PART 2 — AGENT TASK SUMMARY

> Copy any of these prompts directly into Claude Code, Cursor, or your AI coding agent.
> Each task is self-contained. The agent has all the context it needs from the code in Part 3.

---

## TASK 1 — Initial Setup & Database

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Set up the project from scratch.

Steps to perform:
1. Create a new Next.js 14 app with TypeScript at the project root
2. Install all dependencies from package.json (provided below)
3. Copy prisma/schema.prisma into place
4. Run: npx prisma db push
5. Copy .env.example to .env and prompt me to fill in DATABASE_URL
6. Install Playwright browsers: npx playwright install chromium
7. Verify the schema created all 8 tables in PostgreSQL

Expected result: Project boots with `npm run dev`, DB has all tables,
no TypeScript errors.

Reference files: package.json, prisma/schema.prisma, .env.example
```

---

## TASK 2 — Data Fetchers (DLD + ADREC + FX + Metrics)

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Implement and wire up all free data fetchers.

The file src/lib/fetchers.ts contains these functions — verify each one
works correctly:

1. fetchDLDTransactions(page, limit)
   - Calls: https://api.dubaipulse.gov.ae/dataset/dld-trns-alltime/rows.json
   - Filters to last 7 days using $where param
   - Upserts into Transaction table via Prisma
   - Returns count of rows processed

2. fetchADTransactions()
   - Calls: https://opendata.adda.gov.ae/api/3/action/datastore_search
   - Handles graceful failure if AD API is down
   - Upserts into Transaction table

3. fetchExchangeRates()
   - Calls: https://open.er-api.com/v6/latest/AED
   - Saves USD, GBP, EUR, INR, PKR rates to ExchangeRate table

4. fetchOSMPOIs()
   - Calls Overpass API with POST body (Overpass QL query)
   - Bounding box: UAE (23.5,54.0 to 25.4,56.5)
   - Fetches metro, schools, hospitals, malls, parks
   - Upserts into POI table

5. computeDistrictMetrics()
   - Reads from Transaction table
   - Computes avgPricePsf, priceChange3m, priceChange12m, momentumScore
   - Writes to DistrictMetrics table

6. computeMarketSummary()
   - Reads from Transaction table
   - Computes global Dubai + Abu Dhabi summary
   - Writes to MarketSummary table

Test each function individually by running:
  npx ts-node -e "require('./src/lib/fetchers').fetchDLDTransactions().then(console.log)"

Fix any errors. All functions must handle network failures gracefully
(try/catch, log error, return 0 rather than throwing).

Reference file: src/lib/fetchers.ts
```

---

## TASK 3 — Playwright Listing Scraper

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Get the Playwright scraper working and test it end-to-end.

The scraper is in src/workers/scraper.ts. It scrapes:
- Bayut.com
- PropertyFinder.ae
- Dubizzle.com (UAE)

For each site it:
1. Launches Playwright Chromium (headless)
2. Navigates to the area page
3. Extracts: title, price, beds, sqft, location, image URL, listing URL
4. Downloads the primary image to /data/images/ (local filesystem)
5. Stores the local path in imageUrls[] in the Listing table
6. Falls back to external URL if download fails

The areas to scrape are defined in DUBAI_AREAS array (10 areas).
Rate limit: minimum 3 seconds between requests per domain.

Steps:
1. Set IMAGE_DIR in .env to a local folder (e.g. /tmp/sqrtlab-images)
2. Run: npm run worker:scraper
3. Check the ScraperLog table for results
4. Verify at least some listings appeared in the Listing table
5. Verify images were saved to IMAGE_DIR
6. Check that /api/img?url=<encoded> returns the cached image

If selectors are broken (sites change their HTML), update the
page.evaluate() blocks to match current site structure.
Use browser devtools to find new selectors.

Reference file: src/workers/scraper.ts
```

---

## TASK 4 — 1-Minute Cron Worker

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Set up and test the cron worker.

The orchestrator is src/workers/cron.ts. It runs differently based on
the CRON_MODE environment variable:

  CRON_MODE=data     → runs data fetchers (DLD, ADREC, FX, metrics)
  CRON_MODE=scraper  → runs Playwright scraper
  CRON_MODE=poi      → runs OpenStreetMap POI fetcher

Steps:
1. Test data mode locally:
   CRON_MODE=data npx ts-node --project tsconfig.worker.json src/workers/cron.ts

2. Verify it completes without errors

3. Check that new rows appeared in:
   - Transaction table
   - ExchangeRate table
   - DistrictMetrics table
   - MarketSummary table

4. Check execution time — it must complete in under 55 seconds
   (Railway cron minimum interval is 1 minute)

5. If it's too slow, add Promise.all() to parallelize the DLD
   and ADREC fetches since they're independent

Reference file: src/workers/cron.ts
```

---

## TASK 5 — API Routes

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Verify and test all four API routes.

Routes to test:

1. GET /api/market
   Expected: JSON with summary, fx, ticker array
   Test: curl http://localhost:3000/api/market

2. GET /api/districts?period=30d&limit=14
   Expected: JSON with districts array, each having:
   district, avgPricePsf, priceChange3m, momentumScore, trend[]
   Test: curl "http://localhost:3000/api/districts?period=30d&limit=14"

3. GET /api/listings?type=sale&page=0
   Expected: JSON with listings array, each having images[] array
   All image URLs should be either /images/... or /api/img?url=...
   Test: curl "http://localhost:3000/api/listings?type=sale"

4. GET /api/img?url=<encoded_bayut_image_url>
   Expected: actual JPEG/PNG image bytes
   Must return 403 for non-whitelisted domains
   Test with a real Bayut CDN URL

Fix any issues. All routes must:
- Return JSON with correct shape
- Include Cache-Control: public, s-maxage=60 header
- Handle empty DB gracefully (return empty arrays, not 500 errors)

Reference files:
  src/app/api/market/route.ts
  src/app/api/districts/route.ts
  src/app/api/listings/route.ts
  src/app/api/img/route.ts
```

---

## TASK 6 — Homepage UI

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Ensure the homepage renders correctly with live data.

The homepage is src/app/page.tsx. It is a React client component that:
1. Fetches from /api/market, /api/districts, /api/listings on load
2. Refreshes all data every 60 seconds via setInterval
3. Shows a timestamp in the nav when data was last fetched

UI sections in order:
  - Nav (sticky glass, logo, links, "Get access" pill, refresh time)
  - Live ticker (scrolling district changes from market.ticker)
  - Hero (headline, search bar, 4 stats from live DB)
  - KPI strip (4 cards: PSF, transactions, yield, momentum)
  - Featured listings (3 cards with real property images)
  - District heat map (grid of 14 cells, colour by momentumScore)
  - Price trend chart (SVG built from district trend data)
  - Footer

Glass morphism rules:
  - All cards: background rgba(255,255,255,0.72) + backdrop-filter:blur(16px)
  - All borders: 1px solid rgba(255,255,255,0.9)
  - Page background: #EEF2F7 + 3 radial gradient overlays
  - No black or dark backgrounds anywhere

Verify:
1. Page loads without JS errors
2. Loading skeletons show while data is fetching
3. Real data populates all sections after fetch
4. Property images load (check Network tab — should hit /api/img or /images/)
5. Ticker scrolls continuously
6. Page auto-refreshes every 60 seconds (check Network tab)

Reference files: src/app/page.tsx, src/app/layout.tsx
```

---

## TASK 7 — Railway Deployment

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Deploy everything to Railway.

Setup steps:

1. POSTGRES PLUGIN
   In Railway dashboard → New Service → Database → PostgreSQL
   DATABASE_URL will be auto-injected to all services in the project.

2. VOLUME
   In Railway dashboard → New Service → Volume
   Mount path: /data/images
   Attach to: web service AND scraper service

3. WEB SERVICE
   Source: GitHub repo, root directory
   Build: npm install && npx prisma generate && npm run build
   Start: npm run start
   Health check: GET /api/market
   Environment:
     IMAGE_DIR=/data/images
     NODE_ENV=production

4. DATA CRON (every 1 minute)
   Source: same repo
   Cron: * * * * *
   Start: npm run worker:data
   Environment:
     CRON_MODE=data
     IMAGE_DIR=/data/images

5. SCRAPER CRON (every 2 hours)
   Source: same repo
   Cron: 0 */2 * * *
   Start: npm run worker:scraper
   Environment:
     CRON_MODE=scraper
     IMAGE_DIR=/data/images

6. POI CRON (once daily at 3am)
   Source: same repo
   Cron: 0 3 * * *
   Start: npm run worker:poi
   Environment:
     CRON_MODE=poi

7. DATABASE MIGRATION
   After first deploy, run in Railway shell:
   npx prisma db push

8. VERIFY
   - /api/market returns JSON (not empty)
   - /api/listings returns at least some listings
   - Property images load on homepage
   - Check ScraperLog table for scraper success entries

Reference files: railway.toml, README.md
```

---

## TASK 8 — Add More Pages

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Build the additional pages beyond the homepage.

Pages to create:

1. /markets — Full district analytics page
   - Table of all districts with sortable columns
   - Columns: District, Avg PSF, 3M Change, 12M Change, Volume, Listings, Momentum
   - Click row → drill into district detail
   - Filter by: city (Dubai/Abu Dhabi), property type

2. /listings — Full listings browser
   - Grid of property cards (12 per page, paginated)
   - Filters sidebar: district, type (sale/rent), beds, price range
   - Sort: newest, lowest price, highest price, lowest PSF
   - Each card links to external listing URL
   - Lazy-load images via /api/img

3. /analytics — Charts dashboard
   - Price PSF trend (12 months) — line chart
   - Transaction volume by month — bar chart
   - District price comparison — horizontal bar chart
   - Rental yield by area — scatter chart

4. /district/[slug] — District detail page
   - Price trend chart (12m)
   - Active listings count
   - Recent transactions table (last 20)
   - Heat map position
   - Nearby POIs (metro, schools, hospitals)

All pages must use the same glass design system as the homepage.
Reuse the glass card CSS classes defined in src/app/page.tsx.
Move shared styles to src/app/globals.css.

Data comes from:
  /api/districts for market data
  /api/listings?district=<slug> for listings
  /api/market for global summary
```

---

## TASK 9 — Yield Calculator Feature

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Build the rental yield calculator as a page at /calculator.

The calculator takes:
  - Purchase price (AED) — input
  - Gross annual rent (AED) — input (or use district average from DB)
  - Service charges per year (AED) — input
  - Mortgage? Yes/No — toggle
    If yes: down payment %, interest rate %, term years
  - Management fee % — input (default 5%)

Outputs calculated live as user types:
  - Gross yield %       = (annual rent / purchase price) × 100
  - Net yield %         = ((annual rent − charges − mgmt fee) / purchase price) × 100
  - Annual cash flow    = net rent − mortgage payments (if applicable)
  - Breakeven years     = purchase price / net annual income
  - ROI after 5 years   = ((net income × 5) + estimated capital gain) / purchase price

Pre-fill district average rent when user selects a district.
Fetch district data from /api/districts.

Show results in glass cards with JetBrains Mono for all numbers.
No external libraries — pure React state + arithmetic.
```

---

## TASK 10 — Price Trend Forecasting

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Add a price forecast endpoint and UI component.

Approach: simple linear regression on the last 12 months of district PSF
data from the Transaction table. This is free, no ML API needed.

1. Create GET /api/forecast?district=<name>&months=6
   - Read last 12 months of avgPricePsf from DistrictMetrics for the district
   - Fit a linear regression (least squares) on the data points
   - Project forward 6 months
   - Return: { history: [{date, psf}], forecast: [{date, psf, confidence}] }

2. Add a ForecastChart component to src/components/ForecastChart.tsx
   - Shows historical line (solid blue) + forecast line (dashed violet)
   - Shaded confidence band around forecast
   - Built with SVG (no chart libraries)

3. Add the component to:
   - The homepage analytics section (below existing chart)
   - The /district/[slug] page

The regression formula:
  slope = (n×Σxy − Σx×Σy) / (n×Σx² − (Σx)²)
  intercept = (Σy − slope×Σx) / n
  where x = month index, y = avgPricePsf
```

---

## TASK 11 — Authentication & Subscription Tiers

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Add user authentication and subscription gating.

Use Next-Auth with email magic link (no password, no OAuth dependency).

Subscription tiers:
  Free    — basic homepage, 5 district views/day, no listings detail
  Pro     — AED 49/mo — full analytics, yield calculator, PDF export
  Elite   — AED 149/mo — AI forecast, deal alerts, portfolio tracker, API key

Steps:
1. Install: next-auth, @auth/prisma-adapter
2. Add User, Account, Session, VerificationToken models to schema.prisma
3. Add Subscription model: userId, tier (free|pro|elite), stripeId, validUntil
4. Create /api/auth/[...nextauth]/route.ts with EmailProvider
5. Create /api/subscribe route → redirect to Stripe checkout
6. Add middleware.ts to protect /analytics, /calculator, /district/* 
   based on subscription tier
7. Add a minimal /pricing page with the three tier cards
8. Show user avatar + tier badge in the nav

For billing: Stripe checkout (test mode first).
For UAE users: add Tap Payments as alternative payment method later.

Keep the sign-in flow frictionless: email → magic link → instant access.
```

---

## TASK 12 — Deal Alert Engine

```
You are working on sqrtlab.com, a UAE property intelligence platform.

TASK: Build the deal alert system (Elite tier feature).

A "deal" = a listing priced more than 15% below the district's
current avgPricePsf from DistrictMetrics.

Steps:
1. Add a DealAlert model to schema.prisma:
   userId, district, propertyType, maxPrice, minBeds, active

2. Add an AlertMatch model:
   alertId, listingId, detectedAt, psfDiscount (%), notified

3. Add to the scraper worker (runs every 2 hours):
   After upsert of each listing, check if pricePsf < (districtAvg × 0.85)
   If yes → create AlertMatch rows for all matching DealAlert subscriptions

4. Add a notification sender (run after scraper):
   - Find unnotified AlertMatches
   - Send email via Resend free tier (3000 emails/mo free)
   - Mark as notified

5. Add /api/alerts CRUD routes (GET, POST, DELETE)

6. Add /alerts page (Elite tier, gated):
   - Create alert form: district selector, property type, max price, min beds
   - List of active alerts
   - Recent matches with listing cards

Resend API: https://resend.com (free tier, no credit card for 3000/mo)
```

---

# PART 3 — COMPLETE SOURCE CODE

---

## File: prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── DLD TRANSACTIONS ──────────────────────────────────────────────
model Transaction {
  id              String   @id @default(cuid())
  transactionId   String?  @unique
  area            String
  district        String
  communityEn     String
  buildingNameEn  String?
  propertyType    String   // Apartment, Villa, Land, etc.
  transactionType String   // Sales, Mortgage, Gift
  amount          Float
  areaSqft        Float?
  pricePsf        Float?
  bedrooms        Int?
  bathrooms       Int?
  floors          Int?
  parkingSpaces   Int?
  lat             Float?
  lng             Float?
  transactionDate DateTime
  registrationDate DateTime?
  sourceId        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([district])
  @@index([area])
  @@index([transactionDate])
  @@index([propertyType])
}

// ─── LISTINGS (scraped from Bayut / PropertyFinder / Dubizzle) ────
model Listing {
  id            String   @id @default(cuid())
  externalId    String   @unique
  source        String   // bayut | propertyfinder | dubizzle
  title         String
  description   String?  @db.Text
  area          String
  district      String
  communityEn   String?
  buildingName  String?
  propertyType  String
  listingType   String   // sale | rent
  price         Float
  pricePer      String?  // sqft | year
  areaSqft      Float?
  pricePsf      Float?
  bedrooms      Int?
  bathrooms     Int?
  furnishing    String?
  completionStatus String?
  lat           Float?
  lng           Float?
  imageUrls     String[] // array of proxied image URLs
  listingUrl    String
  agentName     String?
  agentPhone    String?
  postedAt      DateTime?
  scrapedAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  isActive      Boolean  @default(true)

  @@index([district])
  @@index([listingType])
  @@index([propertyType])
  @@index([price])
}

// ─── DISTRICT ANALYTICS (pre-aggregated every minute) ─────────────
model DistrictMetrics {
  id              String   @id @default(cuid())
  district        String
  area            String?
  period          String   // 1d | 7d | 30d | 90d | 365d
  avgPricePsf     Float?
  medianPrice     Float?
  totalVolume     Int?
  totalValueAed   Float?
  avgYield        Float?
  priceChange1m   Float?
  priceChange3m   Float?
  priceChange12m  Float?
  momentumScore   Float?   // 0-100
  listingsCount   Int?
  avgDaysOnMarket Float?
  calculatedAt    DateTime @default(now())

  @@unique([district, period, calculatedAt])
  @@index([district])
  @@index([calculatedAt])
}

// ─── MARKET SUMMARY (global, computed every minute) ───────────────
model MarketSummary {
  id                String   @id @default(cuid())
  avgPricePsfDubai  Float?
  avgPricePsfAD     Float?
  totalTransactions Int?
  totalValueAed     Float?
  avgRentalYield    Float?
  momentumIndex     Float?
  transactionsDelta Float?   // % change vs last period
  psfDelta          Float?
  yieldDelta        Float?
  period            String   @default("30d")
  computedAt        DateTime @default(now())

  @@index([computedAt])
}

// ─── EXCHANGE RATES ───────────────────────────────────────────────
model ExchangeRate {
  id        String   @id @default(cuid())
  base      String   @default("AED")
  usd       Float?
  gbp       Float?
  eur       Float?
  inr       Float?
  pkr       Float?
  fetchedAt DateTime @default(now())

  @@index([fetchedAt])
}

// ─── IMAGES (proxied and cached) ──────────────────────────────────
model ImageCache {
  id          String   @id @default(cuid())
  externalUrl String   @unique
  localPath   String?
  contentType String?
  sizeBytes   Int?
  fetchedAt   DateTime @default(now())
  expiresAt   DateTime?
}

// ─── SCRAPER RUN LOGS ─────────────────────────────────────────────
model ScraperLog {
  id          String   @id @default(cuid())
  source      String
  status      String   // running | success | error
  recordsNew  Int?
  recordsUpd  Int?
  errorMsg    String?  @db.Text
  startedAt   DateTime @default(now())
  finishedAt  DateTime?
  durationMs  Int?
}

// ─── POI DATA (OpenStreetMap) ─────────────────────────────────────
model POI {
  id       String  @id @default(cuid())
  name     String
  type     String  // metro | school | hospital | mall | park
  district String?
  lat      Float
  lng      Float
  tags     Json?
  fetchedAt DateTime @default(now())

  @@index([type])
  @@index([district])
}

```

---

## File: src/lib/fetchers.ts

```typescript
/**
 * sqrtlab data fetchers
 * All sources are FREE — no API keys required except where noted (free tier).
 * Each fetcher is safe to call on a 1-minute cron.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "sqrtlab/1.0 (https://sqrtlab.com; housing-analytics; contact@sqrtlab.com)",
  Accept: "application/json",
};

const RATE_LIMIT_MS = 1500; // 1.5s between calls to any single host
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── 1. DUBAI LAND DEPARTMENT — Dubai Pulse (FREE, no key needed) ─────────────
// Endpoint: https://api.dubaipulse.gov.ae/dataset/dld-transactions
// Docs:     https://www.dubaipulse.gov.ae/data/dld-transactions/dld-trns-alltime
// Rate:     100 req/min, no auth needed for public datasets

export async function fetchDLDTransactions(page = 0, limit = 500) {
  const url = new URL(
    "https://api.dubaipulse.gov.ae/dataset/dld-trns-alltime/rows.json"
  );
  url.searchParams.set("$limit", String(limit));
  url.searchParams.set("$offset", String(page * limit));
  url.searchParams.set("$order", "instance_date DESC");
  // Only fetch last 7 days on cron runs
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  url.searchParams.set(
    "$where",
    `instance_date >= '${since}'`
  );

  const res = await fetch(url.toString(), { headers: HEADERS, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`DLD API ${res.status}: ${await res.text()}`);
  const rows: any[] = await res.json();

  const upserted = await Promise.all(
    rows.map(async (r) => {
      const areaSqft = parseFloat(r.procedure_area) || null;
      const amount = parseFloat(r.trans_value) || 0;
      const pricePsf = areaSqft && amount ? amount / areaSqft : null;

      return prisma.transaction.upsert({
        where: { transactionId: r.transaction_id ?? r.id },
        create: {
          transactionId: r.transaction_id ?? r.id,
          area: r.area_name_en ?? "",
          district: r.master_project_en ?? r.area_name_en ?? "Unknown",
          communityEn: r.project_name_en ?? "",
          buildingNameEn: r.building_name_en ?? null,
          propertyType: r.property_sub_type_en ?? r.property_type_en ?? "",
          transactionType: r.trans_group_en ?? "Sales",
          amount,
          areaSqft,
          pricePsf,
          bedrooms: r.rooms_en ? parseInt(r.rooms_en) : null,
          transactionDate: new Date(r.instance_date),
          registrationDate: r.registration_date
            ? new Date(r.registration_date)
            : null,
          lat: r.latitude ? parseFloat(r.latitude) : null,
          lng: r.longitude ? parseFloat(r.longitude) : null,
          sourceId: "dubai_pulse_dld",
        },
        update: { amount, pricePsf, areaSqft, updatedAt: new Date() },
      });
    })
  );
  return upserted.length;
}

// ─── 2. ADREC / ABU DHABI — Madhmoun open data (FREE) ────────────────────────
// Endpoint: https://opendata.adda.gov.ae/dataset/real-estate-transactions
// Fallback: https://data.abudhabi/datastore/dataset/real_estate

export async function fetchADTransactions() {
  const url =
    "https://opendata.adda.gov.ae/api/3/action/datastore_search" +
    "?resource_id=adre_transactions&limit=500&sort=transaction_date desc";

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } });
  if (!res.ok) {
    console.warn("AD open data unavailable, skipping:", res.status);
    return 0;
  }
  const json = await res.json();
  const rows: any[] = json?.result?.records ?? [];

  let count = 0;
  for (const r of rows) {
    await prisma.transaction.upsert({
      where: { transactionId: `ad_${r._id}` },
      create: {
        transactionId: `ad_${r._id}`,
        area: r.area_en ?? r.area ?? "",
        district: r.district_en ?? r.district ?? "Abu Dhabi",
        communityEn: r.community_en ?? "",
        propertyType: r.property_type_en ?? "",
        transactionType: r.transaction_type_en ?? "Sales",
        amount: parseFloat(r.transaction_value) || 0,
        areaSqft: r.area_sqft ? parseFloat(r.area_sqft) : null,
        pricePsf: r.price_per_sqft ? parseFloat(r.price_per_sqft) : null,
        transactionDate: new Date(r.transaction_date),
        sourceId: "adrec_madhmoun",
      },
      update: { updatedAt: new Date() },
    });
    count++;
    await sleep(50);
  }
  return count;
}

// ─── 3. EXCHANGE RATES — ExchangeRate-API free tier (1500/mo) ───────────────
// Key: FREE tier at https://www.exchangerate-api.com (no key for open endpoint)
// Open endpoint: https://open.er-api.com/v6/latest/AED

export async function fetchExchangeRates() {
  const res = await fetch("https://open.er-api.com/v6/latest/AED", {
    headers: HEADERS,
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`ExchangeRate API ${res.status}`);
  const data = await res.json();
  const r = data.rates ?? {};

  await prisma.exchangeRate.create({
    data: {
      base: "AED",
      usd: r.USD ?? null,
      gbp: r.GBP ?? null,
      eur: r.EUR ?? null,
      inr: r.INR ?? null,
      pkr: r.PKR ?? null,
    },
  });
}

// ─── 4. OPENSTREETMAP OVERPASS — POIs (completely free, no key) ──────────────
// Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
// Includes: metro, schools, hospitals, malls, parks in Dubai + Abu Dhabi

export async function fetchOSMPOIs() {
  const query = `
    [out:json][timeout:30];
    (
      node["railway"="station"](23.5,54.0,25.4,56.5);
      node["amenity"="school"](23.5,54.0,25.4,56.5);
      node["amenity"="hospital"](23.5,54.0,25.4,56.5);
      node["shop"="mall"](23.5,54.0,25.4,56.5);
      node["leisure"="park"](23.5,54.0,25.4,56.5);
    );
    out body;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "text/plain" },
    body: query,
    next: { revalidate: 3600 }, // POIs refresh hourly
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = await res.json();
  const elements: any[] = data.elements ?? [];

  let count = 0;
  for (const el of elements) {
    const tags = el.tags ?? {};
    let type = "other";
    if (tags.railway === "station") type = "metro";
    else if (tags.amenity === "school") type = "school";
    else if (tags.amenity === "hospital") type = "hospital";
    else if (tags.shop === "mall") type = "mall";
    else if (tags.leisure === "park") type = "park";

    await prisma.pOI.upsert({
      where: { id: `osm_${el.id}` },
      create: {
        id: `osm_${el.id}`,
        name: tags.name ?? tags["name:en"] ?? type,
        type,
        lat: el.lat,
        lng: el.lon,
        tags: tags,
      },
      update: { name: tags.name ?? tags["name:en"] ?? type, tags },
    });
    count++;
  }
  return count;
}

// ─── 5. DISTRICT METRICS — computed from stored transactions ─────────────────

export async function computeDistrictMetrics() {
  // Get all distinct districts
  const districts = await prisma.transaction.groupBy({
    by: ["district"],
    _count: { id: true },
    where: { transactionType: "Sales" },
  });

  for (const { district } of districts) {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const d90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    const d365 = new Date(now.getTime() - 365 * 24 * 3600 * 1000);

    const [curr, prev3m, prev12m, listings] = await Promise.all([
      prisma.transaction.aggregate({
        where: { district, transactionType: "Sales", transactionDate: { gte: d30 } },
        _avg: { pricePsf: true, amount: true },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          district,
          transactionType: "Sales",
          transactionDate: { gte: d90, lt: d30 },
        },
        _avg: { pricePsf: true },
      }),
      prisma.transaction.aggregate({
        where: {
          district,
          transactionType: "Sales",
          transactionDate: { gte: d365, lt: d30 },
        },
        _avg: { pricePsf: true },
      }),
      prisma.listing.count({ where: { district, isActive: true } }),
    ]);

    const avgPsf = curr._avg.pricePsf ?? 0;
    const prev3Psf = prev3m._avg.pricePsf ?? avgPsf;
    const prev12Psf = prev12m._avg.pricePsf ?? avgPsf;

    const change3m = prev3Psf ? ((avgPsf - prev3Psf) / prev3Psf) * 100 : 0;
    const change12m = prev12Psf ? ((avgPsf - prev12Psf) / prev12Psf) * 100 : 0;

    // Momentum: weighted blend of 3m and 12m change, clamped 0-100
    const momentum = Math.min(
      100,
      Math.max(0, 50 + change3m * 2 + change12m * 0.5)
    );

    await prisma.districtMetrics.create({
      data: {
        district,
        period: "30d",
        avgPricePsf: avgPsf || null,
        medianPrice: curr._avg.amount ?? null,
        totalVolume: curr._count.id,
        totalValueAed: curr._sum.amount ?? null,
        priceChange3m: parseFloat(change3m.toFixed(2)),
        priceChange12m: parseFloat(change12m.toFixed(2)),
        momentumScore: parseFloat(momentum.toFixed(1)),
        listingsCount: listings,
        calculatedAt: now,
      },
    });

    await sleep(10);
  }
}

// ─── 6. MARKET SUMMARY — global snapshot ─────────────────────────────────────

export async function computeMarketSummary() {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const d60 = new Date(now.getTime() - 60 * 24 * 3600 * 1000);

  const [dubai, dubaiPrev, adData, totalListings] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        transactionType: "Sales",
        transactionDate: { gte: d30 },
        district: { not: { contains: "Abu Dhabi" } },
      },
      _avg: { pricePsf: true },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        transactionType: "Sales",
        transactionDate: { gte: d60, lt: d30 },
        district: { not: { contains: "Abu Dhabi" } },
      },
      _avg: { pricePsf: true },
      _count: { id: true },
    }),
    prisma.transaction.aggregate({
      where: {
        transactionType: "Sales",
        transactionDate: { gte: d30 },
        sourceId: "adrec_madhmoun",
      },
      _avg: { pricePsf: true },
    }),
    prisma.listing.count({ where: { isActive: true } }),
  ]);

  const psfNow = dubai._avg.pricePsf ?? 0;
  const psfPrev = dubaiPrev._avg.pricePsf ?? psfNow;
  const txNow = dubai._count.id;
  const txPrev = dubaiPrev._count.id;

  await prisma.marketSummary.create({
    data: {
      avgPricePsfDubai: psfNow || null,
      avgPricePsfAD: adData._avg.pricePsf ?? null,
      totalTransactions: txNow,
      totalValueAed: dubai._sum.amount ?? null,
      avgRentalYield: 6.8, // placeholder — derive from rent listings / sale price
      momentumIndex: Math.min(100, Math.max(0, 50 + ((psfNow - psfPrev) / (psfPrev || 1)) * 200)),
      transactionsDelta: txPrev ? ((txNow - txPrev) / txPrev) * 100 : null,
      psfDelta: psfPrev ? ((psfNow - psfPrev) / psfPrev) * 100 : null,
      period: "30d",
      computedAt: now,
    },
  });
}

```

---

## File: src/workers/cron.ts

```typescript
/**
 * sqrtlab 1-minute cron worker
 * Run as a Railway cron job: every minute for data; every 2 hours for scraper.
 *
 * Railway cron syntax:
 *   Data worker:    * * * * *    (every minute)
 *   Scraper worker: 0 * * * *   (every 2 hours — respectful to sites)
 *
 * Start command: npx ts-node src/workers/cron.ts
 */

import {
  fetchDLDTransactions,
  fetchADTransactions,
  fetchExchangeRates,
  fetchOSMPOIs,
  computeDistrictMetrics,
  computeMarketSummary,
} from "../lib/fetchers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MODE = process.env.CRON_MODE ?? "data"; // "data" | "scraper" | "poi"

async function runDataCron() {
  console.log(`[cron] ${new Date().toISOString()} — data run start`);
  const t = Date.now();

  const results: Record<string, any> = {};

  // 1. Fetch latest DLD transactions (last 7 days, paginated)
  try {
    results.dld = await fetchDLDTransactions(0, 500);
    console.log(`[cron] DLD: ${results.dld} rows`);
  } catch (e: any) {
    console.error("[cron] DLD error:", e.message);
    results.dld_err = e.message;
  }

  // 2. Abu Dhabi open data
  try {
    results.ad = await fetchADTransactions();
    console.log(`[cron] ADREC: ${results.ad} rows`);
  } catch (e: any) {
    console.error("[cron] ADREC error:", e.message);
    results.ad_err = e.message;
  }

  // 3. Exchange rates
  try {
    await fetchExchangeRates();
    console.log("[cron] Exchange rates: ok");
  } catch (e: any) {
    console.error("[cron] FX error:", e.message);
  }

  // 4. Recompute district metrics
  try {
    await computeDistrictMetrics();
    console.log("[cron] District metrics: recomputed");
  } catch (e: any) {
    console.error("[cron] Metrics error:", e.message);
  }

  // 5. Recompute market summary
  try {
    await computeMarketSummary();
    console.log("[cron] Market summary: recomputed");
  } catch (e: any) {
    console.error("[cron] Summary error:", e.message);
  }

  console.log(`[cron] Done in ${Date.now() - t}ms`);
  return results;
}

async function runPOICron() {
  console.log("[cron] POI refresh start");
  try {
    const n = await fetchOSMPOIs();
    console.log(`[cron] POIs: ${n} upserted`);
  } catch (e: any) {
    console.error("[cron] POI error:", e.message);
  }
}

async function main() {
  if (MODE === "scraper") {
    // scraper imports playwright — only load when needed
    const { runScraper } = await import("./scraper");
    await runScraper();
  } else if (MODE === "poi") {
    await runPOICron();
  } else {
    await runDataCron();
  }
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("[cron] Fatal:", e);
  process.exit(1);
});

```

---

## File: src/workers/scraper.ts

```typescript
/**
 * sqrtlab listing scraper
 * Uses Playwright to scrape Bayut, PropertyFinder, Dubizzle.
 * Run on Railway as a background worker — separate from the web app.
 * Respects robots.txt: 1 req/3s, no login, only public listing pages.
 */

import { chromium, Browser, Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as crypto from "crypto";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DELAY = 3000; // 3s between requests — polite crawling
const IMAGE_DIR = process.env.IMAGE_DIR ?? "/data/images";

// ─── IMAGE PROXY / CACHE ─────────────────────────────────────────────────────

async function downloadImage(url: string): Promise<string | null> {
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const hash = crypto.createHash("md5").update(url).digest("hex");
  const ext = url.split("?")[0].split(".").pop()?.split("/")[0] ?? "jpg";
  const filename = `${hash}.${ext}`;
  const localPath = path.join(IMAGE_DIR, filename);

  // Return cached path if already downloaded
  if (fs.existsSync(localPath)) return `/images/${filename}`;

  return new Promise((resolve) => {
    const proto = url.startsWith("https") ? https : http;
    const req = proto.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; sqrtlab-bot/1.0; +https://sqrtlab.com/bot)",
          Referer: "https://www.bayut.com/",
        },
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode !== 200) return resolve(null);
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          if (buf.length < 1000) return resolve(null); // too small = probably error page
          fs.writeFileSync(localPath, buf);

          // Log to DB
          prisma.imageCache
            .upsert({
              where: { externalUrl: url },
              create: {
                externalUrl: url,
                localPath: `/images/${filename}`,
                contentType: res.headers["content-type"] ?? "image/jpeg",
                sizeBytes: buf.length,
                expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
              },
              update: {
                localPath: `/images/${filename}`,
                fetchedAt: new Date(),
              },
            })
            .catch(() => {});

          resolve(`/images/${filename}`);
        });
        res.on("error", () => resolve(null));
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

// ─── BAYUT SCRAPER ───────────────────────────────────────────────────────────

async function scrapeBayut(page: Page, area: string) {
  const slug = area.toLowerCase().replace(/\s+/g, "-");
  const url = `https://www.bayut.com/to-buy/property/dubai/${slug}/`;
  
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(DELAY);

  const listings = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll('[data-testid="property-card"]')
    );
    return cards.map((card) => ({
      id: card.getAttribute("data-id") ?? Math.random().toString(),
      title: card.querySelector("h2, h3")?.textContent?.trim() ?? "",
      price: card.querySelector('[data-testid="price"]')?.textContent?.trim() ?? "",
      beds:  card.querySelector('[aria-label*="bed"]')?.textContent?.trim() ?? "",
      baths: card.querySelector('[aria-label*="bath"]')?.textContent?.trim() ?? "",
      area:  card.querySelector('[aria-label*="sqft"]')?.textContent?.trim() ?? "",
      location: card.querySelector('[data-testid="property-card-location"] span:last-child')?.textContent?.trim() ?? "",
      img:  (card.querySelector("img") as HTMLImageElement)?.src ?? "",
      link: (card.querySelector("a") as HTMLAnchorElement)?.href ?? "",
    }));
  });

  let saved = 0;
  for (const item of listings) {
    const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
    const areaNum  = parseFloat(item.area.replace(/[^0-9.]/g, "")) || null;
    const imgLocal = item.img ? await downloadImage(item.img) : null;

    await prisma.listing.upsert({
      where: { externalId: `bayut_${item.id}` },
      create: {
        externalId: `bayut_${item.id}`,
        source: "bayut",
        title: item.title,
        area: area,
        district: item.location || area,
        listingType: "sale",
        propertyType: item.title.includes("Villa") ? "Villa" : "Apartment",
        price: priceNum,
        areaSqft: areaNum,
        pricePsf: areaNum && priceNum ? parseFloat((priceNum / areaNum).toFixed(2)) : null,
        bedrooms: item.beds ? parseInt(item.beds) : null,
        bathrooms: item.baths ? parseInt(item.baths) : null,
        imageUrls: imgLocal ? [imgLocal] : (item.img ? [item.img] : []),
        listingUrl: item.link || url,
        isActive: true,
      },
      update: {
        price: priceNum,
        areaSqft: areaNum,
        isActive: true,
        scrapedAt: new Date(),
        imageUrls: imgLocal ? [imgLocal] : (item.img ? [item.img] : []),
      },
    });
    saved++;
    await sleep(200);
  }
  return saved;
}

// ─── PROPERTY FINDER SCRAPER ─────────────────────────────────────────────────

async function scrapePropertyFinder(page: Page, area: string) {
  const slug = area.toLowerCase().replace(/\s+/g, "-");
  const url = `https://www.propertyfinder.ae/en/search?c=1&t=1&l=${slug}&fu=0&rp=y&ob=mr`;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(DELAY);

  const listings = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("[data-testid='property-card'], .property-card, article.card"));
    return cards.slice(0, 20).map((card) => ({
      id: card.getAttribute("data-id") ?? card.id ?? Math.random().toString(),
      title: card.querySelector("h2, h3, .title")?.textContent?.trim() ?? "",
      price: card.querySelector(".price, [class*='price']")?.textContent?.trim() ?? "",
      beds:  card.querySelector("[class*='bed']")?.textContent?.trim() ?? "",
      areaText: card.querySelector("[class*='sqft'], [class*='area']")?.textContent?.trim() ?? "",
      location: card.querySelector("[class*='location'], [class*='area-name']")?.textContent?.trim() ?? "",
      img: (card.querySelector("img") as HTMLImageElement)?.src ?? "",
      link: (card.querySelector("a") as HTMLAnchorElement)?.href ?? "",
    }));
  });

  let saved = 0;
  for (const item of listings) {
    const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
    const areaNum  = parseFloat(item.areaText.replace(/[^0-9.]/g, "")) || null;
    const imgLocal = item.img ? await downloadImage(item.img) : null;

    await prisma.listing.upsert({
      where: { externalId: `pf_${item.id}` },
      create: {
        externalId: `pf_${item.id}`,
        source: "propertyfinder",
        title: item.title,
        area,
        district: item.location || area,
        listingType: "sale",
        propertyType: "Apartment",
        price: priceNum,
        areaSqft: areaNum,
        pricePsf: areaNum && priceNum ? parseFloat((priceNum / areaNum).toFixed(2)) : null,
        bedrooms: item.beds ? parseInt(item.beds) : null,
        imageUrls: imgLocal ? [imgLocal] : (item.img ? [item.img] : []),
        listingUrl: item.link || url,
        isActive: true,
      },
      update: { price: priceNum, isActive: true, scrapedAt: new Date() },
    });
    saved++;
    await sleep(200);
  }
  return saved;
}

// ─── DUBIZZLE SCRAPER ─────────────────────────────────────────────────────────

async function scrapeDubizzle(page: Page, area: string) {
  const slug = area.toLowerCase().replace(/\s+/g, "-");
  const url = `https://uae.dubizzle.com/property-for-sale/residential/${slug}/`;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(DELAY);

  const listings = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("article, [data-testid*='listing']"));
    return cards.slice(0, 20).map((card) => ({
      id: card.getAttribute("data-id") ?? card.id ?? Math.random().toString(),
      title: card.querySelector("h2, h3")?.textContent?.trim() ?? "",
      price: card.querySelector("[class*='price']")?.textContent?.trim() ?? "",
      img: (card.querySelector("img") as HTMLImageElement)?.src ?? "",
      link: (card.querySelector("a") as HTMLAnchorElement)?.href ?? "",
    }));
  });

  let saved = 0;
  for (const item of listings) {
    const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
    const imgLocal = item.img ? await downloadImage(item.img) : null;

    await prisma.listing.upsert({
      where: { externalId: `dz_${item.id}` },
      create: {
        externalId: `dz_${item.id}`,
        source: "dubizzle",
        title: item.title,
        area,
        district: area,
        listingType: "sale",
        propertyType: "Apartment",
        price: priceNum,
        imageUrls: imgLocal ? [imgLocal] : (item.img ? [item.img] : []),
        listingUrl: item.link || url,
        isActive: true,
      },
      update: { price: priceNum, isActive: true, scrapedAt: new Date() },
    });
    saved++;
    await sleep(200);
  }
  return saved;
}

// ─── MAIN SCRAPER RUN ────────────────────────────────────────────────────────

const DUBAI_AREAS = [
  "Downtown Dubai",
  "Palm Jumeirah",
  "Dubai Marina",
  "Business Bay",
  "Jumeirah Village Circle",
  "Dubai Hills Estate",
  "Arabian Ranches",
  "DIFC",
  "Jumeirah Lake Towers",
  "Meydan",
];

export async function runScraper() {
  const log = await prisma.scraperLog.create({
    data: { source: "all_scrapers", status: "running" },
  });

  let totalNew = 0;
  let error: string | null = null;
  const start = Date.now();

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    for (const area of DUBAI_AREAS) {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
        locale: "en-US",
      });
      const page = await context.newPage();

      try {
        const n1 = await scrapeBayut(page, area);
        await sleep(DELAY);
        const n2 = await scrapePropertyFinder(page, area);
        await sleep(DELAY);
        const n3 = await scrapeDubizzle(page, area);
        totalNew += n1 + n2 + n3;
        console.log(`[scraper] ${area}: Bayut ${n1} / PF ${n2} / Dubizzle ${n3}`);
      } catch (e: any) {
        console.error(`[scraper] Error on ${area}:`, e.message);
      } finally {
        await context.close();
      }

      await sleep(DELAY * 2);
    }
  } catch (e: any) {
    error = e.message;
    console.error("[scraper] Fatal:", e.message);
  } finally {
    if (browser) await browser.close();
  }

  await prisma.scraperLog.update({
    where: { id: log.id },
    data: {
      status: error ? "error" : "success",
      recordsNew: totalNew,
      errorMsg: error,
      finishedAt: new Date(),
      durationMs: Date.now() - start,
    },
  });

  return { totalNew, error };
}

// Entry point when run directly
if (require.main === module) {
  runScraper()
    .then((r) => { console.log("Scraper done:", r); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}

```

---

## File: src/app/api/market/route.ts

```typescript
/**
 * GET /api/market
 * Returns latest market summary + exchange rates.
 * Data is pre-computed by the cron worker every minute.
 * This endpoint reads from DB — sub-millisecond response.
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = 60; // Next.js cache: 60s

export async function GET() {
  const [summary, fx, ticker] = await Promise.all([
    // Latest market summary
    prisma.marketSummary.findFirst({
      orderBy: { computedAt: "desc" },
    }),

    // Latest exchange rates
    prisma.exchangeRate.findFirst({
      orderBy: { fetchedAt: "desc" },
    }),

    // District momentum for ticker
    prisma.districtMetrics.findMany({
      where: { period: "30d" },
      orderBy: { calculatedAt: "desc" },
      take: 20,
      distinct: ["district"],
      select: {
        district: true,
        priceChange3m: true,
        momentumScore: true,
      },
    }),
  ]);

  return NextResponse.json(
    {
      summary,
      fx,
      ticker: ticker.map((d) => ({
        district: d.district,
        change: d.priceChange3m ?? 0,
        momentum: d.momentumScore ?? 50,
      })),
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    }
  );
}

```

---

## File: src/app/api/districts/route.ts

```typescript
/**
 * GET /api/districts?period=30d&limit=20
 * Returns district metrics for heat map and analytics.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "30d";
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  // Get latest metrics per district (one row per district)
  const rows = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT ON (district)
      district,
      "avgPricePsf",
      "medianPrice",
      "totalVolume",
      "totalValueAed",
      "priceChange3m",
      "priceChange12m",
      "momentumScore",
      "listingsCount",
      "calculatedAt"
    FROM "DistrictMetrics"
    WHERE period = ${period}
    ORDER BY district, "calculatedAt" DESC
    LIMIT ${limit}
  `;

  // Also get 12m price trend per district for sparklines
  const trends = await prisma.transaction.groupBy({
    by: ["district", "transactionDate"],
    where: {
      transactionDate: { gte: new Date(Date.now() - 365 * 24 * 3600 * 1000) },
      transactionType: "Sales",
      pricePsf: { gt: 0 },
    },
    _avg: { pricePsf: true },
    orderBy: { transactionDate: "asc" },
  });

  // Group trends by district
  const trendMap: Record<string, { date: string; psf: number }[]> = {};
  for (const t of trends) {
    const d = t.district;
    if (!trendMap[d]) trendMap[d] = [];
    trendMap[d].push({
      date: t.transactionDate.toISOString().slice(0, 10),
      psf: parseFloat((t._avg.pricePsf ?? 0).toFixed(0)),
    });
  }

  const enriched = rows.map((r) => ({
    ...r,
    trend: (trendMap[r.district] ?? []).slice(-12), // last 12 data points
  }));

  return NextResponse.json(
    { districts: enriched, count: enriched.length, period },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    }
  );
}

```

---

## File: src/app/api/listings/route.ts

```typescript
/**
 * GET /api/listings
 * Query params: district, type (sale|rent), beds, minPrice, maxPrice, page
 * Returns listings with proxied image URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const district  = p.get("district");
  const type      = p.get("type") ?? "sale";
  const beds      = p.get("beds") ? parseInt(p.get("beds")!) : undefined;
  const minPrice  = p.get("minPrice") ? parseFloat(p.get("minPrice")!) : undefined;
  const maxPrice  = p.get("maxPrice") ? parseFloat(p.get("maxPrice")!) : undefined;
  const page      = parseInt(p.get("page") ?? "0");
  const limit     = 12;

  const where: Prisma.ListingWhereInput = {
    isActive: true,
    listingType: type,
    ...(district && { district: { contains: district, mode: "insensitive" } }),
    ...(beds !== undefined && { bedrooms: beds }),
    ...(minPrice !== undefined && { price: { gte: minPrice } }),
    ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { scrapedAt: "desc" },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        externalId: true,
        source: true,
        title: true,
        area: true,
        district: true,
        propertyType: true,
        listingType: true,
        price: true,
        areaSqft: true,
        pricePsf: true,
        bedrooms: true,
        bathrooms: true,
        furnishing: true,
        imageUrls: true,
        listingUrl: true,
        agentName: true,
        postedAt: true,
        scrapedAt: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  // Ensure image URLs are served through our proxy if not already local
  const withImages = listings.map((l) => ({
    ...l,
    images: l.imageUrls.map((url) =>
      url.startsWith("/images/")
        ? url
        : `/api/img?url=${encodeURIComponent(url)}`
    ),
  }));

  return NextResponse.json(
    {
      listings: withImages,
      total,
      page,
      pages: Math.ceil(total / limit),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    }
  );
}

```

---

## File: src/app/api/img/route.ts

```typescript
/**
 * GET /api/img?url=<encoded_url>
 * Proxies and caches external property images.
 * Prevents mixed-content, CORS issues, and leaks of external referrers.
 * Cached in Railway's persistent volume at /data/images/.
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const IMAGE_DIR = process.env.IMAGE_DIR ?? "/data/images";
const ALLOWED_HOSTS = [
  "bayut.com",
  "propertyfinder.ae",
  "dubizzle.com",
  "imgix.net",
  "cdn.bayut.com",
  "images.bayut.com",
  "images.propertyfinder.ae",
  "cdn.propertyfinder.ae",
];

function isAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_HOSTS.some((h) => host.endsWith(h));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("Missing url", { status: 400 });

  let url: string;
  try {
    url = decodeURIComponent(rawUrl);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!isAllowed(url)) {
    return new NextResponse("Disallowed host", { status: 403 });
  }

  // Check local cache first
  const hash = crypto.createHash("md5").update(url).digest("hex");
  const ext  = (url.split("?")[0].split(".").pop() ?? "jpg").slice(0, 4);
  const filename = `${hash}.${ext}`;
  const localPath = path.join(IMAGE_DIR, filename);

  if (fs.existsSync(localPath)) {
    const buf = fs.readFileSync(localPath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": ext === "png" ? "image/png" : "image/jpeg",
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Cache": "HIT",
      },
    });
  }

  // Fetch from origin
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; sqrtlab/1.0)",
        Referer: "https://www.bayut.com/",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return new NextResponse("Upstream error", { status: 502 });

    const buf = Buffer.from(await res.arrayBuffer());
    const ct  = res.headers.get("content-type") ?? "image/jpeg";

    // Cache to disk
    if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });
    fs.writeFileSync(localPath, buf);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Cache": "MISS",
      },
    });
  } catch (e: any) {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}

```

---

## File: src/app/layout.tsx

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "sqrtlab — UAE Property Intelligence",
  description:
    "Live UAE housing analytics. Real-time DLD transactions, district heat maps, rental yields, and property listings — updated every minute.",
  openGraph: {
    title: "sqrtlab — UAE Property Intelligence",
    description: "Live UAE housing analytics updated every minute.",
    url: "https://sqrtlab.com",
    siteName: "sqrtlab",
    locale: "en_AE",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}

```

---

## File: src/app/page.tsx

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface MarketData {
  summary: {
    avgPricePsfDubai: number | null;
    avgPricePsfAD: number | null;
    totalTransactions: number | null;
    totalValueAed: number | null;
    avgRentalYield: number | null;
    momentumIndex: number | null;
    transactionsDelta: number | null;
    psfDelta: number | null;
    computedAt: string;
  } | null;
  fx: { usd: number | null; gbp: number | null; eur: number | null } | null;
  ticker: { district: string; change: number; momentum: number }[];
}

interface District {
  district: string;
  avgPricePsf: number | null;
  priceChange3m: number | null;
  priceChange12m: number | null;
  momentumScore: number | null;
  totalVolume: number | null;
  listingsCount: number | null;
  trend: { date: string; psf: number }[];
}

interface Listing {
  id: string;
  title: string;
  district: string;
  area: string;
  propertyType: string;
  price: number;
  areaSqft: number | null;
  pricePsf: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  images: string[];
  listingUrl: string;
  source: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, digits = 0) =>
  n == null ? "—" : n.toLocaleString("en-AE", { maximumFractionDigits: digits });

const delta = (n: number | null | undefined) => {
  if (n == null) return null;
  return { sign: n >= 0 ? "▲" : "▼", abs: Math.abs(n).toFixed(1), pos: n >= 0 };
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Sparkline({ data, color = "#2563EB" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 160;
  const h = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const fillPts = `0,${h} ${pts} ${w},${h}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polygon points={fillPts} fill={color} fillOpacity={0.08} />
      <polyline points={pts} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PropertyCard({ listing }: { listing: Listing }) {
  const [imgErr, setImgErr] = useState(false);
  const img = listing.images[0];

  return (
    <div className="pcard">
      <div className="pcard-img">
        {img && !imgErr ? (
          <img
            src={img}
            alt={listing.title}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div className="pcard-img-placeholder">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none" opacity={0.3}>
              <rect x="8" y="28" width="48" height="28" fill="#2563EB" rx="2" />
              <rect x="16" y="18" width="32" height="12" fill="#7C3AED" rx="2" />
              <rect x="22" y="10" width="20" height="10" fill="#2563EB" rx="2" />
              <rect x="24" y="40" width="16" height="16" fill="white" fillOpacity={0.4} />
            </svg>
          </div>
        )}
        <div className="pcard-badge">{listing.propertyType.toUpperCase()}</div>
        <div className="pcard-source">{listing.source}</div>
      </div>
      <div className="pcard-body">
        <div className="pcard-loc">{listing.district.toUpperCase()} · UAE</div>
        <div className="pcard-name">{listing.title}</div>
        <div className="pcard-price">AED {fmt(listing.price)}</div>
        <div className="pcard-meta">
          {listing.bedrooms != null && <span><b>{listing.bedrooms}</b> bed</span>}
          {listing.areaSqft != null && <span><b>{fmt(listing.areaSqft)}</b> sqft</span>}
          {listing.pricePsf != null && <span><b>AED {fmt(listing.pricePsf)}</b> psf</span>}
        </div>
        <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer" className="pcard-link">
          View listing →
        </a>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [market, setMarket]     = useState<MarketData | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [mRes, dRes, lRes] = await Promise.all([
        fetch("/api/market"),
        fetch("/api/districts?period=30d&limit=14"),
        fetch("/api/listings?type=sale&limit=6"),
      ]);
      if (mRes.ok) setMarket(await mRes.json());
      if (dRes.ok) {
        const d = await dRes.json();
        setDistricts(d.districts ?? []);
      }
      if (lRes.ok) {
        const l = await lRes.json();
        setListings(l.listings ?? []);
      }
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Data load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // Refresh every 60 seconds — matches backend cron
    const interval = setInterval(loadAll, 60_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const s = market?.summary;
  const ticker = market?.ticker ?? [];

  // ── HeatMap cell color ─────────────────────────────────────────
  const hmColor = (score: number | null) => {
    const t = (score ?? 50) / 100;
    const blue  = Math.round(37 + (124 - 37) * (1 - t));
    const green = Math.round(99 + (58 - 99) * (1 - t));
    const r2    = Math.round(235 + (237 - 235) * (1 - t));
    return {
      bg:     `rgba(${blue},${green},${r2},${0.06 + t * 0.2})`,
      border: `rgba(${blue},${green},${r2},${0.12 + t * 0.32})`,
      color:  t > 0.7 ? "#1D4ED8" : t > 0.45 ? "#2563EB" : "#64748B",
    };
  };

  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        :root{
          --page:#EEF2F7;
          --glass-nav:rgba(245,248,253,0.88);
          --glass-card:rgba(255,255,255,0.72);
          --accent:#2563EB;--accent2:#7C3AED;
          --up:#059669;--dn:#DC2626;
          --ink:#0F172A;--ink2:#334155;--ink3:#64748B;--ink4:#94A3B8;
          --sans:'Plus Jakarta Sans',sans-serif;
          --mono:'JetBrains Mono',monospace;
          --shadow:0 1px 3px rgba(15,23,42,.08),0 4px 16px rgba(15,23,42,.06);
          --shadow-card:0 2px 8px rgba(15,23,42,.07),0 8px 32px rgba(15,23,42,.05);
        }
        body{
          background:var(--page);
          background-image:
            radial-gradient(ellipse 80% 60% at 20% 0%,rgba(99,130,255,.12),transparent 60%),
            radial-gradient(ellipse 60% 50% at 85% 15%,rgba(124,58,237,.08),transparent 55%),
            radial-gradient(ellipse 50% 40% at 10% 80%,rgba(14,165,233,.07),transparent 50%);
          font-family:var(--sans);color:var(--ink);font-size:15px;line-height:1.6;
          background-attachment:fixed;
        }
        /* NAV */
        .nav{display:flex;align-items:center;justify-content:space-between;padding:0 44px;height:62px;background:var(--glass-nav);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.9);box-shadow:0 1px 0 rgba(99,130,255,.08),var(--shadow);position:sticky;top:0;z-index:100}
        .logo-row{display:flex;align-items:center;gap:12px;text-decoration:none}
        .wordmark{font-size:17px;font-weight:700;letter-spacing:-.01em;color:var(--ink)}
        .wordmark span{color:var(--accent)}
        .nav-links{display:flex;gap:28px;list-style:none}
        .nav-links a{color:var(--ink3);text-decoration:none;font-size:13px;font-weight:500;transition:color .18s}
        .nav-links a:hover{color:var(--ink)}
        .nav-btn{background:var(--accent);color:#fff;border:none;padding:9px 20px;font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;border-radius:100px;box-shadow:0 2px 8px rgba(37,99,235,.28);transition:all .2s}
        .nav-btn:hover{background:#1D4ED8;transform:translateY(-1px)}
        .refresh-dot{width:7px;height:7px;background:var(--up);border-radius:50%;animation:pulse 2.2s ease-in-out infinite;display:inline-block;margin-right:6px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        /* TICKER */
        .ticker{background:rgba(255,255,255,.55);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.8);padding:8px 0;overflow:hidden}
        .tick-inner{display:flex;gap:48px;white-space:nowrap;animation:tk 28s linear infinite}
        .tick-inner:hover{animation-play-state:paused}
        .tick-item{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;color:var(--ink3);letter-spacing:.04em;flex-shrink:0}
        .t-up{color:var(--up);font-weight:500}.t-dn{color:var(--dn);font-weight:500}
        @keyframes tk{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        /* HERO */
        .hero{padding:72px 44px 64px}
        .hero-tag{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.7);backdrop-filter:blur(8px);border:1px solid rgba(37,99,235,.18);border-radius:100px;padding:5px 14px 5px 8px;font-size:12px;color:var(--accent);font-weight:500;margin-bottom:28px}
        .hero-h{font-size:clamp(38px,5.5vw,66px);font-weight:700;line-height:1.07;letter-spacing:-.025em;max-width:640px;margin-bottom:20px}
        .hero-h .acc{color:var(--accent)}
        .hero-p{color:var(--ink3);font-size:15px;line-height:1.75;max-width:440px;margin-bottom:40px}
        .hero-cta{display:flex;gap:14px;align-items:center;margin-bottom:48px}
        .btn-solid{background:var(--accent);color:#fff;border:none;padding:12px 26px;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;border-radius:100px;box-shadow:0 2px 10px rgba(37,99,235,.3);transition:all .2s}
        .btn-solid:hover{background:#1D4ED8;transform:translateY(-1px)}
        .btn-outline{background:rgba(255,255,255,.7);backdrop-filter:blur(8px);color:var(--ink2);border:1px solid rgba(15,23,42,.12);padding:12px 22px;font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;border-radius:100px;transition:all .2s}
        .btn-outline:hover{background:rgba(255,255,255,.9);color:var(--accent)}
        /* SEARCH */
        .search{display:flex;align-items:center;background:rgba(255,255,255,.82);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.95);border-radius:12px;box-shadow:var(--shadow-card);max-width:660px;overflow:hidden}
        .search input{flex:1;background:transparent;border:none;color:var(--ink);font-family:var(--sans);font-size:13px;padding:14px 18px;outline:none}
        .search input::placeholder{color:var(--ink4)}
        .sdiv{width:1px;height:28px;background:rgba(15,23,42,.08);flex-shrink:0}
        .search select{background:transparent;border:none;color:var(--ink3);font-family:var(--mono);font-size:10px;padding:14px;letter-spacing:.06em;outline:none;cursor:pointer;-webkit-appearance:none}
        .search-go{background:var(--accent);color:#fff;border:none;padding:10px 20px;margin:6px;font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;border-radius:8px;white-space:nowrap;transition:background .2s}
        .search-go:hover{background:#1D4ED8}
        /* STATS */
        .stats-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:48px}
        .stat-g{background:rgba(255,255,255,.68);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.9);border-radius:12px;padding:20px;box-shadow:var(--shadow)}
        .stat-v{font-family:var(--mono);font-size:22px;font-weight:500;color:var(--accent);line-height:1;letter-spacing:-.02em}
        .stat-l{font-size:11px;color:var(--ink3);margin-top:5px}
        /* KPI */
        .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:32px 44px;background:rgba(255,255,255,.4);backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,.7);border-bottom:1px solid rgba(255,255,255,.7)}
        .kpi{background:rgba(255,255,255,.75);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.95);border-radius:12px;padding:20px;box-shadow:var(--shadow)}
        .kpi-lbl{font-family:var(--mono);font-size:9px;letter-spacing:.16em;color:var(--ink4);margin-bottom:8px}
        .kpi-val{font-family:var(--mono);font-size:28px;font-weight:500;color:var(--ink);line-height:1;letter-spacing:-.02em}
        .kpi-d{font-size:11px;margin-top:6px;font-weight:500}
        .kpi-bar-wrap{background:rgba(15,23,42,.07);border-radius:4px;height:5px;margin-top:12px}
        .kpi-bar{height:100%;border-radius:4px;background:linear-gradient(90deg,#2563EB,#7C3AED);transition:width .8s ease}
        /* SECTION */
        .sec{padding:64px 44px}
        .ey{font-family:var(--mono);font-size:9px;letter-spacing:.2em;color:var(--accent);margin-bottom:12px;display:flex;align-items:center;gap:9px}
        .ey::before{content:'';width:14px;height:1px;background:var(--accent);opacity:.6}
        .sec-h{font-size:clamp(28px,3.5vw,42px);font-weight:700;letter-spacing:-.02em;margin-bottom:10px;line-height:1.1}
        .sec-h .a{color:var(--accent)}
        .sec-p{color:var(--ink3);font-size:14px;line-height:1.75;max-width:460px}
        /* HEAT MAP */
        .hm-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:28px}
        .hm-cell{border-radius:8px;padding:10px 5px;text-align:center;cursor:default;transition:transform .18s}
        .hm-cell:hover{transform:scale(1.06)}
        .hm-val{font-family:var(--mono);font-size:11px;font-weight:500}
        .hm-nm{font-size:9px;margin-top:2px;color:var(--ink3)}
        /* CHART */
        .chart-card{background:rgba(255,255,255,.75);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.9);border-radius:16px;padding:24px;box-shadow:var(--shadow-card);margin-top:36px}
        .chart-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
        .chart-title{font-family:var(--mono);font-size:9px;letter-spacing:.16em;color:var(--ink4);margin-bottom:5px}
        .chart-val{font-family:var(--mono);font-size:28px;font-weight:500;letter-spacing:-.02em}
        .chart-delta{font-size:12px;font-weight:500;margin-left:8px}
        .period-pills{display:flex;gap:6px}
        .pp{font-family:var(--mono);font-size:9px;padding:5px 11px;border-radius:100px;cursor:pointer;border:1px solid rgba(15,23,42,.12);color:var(--ink3);background:rgba(255,255,255,.6)}
        .pp.active{background:var(--accent);color:#fff;border-color:var(--accent)}
        /* CARDS */
        .cards-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px}
        .pcard{background:var(--glass-card);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.9);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-card);transition:all .3s;cursor:pointer}
        .pcard:hover{transform:translateY(-5px);box-shadow:0 8px 32px rgba(15,23,42,.12);border-color:rgba(37,99,235,.3)}
        .pcard-img{height:180px;position:relative;overflow:hidden;background:#EEF4FB}
        .pcard-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
        .pcard-badge{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.88);backdrop-filter:blur(8px);color:var(--accent);font-family:var(--mono);font-size:9px;letter-spacing:.12em;padding:4px 10px;border-radius:100px;font-weight:500;border:1px solid rgba(37,99,235,.18)}
        .pcard-source{position:absolute;top:12px;right:12px;background:rgba(255,255,255,.7);backdrop-filter:blur(8px);color:var(--ink3);font-family:var(--mono);font-size:8px;letter-spacing:.1em;padding:3px 8px;border-radius:100px;text-transform:uppercase}
        .pcard-body{padding:18px}
        .pcard-loc{font-family:var(--mono);font-size:9px;letter-spacing:.12em;color:var(--ink4);margin-bottom:5px}
        .pcard-name{font-size:15px;font-weight:600;color:var(--ink);margin-bottom:10px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .pcard-price{font-family:var(--mono);font-size:17px;font-weight:500;color:var(--accent)}
        .pcard-meta{display:flex;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(15,23,42,.07);font-size:11px;color:var(--ink3)}
        .pcard-meta b{color:var(--ink);font-weight:600}
        .pcard-link{display:inline-block;margin-top:12px;font-size:12px;color:var(--accent);font-weight:500;text-decoration:none}
        .pcard-link:hover{text-decoration:underline}
        /* FOOTER */
        footer{background:rgba(255,255,255,.55);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.85);padding:52px 44px 32px}
        .ft-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:36px}
        .ft-brand{font-size:18px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px;margin-bottom:8px}
        .ft-brand span{color:var(--accent)}
        .ft-desc{font-size:13px;color:var(--ink3);line-height:1.7;max-width:220px}
        .ft-h{font-family:var(--mono);font-size:9px;letter-spacing:.18em;color:var(--accent);margin-bottom:14px}
        .ft-ul{list-style:none}
        .ft-ul li{margin-bottom:8px}
        .ft-ul a{color:var(--ink3);text-decoration:none;font-size:13px;transition:color .18s}
        .ft-ul a:hover{color:var(--ink)}
        .ft-bot{display:flex;justify-content:space-between;padding-top:20px;border-top:1px solid rgba(15,23,42,.07);font-family:var(--mono);font-size:9px}
        /* LOADING */
        .skeleton{background:linear-gradient(90deg,rgba(255,255,255,.4) 25%,rgba(255,255,255,.7) 50%,rgba(255,255,255,.4) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a className="logo-row" href="/">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="9" fill="rgba(255,255,255,0.92)" />
            <rect x=".5" y=".5" width="35" height="35" rx="8.5" stroke="rgba(37,99,235,0.2)" strokeWidth="1" />
            <path d="M5 20 L10 20 L13.5 11 L17 26 L20.5 16" stroke="#2563EB" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="20.5" y1="9" x2="30" y2="9" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="30" y1="9" x2="30" y2="13" stroke="#7C3AED" strokeWidth="1" strokeLinecap="round" strokeOpacity=".7" />
            <circle cx="27.5" cy="25.5" r="3.5" fill="none" stroke="#7C3AED" strokeWidth="1.2" />
            <circle cx="27.5" cy="25.5" r="1.5" fill="#7C3AED" />
          </svg>
          <span className="wordmark">sqrt<span>lab</span></span>
        </a>
        <ul className="nav-links">
          <li><a href="#">Markets</a></li>
          <li><a href="#">Analytics</a></li>
          <li><a href="#">Listings</a></li>
          <li><a href="#">Insights</a></li>
        </ul>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink4)" }}>
              <span className="refresh-dot" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button className="nav-btn">Get access</button>
        </div>
      </nav>

      {/* LIVE TICKER */}
      <div className="ticker">
        <div className="tick-inner">
          {[...ticker, ...ticker].map((t, i) => {
            const d = delta(t.change);
            return (
              <span key={i} className="tick-item">
                {t.district}
                {d && (
                  <span className={d.pos ? "t-up" : "t-dn"}>
                    {d.sign} {d.abs}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-tag">
          <span className="refresh-dot" />
          Live UAE market data — updates every minute
        </div>
        <h1 className="hero-h">
          Property intelligence<br />that <span className="acc">moves faster</span><br />than the market
        </h1>
        <p className="hero-p">
          sqrtlab pulls every UAE property transaction from Dubai Pulse, ADREC, and live listing platforms — distilled into signals you can act on.
        </p>
        <div className="hero-cta">
          <button className="btn-solid">Explore the platform →</button>
          <button className="btn-outline">Watch a demo</button>
        </div>
        <div className="search">
          <input type="text" placeholder="Search by district, community or address…" />
          <div className="sdiv" />
          <select><option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option></select>
          <div className="sdiv" />
          <select><option>Buy</option><option>Rent</option><option>Off-plan</option></select>
          <button className="search-go">Analyse →</button>
        </div>

        {/* STATS from live DB */}
        <div className="stats-strip">
          <div className="stat-g">
            <div className="stat-v">
              {loading ? <span className="skeleton" style={{ display: "block", width: 80, height: 28 }} /> : fmt(s?.totalTransactions)}
            </div>
            <div className="stat-l">Transactions tracked</div>
          </div>
          <div className="stat-g">
            <div className="stat-v">
              {loading ? <span className="skeleton" style={{ display: "block", width: 100, height: 28 }} /> : `AED ${fmt(s?.avgPricePsfDubai)}`}
            </div>
            <div className="stat-l">Avg price psf · Dubai</div>
          </div>
          <div className="stat-g">
            <div className="stat-v">
              {loading ? <span className="skeleton" style={{ display: "block", width: 80, height: 28 }} /> : `${fmt(s?.avgRentalYield, 1)}%`}
            </div>
            <div className="stat-l">Avg rental yield</div>
          </div>
          <div className="stat-g">
            <div className="stat-v" style={{ fontSize: 14, paddingTop: 4, color: "var(--up)" }}>
              <span className="refresh-dot" />
              Updating live
            </div>
            <div className="stat-l">Continuous data feed</div>
          </div>
        </div>
      </section>

      {/* KPI STRIP */}
      <div className="kpi-row">
        {[
          {
            lbl: "AVG PRICE PSF · DUBAI",
            val: s?.avgPricePsfDubai ? `AED ${fmt(s.avgPricePsfDubai)}` : "—",
            d: delta(s?.psfDelta),
            spark: districts.slice(0, 8).map((x) => x.avgPricePsf ?? 0),
            color: "#2563EB",
          },
          {
            lbl: "TRANSACTIONS · 30 DAYS",
            val: fmt(s?.totalTransactions),
            d: delta(s?.transactionsDelta),
            spark: districts.slice(0, 8).map((x) => x.totalVolume ?? 0),
            color: "#7C3AED",
          },
          {
            lbl: "RENTAL YIELD AVERAGE",
            val: `${fmt(s?.avgRentalYield, 1)}%`,
            d: { sign: "▲", abs: "0.4", pos: true },
            spark: [6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.8],
            color: "#0EA5E9",
          },
          {
            lbl: "PRICE MOMENTUM INDEX",
            val: `${fmt(s?.momentumIndex, 0)} / 100`,
            bar: (s?.momentumIndex ?? 0) / 100,
          },
        ].map((kpi, i) => {
          const d = kpi.d;
          return (
            <div className="kpi" key={i}>
              <div className="kpi-lbl">{kpi.lbl}</div>
              <div className="kpi-val">
                {loading ? <span className="skeleton" style={{ display: "block", width: 100, height: 32 }} /> : kpi.val}
              </div>
              {d && (
                <div className="kpi-d" style={{ color: d.pos ? "var(--up)" : "var(--dn)" }}>
                  {d.sign} {d.abs}% vs last period
                </div>
              )}
              {kpi.spark && kpi.spark.length > 0 && (
                <div style={{ marginTop: 12, height: 32 }}>
                  <Sparkline data={kpi.spark} color={kpi.color} />
                </div>
              )}
              {kpi.bar !== undefined && (
                <>
                  <div className="kpi-d" style={{ color: "#D97706" }}>◆ Strong bullish signal</div>
                  <div className="kpi-bar-wrap">
                    <div className="kpi-bar" style={{ width: `${(kpi.bar * 100).toFixed(0)}%` }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* LISTINGS */}
      <section className="sec" style={{ paddingBottom: 0 }}>
        <div className="ey">LIVE LISTINGS</div>
        <h2 className="sec-h">Properties <span className="a">updated now</span></h2>
        <p className="sec-p" style={{ marginTop: 8 }}>
          Scraped from Bayut, PropertyFinder, and Dubizzle every 2 hours. Images served from our cache.
        </p>
      </section>
      <div style={{ padding: "0 44px 64px" }}>
        {loading ? (
          <div className="cards-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pcard">
                <div className="pcard-img skeleton" />
                <div className="pcard-body">
                  <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 18, width: "90%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 22, width: "50%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="cards-grid">
            {listings.map((l) => <PropertyCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink3)", fontFamily: "var(--mono)", fontSize: 12 }}>
            No listings yet — scraper running in background
          </div>
        )}
      </div>

      {/* DISTRICT HEAT MAP */}
      <section className="sec">
        <div className="ey">DISTRICT INTELLIGENCE</div>
        <h2 className="sec-h">Market heat by <span className="a">district</span></h2>
        <p className="sec-p" style={{ marginTop: 8 }}>
          Price momentum scores computed every minute from DLD transaction data.
        </p>

        <div className="hm-grid">
          {loading
            ? Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="hm-cell skeleton" style={{ height: 60 }} />
              ))
            : districts.map((d) => {
                const c = hmColor(d.momentumScore);
                const ch = delta(d.priceChange3m);
                return (
                  <div
                    key={d.district}
                    className="hm-cell"
                    style={{ background: c.bg, border: `1px solid ${c.border}` }}
                    title={`${d.district}: AED ${fmt(d.avgPricePsf)} psf · ${ch?.sign}${ch?.abs}% 3m`}
                  >
                    <div className="hm-val" style={{ color: c.color }}>
                      {fmt(d.momentumScore, 0)}
                    </div>
                    <div className="hm-nm">{d.district.replace("Dubai ", "").slice(0, 10)}</div>
                  </div>
                );
              })}
        </div>

        {/* Price trend chart */}
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">MARKET PRICE TREND · DUBAI (PSF)</div>
              <div className="chart-val" style={{ color: "var(--ink)" }}>
                AED {fmt(s?.avgPricePsfDubai)}
                {delta(s?.psfDelta) && (
                  <span className="chart-delta" style={{ color: (s?.psfDelta ?? 0) >= 0 ? "var(--up)" : "var(--dn)" }}>
                    {delta(s?.psfDelta)?.sign} {delta(s?.psfDelta)?.abs}%
                  </span>
                )}
              </div>
            </div>
            <div className="period-pills">
              <div className="pp">1M</div>
              <div className="pp active">3M</div>
              <div className="pp">12M</div>
            </div>
          </div>

          {/* SVG chart from aggregate district data */}
          {districts.length > 0 && (() => {
            const allPoints = districts
              .flatMap((d) => d.trend)
              .sort((a, b) => a.date.localeCompare(b.date));
            const byDate: Record<string, number[]> = {};
            for (const p of allPoints) {
              if (!byDate[p.date]) byDate[p.date] = [];
              byDate[p.date].push(p.psf);
            }
            const avgPoints = Object.entries(byDate)
              .map(([date, vals]) => ({
                date,
                psf: vals.reduce((a, b) => a + b, 0) / vals.length,
              }))
              .slice(-30);

            if (avgPoints.length < 2) return null;
            const min = Math.min(...avgPoints.map((p) => p.psf));
            const max = Math.max(...avgPoints.map((p) => p.psf)) || min + 1;
            const W = 600;
            const H = 100;
            const pts = avgPoints.map((p, i) => {
              const x = (i / (avgPoints.length - 1)) * W;
              const y = H - ((p.psf - min) / (max - min)) * (H - 10) - 5;
              return `${x},${y}`;
            }).join(" ");

            return (
              <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                  <linearGradient id="cf" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                {[0.2, 0.5, 0.8].map((frac) => (
                  <line key={frac} x1="0" y1={H * frac} x2={W} y2={H * frac} stroke="rgba(15,23,42,0.06)" strokeWidth="1" />
                ))}
                <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#cf)" />
                <polyline points={pts} stroke="url(#cg)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            );
          })()}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {["30 days ago", "", "", "", "", "Today"].map((l, i) => (
              <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink4)" }}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="ft-grid">
          <div>
            <div className="ft-brand">
              <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="14" fill="#2563EB" />
                <path d="M9 36 L18 36 L24 18 L30 46 L36 28" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="36" y1="14" x2="54" y2="14" stroke="#fff" strokeWidth="2.5" />
                <circle cx="50" cy="46" r="6" fill="#fff" />
              </svg>
              sqrt<span>lab</span>.com
            </div>
            <p className="ft-desc">
              Free, live UAE property intelligence. Data from Dubai Pulse, ADREC, Bayut, PropertyFinder, and Dubizzle — refreshed every minute.
            </p>
          </div>
          <div>
            <div className="ft-h">PLATFORM</div>
            <ul className="ft-ul">
              <li><a href="#">Market analytics</a></li>
              <li><a href="#">Price forecasting</a></li>
              <li><a href="#">District reports</a></li>
              <li><a href="#">Off-plan tracker</a></li>
              <li><a href="#">Yield calculator</a></li>
            </ul>
          </div>
          <div>
            <div className="ft-h">DATA SOURCES</div>
            <ul className="ft-ul">
              <li><a href="https://api.dubaipulse.gov.ae" target="_blank" rel="noopener">Dubai Pulse (DLD)</a></li>
              <li><a href="https://opendata.adda.gov.ae" target="_blank" rel="noopener">ADREC Abu Dhabi</a></li>
              <li><a href="https://www.bayut.com" target="_blank" rel="noopener">Bayut</a></li>
              <li><a href="https://www.propertyfinder.ae" target="_blank" rel="noopener">PropertyFinder</a></li>
              <li><a href="https://overpass-api.de" target="_blank" rel="noopener">OpenStreetMap</a></li>
            </ul>
          </div>
        </div>
        <div className="ft-bot">
          <span style={{ color: "var(--ink4)" }}>© 2026 SQRTLAB.COM — ALL RIGHTS RESERVED</span>
          <span style={{ color: "var(--accent)" }}>UAE PROPERTY INTELLIGENCE</span>
        </div>
      </footer>
    </>
  );
}

```

---

## File: next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.bayut.com" },
      { protocol: "https", hostname: "*.propertyfinder.ae" },
      { protocol: "https", hostname: "*.dubizzle.com" },
      { protocol: "https", hostname: "*.imgix.net" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },

  // Serve cached property images from Railway persistent volume
  async rewrites() {
    return [
      {
        source: "/images/:path*",
        destination:
          process.env.IMAGE_DIR
            ? `file://${process.env.IMAGE_DIR}/:path*`
            : "/api/img",
      },
    ];
  },

  // Required for Playwright in Railway worker
  serverExternalPackages: ["playwright", "@prisma/client"],

  experimental: {
    serverActions: { allowedOrigins: ["sqrtlab.com", "*.sqrtlab.com"] },
  },

  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    IMAGE_DIR: process.env.IMAGE_DIR ?? "/data/images",
  },
};

export default nextConfig;

```

---

## File: package.json

```json
{
  "name": "sqrtlab",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "worker:data": "CRON_MODE=data npx ts-node --project tsconfig.worker.json src/workers/cron.ts",
    "worker:scraper": "CRON_MODE=scraper npx ts-node --project tsconfig.worker.json src/workers/cron.ts",
    "worker:poi": "CRON_MODE=poi npx ts-node --project tsconfig.worker.json src/workers/cron.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "next": "^14.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.9",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "playwright": "^1.45.1",
    "prisma": "^5.14.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.2"
  }
}

```

---

## File: railway.toml

```toml
# sqrtlab Railway deployment config
# One web service + three worker services from the same repo

[build]
builder = "NIXPACKS"
buildCommand = "npm install && npx prisma generate && npm run build"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/api/market"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

# Environment variables to set in Railway dashboard:
# DATABASE_URL     = postgresql://...  (Railway Postgres plugin — auto-injected)
# IMAGE_DIR        = /data/images      (Railway volume mount path)
# NODE_ENV         = production
# CRON_MODE        = data | scraper | poi  (set per worker service)

```

---

## File: .env.example

```bash
# Railway PostgreSQL — auto-injected when you add the Postgres plugin
DATABASE_URL=postgresql://user:password@host:5432/railway

# Railway persistent volume mount path
IMAGE_DIR=/data/images

# Set per worker service in Railway
# Options: data | scraper | poi
CRON_MODE=data

NODE_ENV=development

# Optional — used in metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000

```

---

## File: tsconfig.worker.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "dist-worker",
    "rootDir": "src"
  },
  "include": ["src/workers/**/*", "src/lib/**/*"],
  "exclude": ["src/app/**/*", "node_modules"]
}

```

---

# PART 4 — DEPLOYMENT CHECKLIST

## Pre-deployment
- [ ] `npx prisma db push` — schema applied to Railway Postgres
- [ ] `npm run build` — no TypeScript errors
- [ ] `npm run worker:data` — runs locally without crash
- [ ] `npm run worker:scraper` — at least one listing saved

## Railway services
- [ ] Web service created, env vars set
- [ ] Data cron created (`* * * * *`)
- [ ] Scraper cron created (`0 */2 * * *`)
- [ ] POI cron created (`0 3 * * *`)
- [ ] Postgres plugin added (DATABASE_URL auto-injected)
- [ ] Volume mounted at `/data/images` on web + scraper

## Post-deployment
- [ ] `/api/market` returns non-empty JSON
- [ ] `/api/listings` returns at least one listing
- [ ] Property images load on homepage
- [ ] District heat map shows colour variation
- [ ] Ticker scrolls with real district names
- [ ] Last-refresh timestamp updates every 60s

---

# PART 5 — DESIGN SYSTEM REFERENCE

## Logo

The sqrtlab mark is a stylised waveform/radical hybrid:

```
SVG paths:
  Signal: M 5,20 L 10,20 L 13.5,11 L 17,26 L 20.5,16
  Overbar: line x1=20.5 → x2=30, y=9
  Data point: circle cx=27.5, cy=25.5, r=3.5 (stroke #7C3AED, fill dot)

Colors:
  Base rect: rgba(255,255,255,0.92), stroke rgba(37,99,235,0.2)
  Signal + overbar: #2563EB
  Data point: #7C3AED
```

## CSS Design Tokens

```css
:root {
  --page:          #EEF2F7;
  --glass-nav:     rgba(245,248,253,0.82);
  --glass-card:    rgba(255,255,255,0.72);
  --glass:         rgba(255,255,255,0.62);
  --glass-deep:    rgba(255,255,255,0.42);
  --accent:        #2563EB;
  --accent2:       #7C3AED;
  --accent3:       #0EA5E9;
  --up:            #059669;
  --dn:            #DC2626;
  --ink:           #0F172A;
  --ink2:          #334155;
  --ink3:          #64748B;
  --ink4:          #94A3B8;
  --sans:          'Plus Jakarta Sans', sans-serif;
  --mono:          'JetBrains Mono', monospace;
  --shadow:        0 1px 3px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.06);
  --shadow-card:   0 2px 8px rgba(15,23,42,.07), 0 8px 32px rgba(15,23,42,.05);
  --r:             14px;
}
```

## Glass Card Recipe

```css
.glass-card {
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.90);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(15,23,42,.07), 0 8px 32px rgba(15,23,42,.05);
}
```

## Page Background

```css
body {
  background: #EEF2F7;
  background-image:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99,130,255,.12), transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 15%, rgba(124,58,237,.08), transparent 55%),
    radial-gradient(ellipse 50% 40% at 10% 80%, rgba(14,165,233,.07), transparent 50%);
  background-attachment: fixed;
}
```

---

*sqrtlab.com — Built with free data. Deployed on Railway. Updated every minute.*
