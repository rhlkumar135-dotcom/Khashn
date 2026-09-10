import { Hono } from 'hono'
import { prisma } from './src/lib/db'

const app = new Hono()

// ─── Communities ──────────────────────────────────────────────────────────────

app.get('/khashn/communities', async (c) => {
  const emirate = c.req.query('emirate')
  const search = c.req.query('search')
  const where: Record<string, unknown> = {}
  if (emirate && emirate !== 'all') where.emirate = emirate
  if (search) where.nameEn = { contains: search }

  const communities = await prisma.community.findMany({
    where,
    orderBy: { medianAedSqft: 'desc' },
    select: {
      id: true, slug: true, nameEn: true, nameAr: true, emirate: true,
      latitude: true, longitude: true, medianAedSqft: true, medianAnnualRentAed: true,
      grossYieldPct: true, neighbourhoodScore: true, priceChange30d: true,
      priceChange1y: true, transactionCount30d: true, totalTransactions: true,
      scoreSchools: true, scoreHealthcare: true, scoreMetro: true,
      scoreRetail: true, scoreParks: true, scoreWorship: true,
    },
  })
  return c.json({ communities })
})

app.get('/khashn/communities/:slug', async (c) => {
  const slug = c.req.param('slug')
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      listings: { where: { purpose: 'sale' }, orderBy: { listedAt: 'desc' }, take: 10 },
      _count: { select: { transactions: true, listings: true } },
    },
  })
  if (!community) return c.json({ error: 'Community not found' }, 404)
  return c.json({ community })
})

app.get('/khashn/communities/:slug/transactions', async (c) => {
  const slug = c.req.param('slug')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const propertyType = c.req.query('type')
  const beds = c.req.query('beds')

  const community = await prisma.community.findUnique({ where: { slug } })
  if (!community) return c.json({ error: 'Community not found' }, 404)

  const where: Record<string, unknown> = { communityId: community.id }
  if (propertyType) where.propertyType = propertyType
  if (beds) where.beds = parseInt(beds)

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return c.json({ transactions, total, page, limit, pages: Math.ceil(total / limit) })
})

app.get('/khashn/communities/:slug/listings', async (c) => {
  const slug = c.req.param('slug')
  const purpose = c.req.query('purpose') || 'sale'
  const beds = c.req.query('beds')
  const dealsOnly = c.req.query('deals') === 'true'

  const community = await prisma.community.findUnique({ where: { slug } })
  if (!community) return c.json({ error: 'Community not found' }, 404)

  const where: Record<string, unknown> = { communityId: community.id, purpose }
  if (beds) where.beds = parseInt(beds)
  if (dealsOnly) where.isDeal = true

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { listedAt: 'desc' },
    take: 50,
  })
  return c.json({ listings })
})

// ─── Price trend (simulated monthly data) ────────────────────────────────────

app.get('/khashn/communities/:slug/trend', async (c) => {
  const slug = c.req.param('slug')
  const period = c.req.query('period') || '12m'
  const community = await prisma.community.findUnique({ where: { slug } })
  if (!community) return c.json({ error: 'Community not found' }, 404)

  const months = period === '5y' ? 60 : 12
  const trend = []
  const basePrice = community.medianAedSqft
  const monthlyGrowth = community.priceChange1y / 100 / 12

  for (let i = months; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const noise = 0.97 + Math.random() * 0.06
    const price = Math.round(basePrice * (1 - monthlyGrowth * i) * noise)
    trend.push({
      date: date.toISOString().substring(0, 7),
      medianPrice: price,
      volume: Math.floor(50 + Math.random() * 200),
    })
  }
  return c.json({ trend, period })
})

// ─── Yield Calculator ────────────────────────────────────────────────────────

app.post('/khashn/yield/calculate', async (c) => {
  const body = await c.req.json()
  const { purchasePrice, annualRent, serviceCharge, mortgageEnabled, mortgageRate, mortgageTerm, downPaymentPct } = body

  const grossYield = (annualRent / purchasePrice) * 100
  const dldFee = purchasePrice * 0.04
  const netYield = ((annualRent - serviceCharge - dldFee * 0.02) / purchasePrice) * 100
  const monthlyCashFlow = (annualRent - serviceCharge) / 12

  let emi = 0, totalMortgageCost = 0, totalInterest = 0
  if (mortgageEnabled && mortgageRate > 0) {
    const loanAmount = purchasePrice * (1 - downPaymentPct / 100)
    const monthlyRate = mortgageRate / 100 / 12
    const months = mortgageTerm * 12
    emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
    totalMortgageCost = emi * months
    totalInterest = totalMortgageCost - loanAmount
  }

  const breakEvenMonths = monthlyCashFlow > 0 ? Math.ceil((purchasePrice * 0.04) / monthlyCashFlow) : Infinity
  const annualCashFlow = annualRent - serviceCharge - emi * 12

  // 5-year projection (conservative: 0% price growth)
  const fiveYearReturn = (annualRent * 5 - serviceCharge * 5 - totalInterest) / purchasePrice * 100

  return c.json({
    grossYield: Math.round(grossYield * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualCashFlow: Math.round(annualCashFlow),
    emi: Math.round(emi),
    totalMortgageCost: Math.round(totalMortgageCost),
    totalInterest: Math.round(totalInterest),
    breakEvenMonths,
    fiveYearReturn: Math.round(fiveYearReturn * 100) / 100,
    dldFee: Math.round(dldFee),
  })
})

// ─── Mortgage Simulator ──────────────────────────────────────────────────────

app.post('/khashn/mortgage/simulate', async (c) => {
  const body = await c.req.json()
  const { price, downPaymentPct, ratePct, termYears } = body

  const downPayment = price * (downPaymentPct / 100)
  const loanAmount = price - downPayment
  const monthlyRate = ratePct / 100 / 12
  const months = termYears * 12
  const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
  const totalPayment = emi * months
  const totalInterest = totalPayment - loanAmount

  // Amortization first 5 years
  const amortization = []
  let balance = loanAmount
  for (let year = 1; year <= Math.min(termYears, 5); year++) {
    let yearInterest = 0, yearPrincipal = 0
    for (let m = 0; m < 12; m++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = emi - interestPayment
      yearInterest += interestPayment
      yearPrincipal += principalPayment
      balance -= principalPayment
    }
    amortization.push({
      year,
      principalPaid: Math.round(yearPrincipal),
      interestPaid: Math.round(yearInterest),
      remainingBalance: Math.round(Math.max(0, balance)),
    })
  }

  return c.json({
    emi: Math.round(emi),
    downPayment: Math.round(downPayment),
    loanAmount: Math.round(loanAmount),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest),
    amortization,
    // Indicative bank rates
    bankRates: [
      { bank: 'ADCB', rate: ratePct - 0.15, type: 'Variable' },
      { bank: 'Emirates NBD', rate: ratePct, type: 'Variable' },
      { bank: 'FAB', rate: ratePct - 0.10, type: 'Variable' },
      { bank: 'HSBC UAE', rate: ratePct + 0.05, type: 'Fixed 3yr' },
      { bank: 'Mashreq', rate: ratePct - 0.05, type: 'Variable' },
    ],
  })
})

// ─── Exchange Rates ──────────────────────────────────────────────────────────

app.get('/khashn/rates/exchange', (c) => {
  return c.json({
    AED_INR: 22.68,
    AED_USD: 0.2723,
    AED_GBP: 0.2145,
    updatedAt: new Date().toISOString(),
  })
})

// ─── Portfolio ───────────────────────────────────────────────────────────────

const DEMO_USER_ID = 'cmtv5baxv0000pdjjbobt1ojr'

app.get('/khashn/portfolio', async (c) => {
  const items = await prisma.portfolio.findMany({
    where: { userId: DEMO_USER_ID },
    include: { community: { select: { nameEn: true, slug: true, medianAedSqft: true, grossYieldPct: true } } },
  })

  const totalValue = items.reduce((s, i) => s + i.currentValue, 0)
  const totalCost = items.reduce((s, i) => s + i.purchasePrice, 0)
  const totalGainLoss = totalValue - totalCost
  const totalAnnualRent = items.reduce((s, i) => s + i.annualRent, 0)
  const weightedYield = totalValue > 0 ? (totalAnnualRent / totalValue) * 100 : 0
  const monthlyCashFlow = items.reduce((s, i) => s + (i.annualRent - i.serviceCharge) / 12 - i.mortgageBalance * (i.mortgageRate / 100 / 12), 0)

  return c.json({
    items,
    summary: {
      totalValue: Math.round(totalValue),
      totalCost: Math.round(totalCost),
      totalGainLoss: Math.round(totalGainLoss),
      gainLossPct: Math.round((totalGainLoss / totalCost) * 10000) / 100,
      totalAnnualRent: Math.round(totalAnnualRent),
      weightedYield: Math.round(weightedYield * 100) / 100,
      monthlyCashFlow: Math.round(monthlyCashFlow),
      propertyCount: items.length,
    },
  })
})

// ─── Watchlist ───────────────────────────────────────────────────────────────

app.get('/khashn/watchlist', async (c) => {
  const items = await prisma.watchlist.findMany({
    where: { userId: DEMO_USER_ID },
    include: { community: true },
    orderBy: { addedAt: 'desc' },
  })
  return c.json({ items })
})

// ─── Deals ───────────────────────────────────────────────────────────────────

app.get('/khashn/deals', async (c) => {
  const deals = await prisma.listing.findMany({
    where: { isDeal: true, purpose: 'sale' },
    include: { community: { select: { nameEn: true, slug: true, medianAedSqft: true } } },
    orderBy: { listedAt: 'desc' },
    take: 30,
  })
  return c.json({ deals })
})

// ─── Listings search ─────────────────────────────────────────────────────────

app.get('/khashn/listings', async (c) => {
  const purpose = c.req.query('purpose') || 'sale'
  const emirate = c.req.query('emirate')
  const beds = c.req.query('beds')
  const propertyType = c.req.query('type')
  const dealsOnly = c.req.query('deals') === 'true'
  const priceMin = c.req.query('priceMin')
  const priceMax = c.req.query('priceMax')
  const page = parseInt(c.req.query('page') || '1')
  const limit = 20

  const where: Record<string, unknown> = { purpose }
  if (dealsOnly) where.isDeal = true
  if (beds) where.beds = parseInt(beds)
  if (propertyType) where.propertyType = propertyType
  if (priceMin || priceMax) {
    where.priceAed = {}
    if (priceMin) (where.priceAed as Record<string, number>).gte = parseInt(priceMin)
    if (priceMax) (where.priceAed as Record<string, number>).lte = parseInt(priceMax)
  }
  if (emirate && emirate !== 'all') {
    where.community = { emirate }
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: { community: { select: { nameEn: true, slug: true, emirate: true, medianAedSqft: true } } },
      orderBy: { listedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ])

  return c.json({ listings, total, page, pages: Math.ceil(total / limit) })
})

// ─── Alerts ──────────────────────────────────────────────────────────────────

app.get('/khashn/alerts', async (c) => {
  const alerts = await prisma.alert.findMany({
    where: { userId: DEMO_USER_ID },
    include: { community: { select: { nameEn: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return c.json({ alerts })
})

// ─── Stats for dashboard ─────────────────────────────────────────────────────

app.get('/khashn/stats', async (c) => {
  const [communityCount, transactionCount, listingCount, dealCount] = await Promise.all([
    prisma.community.count(),
    prisma.transaction.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { isDeal: true } }),
  ])

  const topCommunities = await prisma.community.findMany({
    orderBy: { priceChange30d: 'desc' },
    take: 5,
    select: { nameEn: true, slug: true, priceChange30d: true, medianAedSqft: true },
  })

  return c.json({ communityCount, transactionCount, listingCount, dealCount, topCommunities })
})

export default app
