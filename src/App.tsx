import { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { MapPin, TrendingUp, TrendingDown, Search, Filter, Star, Bell, Briefcase, BarChart3, Home, Calculator, AlertTriangle, ChevronRight, ChevronDown, ArrowUpRight, ArrowDownRight, DollarSign, Building, Eye, Bookmark, Shield, Zap, Crown, Lock, Menu, X, Globe, Users, Target, IndianRupee } from 'lucide-react'
import { cn } from '@/lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Community {
  id: string; slug: string; nameEn: string; nameAr?: string; emirate: string
  latitude: number; longitude: number; medianAedSqft: number; medianAnnualRentAed: number
  grossYieldPct: number; neighbourhoodScore: number; priceChange30d: number
  priceChange1y: number; transactionCount30d: number; totalTransactions: number
  scoreSchools: number; scoreHealthcare: number; scoreMetro: number
  scoreRetail: number; scoreParks: number; scoreWorship: number
}

interface Listing {
  id: string; source: string; communityId: string; purpose: string; propertyType: string
  beds: number; baths: number; areaSqft: number; priceAed: number; pricePerSqft: number
  furnished: string; completion: string; agentName?: string; agencyName?: string
  isDeal: boolean; title?: string; listedAt: string
  community?: { nameEn: string; slug: string; medianAedSqft: number }
}

interface Transaction {
  id: string; dldId: string; transactionType: string; propertyType: string
  beds: number; areaSqft: number; priceAed: number; pricePerSqft: number
  transactionDate: string
}

interface PortfolioItem {
  id: string; title: string; propertyType: string; beds: number; areaSqft: number
  purchasePrice: number; purchaseDate: string; currentValue: number; annualRent: number
  serviceCharge: number; mortgageBalance: number
  community: { nameEn: string; slug: string; medianAedSqft: number; grossYieldPct: number }
}

interface Alert {
  id: string; alertType: string; thresholdPct: number; yieldTargetPct?: number
  propertyType?: string; beds?: number
  notifyPush: boolean; notifyEmail: boolean; notifyWhatsapp: boolean; isActive: boolean
  community?: { nameEn: string; slug: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AED = (n: number) => `AED ${n.toLocaleString()}`
const INR = (n: number) => `₹${(n * 22.68).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const PCT = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
const SCORE_COLOR = (s: number) => s >= 80 ? '#0E7C6E' : s >= 60 ? '#C8A96E' : '#B91C1C'

// ─── Navigation ──────────────────────────────────────────────────────────────

type Page = 'landing' | 'dashboard' | 'community' | 'listings' | 'portfolio' | 'watchlist' | 'deals' | 'alerts' | 'pricing' | 'yield' | 'mortgage'

function Nav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const items: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Heatmap', icon: <MapPin size={18} /> },
    { id: 'listings', label: 'Listings', icon: <Building size={18} /> },
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase size={18} /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Bookmark size={18} /> },
    { id: 'deals', label: 'Deals', icon: <Zap size={18} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={18} /> },
    { id: 'yield', label: 'Yield Calc', icon: <Calculator size={18} /> },
    { id: 'mortgage', label: 'Mortgage', icon: <IndianRupee size={18} /> },
  ]

  return (
    <nav className="bg-[#0A2540]/95 backdrop-blur-md text-white sticky top-0 z-50 shadow-lg border-b border-white/5">
      <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => setPage('landing')} className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[#C8A96E] rounded-lg flex items-center justify-center font-bold text-[#0A2540] text-sm">S</div>
          <span className="text-lg font-semibold tracking-tight">sqftLab</span>
          <span className="text-[10px] text-[#C8A96E] border border-[#C8A96E]/30 rounded px-1.5 py-0.5 ml-1 hidden sm:inline">BETA</span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {items.map(i => (
            <button key={i.id} onClick={() => setPage(i.id)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
                page === i.id ? 'bg-[#C8A96E]/20 text-[#C8A96E]' : 'text-white/70 hover:text-white hover:bg-white/5')}>
              {i.icon}<span>{i.label}</span>
            </button>
          ))}
          <button onClick={() => setPage('pricing')}
            className={cn('ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors',
              page === 'pricing' ? 'border-[#C8A96E] text-[#C8A96E]' : 'border-[#C8A96E]/40 text-[#C8A96E] hover:bg-[#C8A96E]/10')}>
            <Crown size={16} /> Upgrade
          </button>
        </div>

        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0A2540] border-t border-white/10 px-4 py-3 space-y-1">
          {items.map(i => (
            <button key={i.id} onClick={() => { setPage(i.id); setMobileOpen(false) }}
              className={cn('flex items-center gap-2 w-full px-3 py-2 rounded text-sm',
                page === i.id ? 'bg-[#C8A96E]/20 text-[#C8A96E]' : 'text-white/70')}>
              {i.icon}<span>{i.label}</span>
            </button>
          ))}
          <button onClick={() => { setPage('pricing'); setMobileOpen(false) }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-[#C8A96E] border border-[#C8A96E]/30">
            <Crown size={16} /><span>Upgrade Plan</span>
          </button>
        </div>
      )}
    </nav>
  )
}

// ─── Landing Page ────────────────────────────────────────────────────────────

function Landing({ setPage }: { setPage: (p: Page) => void }) {
  const [stats, setStats] = useState<{ communityCount: number; transactionCount: number; listingCount: number } | null>(null)
  useEffect(() => { fetch('/api/sqftlab/stats').then(r => r.json()).then(setStats).catch(() => {}) }, [])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-[#0A2540] text-white">
        <div className="max-w-[1280px] mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-[#C8A96E] rounded-lg flex items-center justify-center font-bold text-[#0A2540] text-lg">S</div>
              <span className="text-sm text-[#C8A96E]/80 tracking-wider uppercase">sqftlab.com</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Dubai's property data,<br /><span className="text-[#C8A96E]">finally in one place.</span>
            </h1>
            <p className="text-lg text-white/70 mb-8 max-w-xl leading-relaxed">
              Real-time price heatmaps, AI-powered yield forecasts, deal alerts, and portfolio tracking — across every community in Dubai and Abu Dhabi.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setPage('dashboard')}
                className="bg-[#C8A96E] text-[#0A2540] px-6 py-3 rounded-lg font-semibold hover:bg-[#C8A96E]/90 transition-colors">
                Explore Heatmap →
              </button>
              <button onClick={() => setPage('pricing')}
                className="border border-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/5 transition-colors">
                View Plans
              </button>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg">
              <div>
                <div className="text-3xl font-bold text-[#C8A96E]">{stats.communityCount}</div>
                <div className="text-sm text-white/50">Communities</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#0E7C6E]">{(stats.transactionCount / 1000).toFixed(1)}K</div>
                <div className="text-sm text-white/50">Transactions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.listingCount}</div>
                <div className="text-sm text-white/50">Live Listings</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-[#0A2540] mb-12">Every data source. Zero cost.</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <MapPin className="text-[#C8A96E]" size={28} />, title: 'Price Heatmap', desc: 'Colour-graded AED/sqft across every UAE community. Click any marker for instant analytics.' },
            { icon: <TrendingUp className="text-[#0E7C6E]" size={28} />, title: 'Yield Calculator', desc: 'Gross & net yields, mortgage simulation, break-even analysis. All with INR equivalents.' },
            { icon: <Zap className="text-[#B91C1C]" size={28} />, title: 'Deal Alerts', desc: 'Below-market listings detected automatically. Get notified before everyone else.' },
            { icon: <Briefcase className="text-[#0A2540]" size={28} />, title: 'Portfolio Tracker', desc: 'Track your properties, rental income, mortgage payments, and total returns.' },
            { icon: <Shield className="text-[#0E7C6E]" size={28} />, title: 'Developer Risk', desc: 'Handover delays, RERA compliance, and community sentiment scored for every developer.' },
            { icon: <BarChart3 className="text-[#C8A96E]" size={28} />, title: 'AI Predictions', desc: '6-month forward price forecasts trained on 25+ years of DLD transaction data.' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#C9C5BB] p-6 hover:shadow-md transition-all duration-300">
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-semibold text-[#0A2540] mb-2">{f.title}</h3>
              <p className="text-sm text-[#6B6860] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="bg-[#0A2540] text-white py-20">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Start free. Upgrade when ready.</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">5 heatmap searches per day, 3 months of transaction history, and INR equivalents — completely free.</p>
          <button onClick={() => setPage('pricing')}
            className="bg-[#C8A96E] text-[#0A2540] px-8 py-3 rounded-lg font-semibold hover:bg-[#C8A96E]/90 transition-colors">
            Compare Plans →
          </button>
        </div>
      </section>
    </div>
  )
}

// ─── Heatmap (Dashboard) ─────────────────────────────────────────────────────

function HeatmapDashboard({ setPage, setSelectedCommunity }: { setPage: (p: Page) => void; setSelectedCommunity: (s: string) => void }) {
  const [communities, setCommunities] = useState<Community[]>([])
  const [emirate, setEmirate] = useState('all')
  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sqftlab/communities?emirate=${emirate}&search=${search}`)
      .then(r => r.json())
      .then(d => { setCommunities(d.communities || d.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [emirate, search])

  const getColor = (ppsf: number) => {
    const min = Math.min(...communities.map(c => c.medianAedSqft))
    const max = Math.max(...communities.map(c => c.medianAedSqft))
    const t = (ppsf - min) / (max - min || 1)
    if (t < 0.33) return '#0E7C6E'
    if (t < 0.66) return '#C8A96E'
    return '#0A2540'
  }

  const getRadius = (t30: number) => {
    const max = Math.max(...communities.map(c => c.transactionCount30d))
    return 8 + (t30 / max) * 24
  }

  // Map projection (simple mercator for UAE area)
  const latRange = { min: 24.3, max: 25.35 }
  const lngRange = { min: 54.2, max: 55.5 }
  const project = (lat: number, lng: number) => ({
    x: ((lng - lngRange.min) / (lngRange.max - lngRange.min)) * 100,
    y: (1 - (lat - latRange.min) / (latRange.max - latRange.min)) * 100,
  })

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6860]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#C9C5BB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/50 focus:border-[#C8A96E]" />
        </div>
        <div className="flex gap-1 bg-white border border-[#C9C5BB] rounded-lg p-0.5">
          {['all', 'dubai', 'abu_dhabi'].map(e => (
            <button key={e} onClick={() => setEmirate(e)}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                emirate === e ? 'bg-[#0A2540] text-white' : 'text-[#6B6860] hover:text-[#0A0A0A]')}>
              {e === 'all' ? 'All UAE' : e === 'dubai' ? 'Dubai' : 'Abu Dhabi'}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#6B6860]">{communities.length} communities</div>
      </div>

      {/* Map */}
      <div className="bg-[#0A2540] rounded-xl overflow-hidden relative" style={{ height: '500px' }}>
        {/* Background grid */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(200,169,110,0.05)" strokeWidth="0.1"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>

        {/* Community markers */}
        {communities.map(c => {
          const pos = project(c.latitude, c.longitude)
          const r = getRadius(c.transactionCount30d)
          return (
            <button key={c.id}
              onClick={() => { setSelectedCommunity(c.slug); setPage('community') }}
              onMouseEnter={() => setHovered(c)}
              onMouseLeave={() => setHovered(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 group"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <div className="rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
                style={{ width: r * 2, height: r * 2, backgroundColor: getColor(c.medianAedSqft), fontSize: r > 16 ? 9 : 7 }}>
                {c.medianAedSqft >= 1000 ? `${(c.medianAedSqft / 1000).toFixed(1)}K` : c.medianAedSqft}
              </div>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-white/80 whitespace-nowrap font-medium">
                {c.nameEn}
              </div>
            </button>
          )
        })}

        {/* Hover tooltip */}
        {hovered && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs z-20 border border-[#C9C5BB]">
            <div className="font-semibold text-[#0A2540]">{hovered.nameEn}</div>
            <div className="text-xs text-[#6B6860] capitalize">{hovered.emirate.replace('_', ' ')}</div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-lg font-bold text-[#0A2540]">{AED(hovered.medianAedSqft)}</div>
                <div className="text-[10px] text-[#6B6860]">per sqft</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#0E7C6E]">{hovered.grossYieldPct}%</div>
                <div className="text-[10px] text-[#6B6860]">gross yield</div>
              </div>
              <div>
                <div className={cn('text-sm font-semibold', hovered.priceChange30d >= 0 ? 'text-[#0E7C6E]' : 'text-[#B91C1C]')}>
                  {PCT(hovered.priceChange30d)}
                </div>
                <div className="text-[10px] text-[#6B6860]">30-day change</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0A2540]">{hovered.transactionCount30d}</div>
                <div className="text-[10px] text-[#6B6860]">txns (30d)</div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur rounded-lg p-3 text-xs text-white/80 space-y-1">
          <div className="font-medium text-white mb-1">AED/sqft</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0E7C6E]" /> Low (&lt;1.2K)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#C8A96E]" /> Medium (1.2–2.0K)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0A2540]" /> High (&gt;2.0K)</div>
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-white/60">Circle size = transaction volume</div>
          </div>
        </div>
      </div>

      {/* Top movers */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#C9C5BB] p-4">
          <h3 className="font-semibold text-[#0A2540] mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-[#0E7C6E]" /> Top Gainers (30d)</h3>
          <div className="space-y-2">
            {[...communities].sort((a, b) => b.priceChange30d - a.priceChange30d).slice(0, 5).map(c => (
              <button key={c.id} onClick={() => { setSelectedCommunity(c.slug); setPage('community') }}
                className="flex items-center justify-between w-full py-1.5 hover:bg-[#F5F0E8] rounded px-2 transition-colors">
                <span className="text-sm text-[#0A0A0A]">{c.nameEn}</span>
                <span className="text-sm font-semibold text-[#0E7C6E]">{PCT(c.priceChange30d)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#C9C5BB] p-4">
          <h3 className="font-semibold text-[#0A2540] mb-3 flex items-center gap-2"><Target size={16} className="text-[#C8A96E]" /> Highest Yield</h3>
          <div className="space-y-2">
            {[...communities].sort((a, b) => b.grossYieldPct - a.grossYieldPct).slice(0, 5).map(c => (
              <button key={c.id} onClick={() => { setSelectedCommunity(c.slug); setPage('community') }}
                className="flex items-center justify-between w-full py-1.5 hover:bg-[#F5F0E8] rounded px-2 transition-colors">
                <span className="text-sm text-[#0A0A0A]">{c.nameEn}</span>
                <span className="text-sm font-semibold text-[#0E7C6E]">{c.grossYieldPct}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Community Detail ────────────────────────────────────────────────────────

function CommunityDetail({ slug, setPage }: { slug: string; setPage: (p: Page) => void }) {
  const [community, setCommunity] = useState<Community | null>(null)
  const [trend, setTrend] = useState<{ date: string; medianPrice: number; volume: number }[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [exchange, setExchange] = useState({ AED_INR: 22.68 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/sqftlab/communities/${slug}`).then(r => r.json()),
      fetch(`/api/sqftlab/communities/${slug}/trend?period=12m`).then(r => r.json()),
      fetch(`/api/sqftlab/communities/${slug}/transactions?limit=20`).then(r => r.json()),
      fetch(`/api/sqftlab/communities/${slug}/listings?purpose=sale`).then(r => r.json()),
      fetch('/api/sqftlab/rates/exchange').then(r => r.json()),
    ]).then(([cData, tData, txData, lData, exData]) => {
      const c = cData.community || cData
      setCommunity(c)
      setTrend(tData.trend || [])
      setTransactions(txData.transactions || [])
      setListings(lData.listings || [])
      setExchange(exData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#6B6860]">Loading community data...</div>
  if (!community) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#6B6860]">Community not found</div>

  const radarData = [
    { subject: 'Schools', score: community.scoreSchools, fullMark: 10 },
    { subject: 'Healthcare', score: community.scoreHealthcare, fullMark: 10 },
    { subject: 'Metro', score: community.scoreMetro, fullMark: 10 },
    { subject: 'Retail', score: community.scoreRetail, fullMark: 10 },
    { subject: 'Parks', score: community.scoreParks, fullMark: 10 },
    { subject: 'Worship', score: community.scoreWorship, fullMark: 10 },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <button onClick={() => setPage('dashboard')} className="text-sm text-[#6B6860] hover:text-[#0A2540] mb-4 flex items-center gap-1">
        ← Back to Heatmap
      </button>

      {/* Price Summary Card */}
      <div className="bg-[#0A2540] text-white rounded-xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{community.nameEn}</h1>
              <span className="text-xs bg-[#C8A96E]/20 text-[#C8A96E] px-2 py-0.5 rounded capitalize">{community.emirate.replace('_', ' ')}</span>
            </div>
            {community.nameAr && <div className="text-sm text-white/50">{community.nameAr}</div>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#C8A96E]">{AED(community.medianAedSqft)}<span className="text-sm font-normal text-white/50"> /sqft</span></div>
            <div className="text-sm text-white/50">{INR(community.medianAedSqft)} /sqft</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-4 border-t border-white/10">
          <div>
            <div className={cn('text-xl font-bold', community.priceChange30d >= 0 ? 'text-[#0E7C6E]' : 'text-[#B91C1C]')}>
              {PCT(community.priceChange30d)}
            </div>
            <div className="text-xs text-white/50">30-day change</div>
          </div>
          <div>
            <div className={cn('text-xl font-bold', community.priceChange1y >= 0 ? 'text-[#0E7C6E]' : 'text-[#B91C1C]')}>
              {PCT(community.priceChange1y)}
            </div>
            <div className="text-xs text-white/50">1-year change</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#0E7C6E]">{community.grossYieldPct}%</div>
            <div className="text-xs text-white/50">Gross yield</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">{community.transactionCount30d}</div>
            <div className="text-xs text-white/50">Txns (30d)</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#C8A96E]">{community.neighbourhoodScore}</div>
            <div className="text-xs text-white/50">Neighbourhood score</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Charts + Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Trend Chart */}
          <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
            <h3 className="font-semibold text-[#0A2540] mb-4">Price History (12 months)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A96E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C8A96E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#C9C5BB" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B6860' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B6860' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #C9C5BB', fontSize: 12 }} />
                <Area type="monotone" dataKey="medianPrice" stroke="#C8A96E" fill="url(#priceGrad)" strokeWidth={2} name="AED/sqft" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Chart */}
          <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
            <h3 className="font-semibold text-[#0A2540] mb-4">Transaction Volume</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C9C5BB" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B6860' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6B6860' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #C9C5BB', fontSize: 12 }} />
                <Bar dataKey="volume" fill="#0A2540" radius={[2, 2, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Transaction Feed */}
          <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
            <h3 className="font-semibold text-[#0A2540] mb-4">Recent Transactions (DLD)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#C9C5BB] text-[#6B6860] text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Beds</th>
                    <th className="pb-2 font-medium text-right">Area</th>
                    <th className="pb-2 font-medium text-right">AED/sqft</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={t.id} className={cn('border-b border-[#F5F0E8] text-[#0A0A0A]', i % 2 === 0 && 'bg-[#F5F0E8]/50')}>
                      <td className="py-2">{new Date(t.transactionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      <td className="py-2 capitalize">{t.propertyType}</td>
                      <td className="py-2">{t.beds === 0 ? 'Studio' : t.beds}</td>
                      <td className="py-2 text-right">{t.areaSqft.toLocaleString()} sqft</td>
                      <td className="py-2 text-right font-medium">{AED(t.pricePerSqft)}</td>
                      <td className="py-2 text-right font-semibold">{AED(t.priceAed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Neighbourhood Score */}
          <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
            <h3 className="font-semibold text-[#0A2540] mb-2">Neighbourhood Score</h3>
            <div className="text-center mb-2">
              <span className="text-4xl font-bold" style={{ color: SCORE_COLOR(community.neighbourhoodScore) }}>{community.neighbourhoodScore}</span>
              <span className="text-sm text-[#6B6860]">/100</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#C9C5BB" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B6860' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 9 }} />
                <Radar name="Score" dataKey="score" stroke="#0A2540" fill="#0A2540" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Live Listings */}
          <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
            <h3 className="font-semibold text-[#0A2540] mb-3">Live Listings</h3>
            <div className="space-y-3">
              {listings.slice(0, 5).map(l => (
                <div key={l.id} className="py-2 border-b border-[#F5F0E8] last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-[#0A0A0A]">{l.beds}BR {l.propertyType}</div>
                      <div className="text-xs text-[#6B6860]">{l.areaSqft.toLocaleString()} sqft · {l.source}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#0A2540]">{AED(l.priceAed)}</div>
                      {l.isDeal && <span className="text-[10px] bg-[#B91C1C]/10 text-[#B91C1C] px-1.5 py-0.5 rounded font-medium">DEAL</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rental Yield */}
          <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
            <h3 className="font-semibold text-[#0A2540] mb-3">Rental Yield</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[#6B6860]">Annual Rent (median)</span>
                <span className="text-sm font-semibold">{AED(community.medianAnnualRentAed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#6B6860]">Gross Yield</span>
                <span className="text-sm font-bold text-[#0E7C6E]">{community.grossYieldPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#6B6860]">Net Yield (est.)</span>
                <span className="text-sm font-semibold text-[#0E7C6E]">{(community.grossYieldPct * 0.78).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#6B6860]">INR Equivalent</span>
                <span className="text-xs text-[#6B6860]">{INR(community.medianAnnualRentAed)}/yr</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Listings Feed ───────────────────────────────────────────────────────────

function ListingsFeed({ setPage, setSelectedCommunity }: { setPage: (p: Page) => void; setSelectedCommunity: (s: string) => void }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [purpose, setPurpose] = useState('sale')
  const [dealsOnly, setDealsOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sqftlab/listings?purpose=${purpose}${dealsOnly ? '&deals=true' : ''}`)
      .then(r => r.json())
      .then(d => { setListings(d.listings || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [purpose, dealsOnly])

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#0A2540]">Live Listings</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white border border-[#C9C5BB] rounded-lg p-0.5">
            {['sale', 'rent'].map(p => (
              <button key={p} onClick={() => setPurpose(p)}
                className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize',
                  purpose === p ? 'bg-[#0A2540] text-white' : 'text-[#6B6860]')}>
                {p}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={dealsOnly} onChange={e => setDealsOnly(e.target.checked)}
              className="rounded border-[#C9C5BB] accent-[#C8A96E]" />
            <span className="text-[#6B6860]">Deals only</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#6B6860]">Loading listings...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-[#C9C5BB] overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-[#0A2540] to-[#0E7C6E] flex items-center justify-center relative">
                <Building className="text-white/30" size={40} />
                {l.isDeal && (
                  <div className="absolute top-3 right-3 bg-[#B91C1C] text-white text-[10px] font-bold px-2 py-1 rounded">
                    DEAL · {Math.round((1 - l.pricePerSqft / (l.community?.medianAedSqft || l.pricePerSqft)) * 100)}% below median
                  </div>
                )}
                <div className="absolute bottom-3 left-3 text-white text-xs bg-black/30 rounded px-2 py-1">
                  {l.source}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-[#0A2540]">{l.beds === 0 ? 'Studio' : `${l.beds}BR`} {l.propertyType}</div>
                    <button onClick={() => { setSelectedCommunity(l.community?.slug || ''); setPage('community') }}
                      className="text-xs text-[#C8A96E] hover:underline">
                      {l.community?.nameEn || 'View community'}
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#0A2540]">{AED(l.priceAed)}</div>
                    <div className="text-[10px] text-[#6B6860]">{INR(l.priceAed)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6B6860] mt-2">
                  <span>{l.areaSqft.toLocaleString()} sqft</span>
                  <span>·</span>
                  <span>{l.baths} bath</span>
                  <span>·</span>
                  <span className="capitalize">{l.furnished}</span>
                </div>
                {l.agentName && (
                  <div className="mt-3 pt-3 border-t border-[#F5F0E8] flex items-center justify-between text-xs">
                    <span className="text-[#6B6860]">{l.agentName}</span>
                    <span className="text-[#6B6860]">{l.agencyName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

function Portfolio() {
  const [data, setData] = useState<{ items: PortfolioItem[]; summary: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sqftlab/portfolio').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#6B6860]">Loading portfolio...</div>
  if (!data) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#6B6860]">No portfolio data</div>

  const { summary, items } = data
  const pieData = items.map(i => ({ name: i.community.nameEn, value: i.currentValue }))
  const COLORS = ['#0A2540', '#C8A96E', '#0E7C6E', '#B91C1C', '#6B6860']

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#0A2540] mb-6">Portfolio</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Value', value: AED(summary.totalValue), color: 'text-[#0A2540]' },
          { label: 'Total Gain/Loss', value: `${summary.totalGainLoss >= 0 ? '+' : ''}${AED(summary.totalGainLoss)}`, color: summary.totalGainLoss >= 0 ? 'text-[#0E7C6E]' : 'text-[#B91C1C]' },
          { label: 'Weighted Yield', value: `${summary.weightedYield}%`, color: 'text-[#0E7C6E]' },
          { label: 'Monthly Cash Flow', value: AED(summary.monthlyCashFlow), color: 'text-[#0E7C6E]' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#C9C5BB] p-4">
            <div className="text-xs text-[#6B6860] mb-1">{s.label}</div>
            <div className={cn('text-xl font-bold', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Property List */}
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-[#C9C5BB] p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-[#0A2540]">{item.title}</div>
                  <button className="text-xs text-[#C8A96E] hover:underline">{item.community.nameEn}</button>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#0A2540]">{AED(item.currentValue)}</div>
                  <div className={cn('text-xs font-medium', item.currentValue >= item.purchasePrice ? 'text-[#0E7C6E]' : 'text-[#B91C1C]')}>
                    {item.currentValue >= item.purchasePrice ? '+' : ''}{AED(item.currentValue - item.purchasePrice)} ({((item.currentValue - item.purchasePrice) / item.purchasePrice * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-[#6B6860]">
                <div><span className="block font-medium text-[#0A0A0A]">{AED(item.purchasePrice)}</span> Purchase</div>
                <div><span className="block font-medium text-[#0E7C6E]">{AED(item.annualRent)}/yr</span> Annual Rent</div>
                <div><span className="block font-medium text-[#0A0A0A]">{item.beds}BR · {item.areaSqft.toLocaleString()} sqft</span> Specs</div>
              </div>
            </div>
          ))}
        </div>

        {/* Diversification Chart */}
        <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
          <h3 className="font-semibold text-[#0A2540] mb-4">Portfolio Diversification</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => AED(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Watchlist ───────────────────────────────────────────────────────────────

function Watchlist({ setPage, setSelectedCommunity }: { setPage: (p: Page) => void; setSelectedCommunity: (s: string) => void }) {
  const [items, setItems] = useState<{ community: Community; addedAt: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sqftlab/watchlist').then(r => r.json()).then(d => { setItems(d.items || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#6B6860]">Loading watchlist...</div>

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#0A2540] mb-6">Watchlist</h2>
      {items.length === 0 ? (
        <div className="text-center py-20 text-[#6B6860]">
          <Bookmark size={40} className="mx-auto mb-3 text-[#C9C5BB]" />
          <p>No communities watched yet — search the heatmap to start tracking.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(w => {
            const c = w.community
            return (
              <button key={c.id} onClick={() => { setSelectedCommunity(c.slug); setPage('community') }}
                className="bg-white rounded-xl border border-[#C9C5BB] p-5 text-left hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-[#0A2540]">{c.nameEn}</div>
                    <div className="text-xs text-[#6B6860] capitalize">{c.emirate.replace('_', ' ')}</div>
                  </div>
                  <div className={cn('text-sm font-bold', c.priceChange30d >= 0 ? 'text-[#0E7C6E]' : 'text-[#B91C1C]')}>
                    {PCT(c.priceChange30d)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#0A2540]">{AED(c.medianAedSqft)}</div>
                    <div className="text-[#6B6860]">AED/sqft</div>
                  </div>
                  <div>
                    <div className="font-bold text-[#0E7C6E]">{c.grossYieldPct}%</div>
                    <div className="text-[#6B6860]">Yield</div>
                  </div>
                  <div>
                    <div className="font-bold text-[#0A2540]">{c.transactionCount30d}</div>
                    <div className="text-[#6B6860]">Txns (30d)</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Deals ───────────────────────────────────────────────────────────────────

function Deals({ setPage, setSelectedCommunity }: { setPage: (p: Page) => void; setSelectedCommunity: (s: string) => void }) {
  const [deals, setDeals] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sqftlab/deals').then(r => r.json()).then(d => { setDeals(d.deals || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="text-[#B91C1C]" size={24} />
        <h2 className="text-2xl font-bold text-[#0A2540]">Deal Alert Feed</h2>
        <span className="text-xs bg-[#B91C1C]/10 text-[#B91C1C] px-2 py-1 rounded font-medium">{deals.length} deals</span>
      </div>
      <p className="text-sm text-[#6B6860] mb-6">Listings priced below the community median — potential investment opportunities.</p>

      {loading ? (
        <div className="text-center py-20 text-[#6B6860]">Loading deals...</div>
      ) : (
        <div className="space-y-3">
          {deals.map(d => {
            const discount = d.community?.medianAedSqft ? Math.round((1 - d.pricePerSqft / d.community.medianAedSqft) * 100) : 0
            return (
              <div key={d.id} className="bg-white rounded-xl border border-[#C9C5BB] p-4 flex flex-wrap items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-[#B91C1C]/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="text-[#B91C1C]" size={20} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0A0A0A]">{d.beds}BR {d.propertyType}</span>
                    <span className="text-xs text-[#6B6860]">{d.areaSqft.toLocaleString()} sqft</span>
                  </div>
                  <button onClick={() => { setSelectedCommunity(d.community?.slug || ''); setPage('community') }}
                    className="text-xs text-[#C8A96E] hover:underline">{d.community?.nameEn}</button>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#0A2540]">{AED(d.priceAed)}</div>
                  <div className="text-[10px] text-[#6B6860]">{AED(d.pricePerSqft)}/sqft vs {AED(d.community?.medianAedSqft || 0)} median</div>
                </div>
                <div className="bg-[#B91C1C] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  -{discount}%
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sqftlab/alerts').then(r => r.json()).then(d => { setAlerts(d.alerts || d.items || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const typeLabels: Record<string, { label: string; color: string }> = {
    below_market: { label: 'Below Market', color: 'bg-[#B91C1C]/10 text-[#B91C1C]' },
    price_drop: { label: 'Price Drop', color: 'bg-[#0E7C6E]/10 text-[#0E7C6E]' },
    new_listing: { label: 'New Listing', color: 'bg-[#0A2540]/10 text-[#0A2540]' },
    yield_target: { label: 'Yield Target', color: 'bg-[#C8A96E]/10 text-[#C8A96E]' },
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#0A2540] mb-6">Deal Alerts</h2>
      {loading ? (
        <div className="text-center py-20 text-[#6B6860]">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-[#6B6860]">
          <Bell size={40} className="mx-auto mb-3 text-[#C9C5BB]" />
          <p>No alerts configured — create one to get notified of deals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => {
            const type = typeLabels[a.alertType] || { label: a.alertType, color: 'bg-gray-100 text-gray-700' }
            return (
              <div key={a.id} className="bg-white rounded-xl border border-[#C9C5BB] p-4 flex flex-wrap items-center gap-4">
                <div className={cn('text-xs font-medium px-3 py-1.5 rounded-lg', type.color)}>{type.label}</div>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium text-[#0A0A0A]">
                    {a.community?.nameEn || 'All Communities'}
                    {a.propertyType && ` · ${a.propertyType}`}
                    {a.beds !== undefined && ` · ${a.beds}BR`}
                  </div>
                  <div className="text-xs text-[#6B6860]">
                    {a.alertType === 'yield_target' ? `Target: ${a.yieldTargetPct}% yield` : `Threshold: ${a.thresholdPct}% below median`}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6B6860]">
                  {a.notifyPush && <span className="bg-[#F5F0E8] px-2 py-1 rounded">Push</span>}
                  {a.notifyEmail && <span className="bg-[#F5F0E8] px-2 py-1 rounded">Email</span>}
                  {a.notifyWhatsapp && <span className="bg-[#0E7C6E]/10 text-[#0E7C6E] px-2 py-1 rounded">WhatsApp</span>}
                </div>
                <div className={cn('w-2 h-2 rounded-full', a.isActive ? 'bg-[#0E7C6E]' : 'bg-[#C9C5BB]')} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Yield Calculator ────────────────────────────────────────────────────────

function YieldCalculator() {
  const [form, setForm] = useState({
    purchasePrice: 2000000, annualRent: 120000, serviceCharge: 15000,
    mortgageEnabled: false, mortgageRate: 4.5, mortgageTerm: 25, downPaymentPct: 20,
  })
  const [result, setResult] = useState<Record<string, number> | null>(null)

  const calculate = useCallback(() => {
    fetch('/api/sqftlab/yield/calculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    }).then(r => r.json()).then(setResult).catch(() => {})
  }, [form])

  useEffect(() => { calculate() }, [])

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Yield Calculator</h2>
      <p className="text-sm text-[#6B6860] mb-6">Calculate gross & net yields, cash flow, and break-even for any property.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#C9C5BB] p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-[#6B6860] block mb-1">Purchase Price (AED)</label>
            <input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/50" />
            <div className="text-[10px] text-[#6B6860] mt-0.5">{INR(form.purchasePrice)}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B6860] block mb-1">Expected Annual Rent (AED)</label>
            <input type="number" value={form.annualRent} onChange={e => setForm({ ...form, annualRent: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B6860] block mb-1">Service Charge (AED/yr)</label>
            <input type="number" value={form.serviceCharge} onChange={e => setForm({ ...form, serviceCharge: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/50" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.mortgageEnabled} onChange={e => setForm({ ...form, mortgageEnabled: e.target.checked })}
              className="accent-[#C8A96E]" />
            <label className="text-sm text-[#0A0A0A]">Include Mortgage</label>
          </div>
          {form.mortgageEnabled && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#6B6860] block mb-1">Down Payment %</label>
                  <input type="number" value={form.downPaymentPct} onChange={e => setForm({ ...form, downPaymentPct: +e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[#6B6860] block mb-1">Rate %</label>
                  <input type="number" step="0.1" value={form.mortgageRate} onChange={e => setForm({ ...form, mortgageRate: +e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[#6B6860] block mb-1">Term (yrs)</label>
                  <input type="number" value={form.mortgageTerm} onChange={e => setForm({ ...form, mortgageTerm: +e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm" />
                </div>
              </div>
            </>
          )}
          <button onClick={calculate}
            className="w-full bg-[#C8A96E] text-[#0A2540] py-2.5 rounded-lg font-semibold hover:bg-[#C8A96E]/90 transition-colors">
            Calculate
          </button>
        </div>

        {result && (
          <div className="bg-[#0A2540] text-white rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-[#C8A96E] mb-3">Results</h3>
            {[
              { label: 'Gross Yield', value: `${result.grossYield}%`, color: 'text-[#0E7C6E]' },
              { label: 'Net Yield', value: `${result.netYield}%`, color: 'text-[#0E7C6E]' },
              { label: 'Monthly Cash Flow', value: AED(result.monthlyCashFlow), color: result.monthlyCashFlow >= 0 ? 'text-[#0E7C6E]' : 'text-[#B91C1C]' },
              { label: 'Annual Cash Flow', value: AED(result.annualCashFlow), color: result.annualCashFlow >= 0 ? 'text-[#0E7C6E]' : 'text-[#B91C1C]' },
              { label: 'DLD Fee (4%)', value: AED(result.dldFee), color: 'text-white/70' },
              ...(form.mortgageEnabled ? [
                { label: 'Monthly EMI', value: AED(result.emi), color: 'text-[#C8A96E]' },
                { label: 'Total Interest', value: AED(result.totalInterest), color: 'text-[#B91C1C]' },
              ] : []),
              { label: '5-Year Projected Return', value: `${result.fiveYearReturn}%`, color: 'text-[#0E7C6E]' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-white/10">
                <span className="text-sm text-white/60">{r.label}</span>
                <span className={cn('text-sm font-semibold', r.color)}>{r.value}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
              INR equivalents shown using rate: 1 AED = ₹22.68
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mortgage Simulator ──────────────────────────────────────────────────────

function MortgageSimulator() {
  const [form, setForm] = useState({ price: 2000000, downPaymentPct: 20, ratePct: 4.5, termYears: 25 })
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const simulate = useCallback(() => {
    fetch('/api/sqftlab/mortgage/simulate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    }).then(r => r.json()).then(setResult).catch(() => {})
  }, [form])

  useEffect(() => { simulate() }, [])

  const r = result as Record<string, number> | null
  const amort = (result as Record<string, unknown>)?.amortization as { year: number; principalPaid: number; interestPaid: number; remainingBalance: number }[] | undefined
  const bankRates = (result as Record<string, unknown>)?.bankRates as { bank: string; rate: number; type: string }[] | undefined

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Mortgage Simulator</h2>
      <p className="text-sm text-[#6B6860] mb-6">Estimate EMI, total cost, and compare indicative bank rates.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#C9C5BB] p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-[#6B6860] block mb-1">Property Price (AED)</label>
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96E]/50" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#6B6860] block mb-1">Down Payment %</label>
              <input type="number" value={form.downPaymentPct} onChange={e => setForm({ ...form, downPaymentPct: +e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#6B6860] block mb-1">Rate %</label>
              <input type="number" step="0.1" value={form.ratePct} onChange={e => setForm({ ...form, ratePct: +e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#6B6860] block mb-1">Term (yrs)</label>
              <input type="number" value={form.termYears} onChange={e => setForm({ ...form, termYears: +e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#C9C5BB] text-sm" />
            </div>
          </div>
          <button onClick={simulate}
            className="w-full bg-[#0A2540] text-white py-2.5 rounded-lg font-semibold hover:bg-[#0A2540]/90 transition-colors">
            Simulate
          </button>
        </div>

        {r && (
          <div className="space-y-4">
            <div className="bg-[#0A2540] text-white rounded-xl p-5">
              <div className="text-center mb-4">
                <div className="text-xs text-white/50">Monthly EMI</div>
                <div className="text-3xl font-bold text-[#C8A96E]">{AED(r.emi)}</div>
                <div className="text-xs text-white/50">{INR(r.emi)}/month</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/50 text-xs">Down Payment</div>
                  <div className="font-semibold">{AED(r.downPayment)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/50 text-xs">Loan Amount</div>
                  <div className="font-semibold">{AED(r.loanAmount)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/50 text-xs">Total Interest</div>
                  <div className="font-semibold text-[#B91C1C]">{AED(r.totalInterest)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/50 text-xs">Total Payment</div>
                  <div className="font-semibold">{AED(r.totalPayment)}</div>
                </div>
              </div>
            </div>

            {/* Bank rates comparison */}
            {bankRates && (
              <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
                <h3 className="font-semibold text-[#0A2540] mb-3 text-sm">Indicative Bank Rates</h3>
                <div className="space-y-2">
                  {bankRates.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0">
                      <span className="text-sm text-[#0A0A0A]">{b.bank}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B6860]">{b.type}</span>
                        <span className="text-sm font-semibold text-[#0A2540]">{b.rate.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#6B6860] mt-3">Indicative only. Consult a mortgage adviser for actual rates.</p>
              </div>
            )}

            {/* Amortization */}
            {amort && (
              <div className="bg-white rounded-xl border border-[#C9C5BB] p-5">
                <h3 className="font-semibold text-[#0A2540] mb-3 text-sm">Amortization (First 5 Years)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={amort}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C9C5BB" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #C9C5BB' }} formatter={(v: number) => AED(v)} />
                    <Legend />
                    <Bar dataKey="principalPaid" name="Principal" fill="#0A2540" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="interestPaid" name="Interest" fill="#C8A96E" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pricing Page ────────────────────────────────────────────────────────────

function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const tiers = [
    {
      name: 'Free', price: 0, period: '', color: 'border-[#C9C5BB]',
      features: ['5 heatmap searches/day', '3-month transaction history', '10 live listings/day', 'Basic neighbourhood score', 'INR equivalent display', '3 community watchlist'],
      cta: 'Get Started', ctaStyle: 'bg-[#0A2540] text-white',
    },
    {
      name: 'Pro', price: 49, period: '/mo', color: 'border-[#C8A96E]', badge: 'Most Popular',
      features: ['Unlimited heatmap searches', 'Full transaction history (1998–now)', 'Unlimited live listings', '12-month price charts', 'Yield calculator', 'Mortgage simulator', 'Developer risk scores', 'Off-plan tracker', '5-property portfolio', '20 community watchlist', '3 deal alerts', 'Comparable transactions', 'Visa eligibility screener'],
      cta: 'Start Pro', ctaStyle: 'bg-[#C8A96E] text-[#0A2540]',
    },
    {
      name: 'Elite', price: 149, period: '/mo', color: 'border-[#0E7C6E]',
      features: ['Everything in Pro', '5-year price charts', 'AI price predictions (6-mo)', 'Unlimited portfolio', 'Unlimited watchlist', 'Unlimited deal alerts', 'PDF investment reports', 'WhatsApp alerts', 'API access (AED 299/mo add-on)'],
      cta: 'Start Elite', ctaStyle: 'bg-[#0E7C6E] text-white',
    },
  ]

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#0A2540] mb-3">Simple, transparent pricing</h2>
        <p className="text-[#6B6860] mb-6">Start free. Upgrade when you need more data and power tools.</p>
        <div className="inline-flex items-center gap-3 bg-white border border-[#C9C5BB] rounded-lg p-1">
          <button onClick={() => setAnnual(false)} className={cn('px-4 py-1.5 rounded text-sm font-medium', !annual ? 'bg-[#0A2540] text-white' : 'text-[#6B6860]')}>Monthly</button>
          <button onClick={() => setAnnual(true)} className={cn('px-4 py-1.5 rounded text-sm font-medium', annual ? 'bg-[#0A2540] text-white' : 'text-[#6B6860]')}>
            Annual <span className="text-[10px] text-[#0E7C6E]">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map(t => (
          <div key={t.name} className={cn('bg-white rounded-xl border-2 p-6 relative', t.color)}>
            {t.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C8A96E] text-[#0A2540] text-[10px] font-bold px-3 py-1 rounded-full">{t.badge}</div>}
            <h3 className="text-xl font-bold text-[#0A2540]">{t.name}</h3>
            <div className="mt-2 mb-4">
              {t.price === 0 ? (
                <span className="text-3xl font-bold text-[#0A2540]">Free</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-[#0A2540]">AED {annual ? Math.round(t.price * 0.8) : t.price}</span>
                  <span className="text-sm text-[#6B6860]">{t.period}</span>
                </>
              )}
            </div>
            <ul className="space-y-2 mb-6">
              {t.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#0A0A0A]">
                  <span className="text-[#0E7C6E] mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
            <button className={cn('w-full py-2.5 rounded-lg font-semibold transition-colors', t.ctaStyle)}>{t.cta}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>('landing')
  const [selectedCommunity, setSelectedCommunity] = useState('dubai-marina')

  return (
    <div className="min-h-screen bg-[#F8F6F2]">
      <Nav page={page} setPage={setPage} />
      {page === 'landing' && <Landing setPage={setPage} />}
      {page === 'dashboard' && <HeatmapDashboard setPage={setPage} setSelectedCommunity={setSelectedCommunity} />}
      {page === 'community' && <CommunityDetail slug={selectedCommunity} setPage={setPage} />}
      {page === 'listings' && <ListingsFeed setPage={setPage} setSelectedCommunity={setSelectedCommunity} />}
      {page === 'portfolio' && <Portfolio />}
      {page === 'watchlist' && <Watchlist setPage={setPage} setSelectedCommunity={setSelectedCommunity} />}
      {page === 'deals' && <Deals setPage={setPage} setSelectedCommunity={setSelectedCommunity} />}
      {page === 'alerts' && <AlertsPage />}
      {page === 'pricing' && <PricingPage />}
      {page === 'yield' && <YieldCalculator />}
      {page === 'mortgage' && <MortgageSimulator />}
      <footer className="bg-[#0A2540] text-white/50 text-center py-6 text-xs">
        © 2026 sqftLab · UAE Property Intelligence Platform · Data from DLD, ADREC, Bayut, PropertyFinder
      </footer>
    </div>
  )
}
