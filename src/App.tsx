import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { MapPin, TrendingUp, TrendingDown, Search, Filter, Star, Bell, Briefcase, BarChart3, Home, Calculator, AlertTriangle, ChevronRight, ChevronDown, ArrowUpRight, ArrowDownRight, DollarSign, Building, Eye, Bookmark, Shield, Zap, Crown, Lock, Menu, X, Globe, Users, Target, IndianRupee, ExternalLink, Camera } from 'lucide-react'
import { cn } from '@/lib/cn'
import L from 'leaflet'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

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
  isDeal: boolean; title?: string; listedAt: string; imageUrl?: string; sourceUrl?: string
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
const SCORE_COLOR = (s: number) => s >= 80 ? '#059669' : s >= 60 ? '#3B82F6' : '#DC2626'

const PRICE_COLOR = (ppsf: number, min: number, max: number) => {
  const t = (ppsf - min) / (max - min || 1)
  if (t < 0.33) return '#06B6D4'
  if (t < 0.66) return '#3B82F6'
  return '#1E40AF'
}

// ─── Navigation ──────────────────────────────────────────────────────────────

type Page = 'landing' | 'dashboard' | 'community' | 'listings' | 'portfolio' | 'watchlist' | 'deals' | 'alerts' | 'pricing' | 'yield' | 'mortgage'

function Nav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const items: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Heatmap', icon: <MapPin size={16} /> },
    { id: 'listings', label: 'Listings', icon: <Building size={16} /> },
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase size={16} /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Bookmark size={16} /> },
    { id: 'deals', label: 'Deals', icon: <Zap size={16} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={16} /> },
    { id: 'yield', label: 'Yield Calc', icon: <Calculator size={16} /> },
    { id: 'mortgage', label: 'Mortgage', icon: <IndianRupee size={16} /> },
  ]

  return (
    <nav className="bg-white/80 backdrop-blur-xl text-[#0F172A] sticky top-0 z-50 shadow-sm border-b border-blue-100">
      <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => setPage('landing')} className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-200">S</div>
          <span className="text-lg font-bold tracking-tight text-[#1E40AF]">sqftLab</span>
          <span className="text-[10px] text-white bg-[#3B82F6] border border-[#3B82F6] rounded px-1.5 py-0.5 ml-1 hidden sm:inline font-medium">BETA</span>
        </button>

        <div className="hidden md:flex items-center gap-0.5">
          {items.map(i => (
            <button key={i.id} onClick={() => setPage(i.id)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                page === i.id ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-200' : 'text-[#64748B] hover:text-[#1E40AF] hover:bg-blue-50')}>
              {i.icon}<span className="font-medium">{i.label}</span>
            </button>
          ))}
          <button onClick={() => setPage('pricing')}
            className={cn('ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200',
              page === 'pricing' ? 'border-[#1E40AF] text-[#1E40AF] bg-blue-50' : 'border-blue-200 text-[#1E40AF] hover:bg-blue-50')}>
            <Crown size={16} /> Upgrade
          </button>
        </div>

        <button className="md:hidden text-[#1E40AF]" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-blue-100 px-4 py-3 space-y-1 shadow-lg">
          {items.map(i => (
            <button key={i.id} onClick={() => { setPage(i.id); setMobileOpen(false) }}
              className={cn('flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium',
                page === i.id ? 'bg-[#1E40AF] text-white' : 'text-[#64748B] hover:bg-blue-50')}>
              {i.icon}<span>{i.label}</span>
            </button>
          ))}
          <button onClick={() => { setPage('pricing'); setMobileOpen(false) }}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-[#1E40AF] border border-blue-200 font-semibold">
            <Crown size={16} /><span>Upgrade Plan</span>
          </button>
        </div>
      )}
    </nav>
  )
}

// ─── Glass Card Wrapper ──────────────────────────────────────────────────────

function GlassCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(
      'bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg shadow-blue-50/50 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/50',
      className
    )} {...props}>
      {children}
    </div>
  )
}

// ─── Landing Page ────────────────────────────────────────────────────────────

function Landing({ setPage }: { setPage: (p: Page) => void }) {
  const [stats, setStats] = useState<{ communityCount: number; transactionCount: number; listingCount: number } | null>(null)
  useEffect(() => { fetch('/api/sqftlab/stats').then(r => r.json()).then(setStats).catch(() => {}) }, [])

  return (
    <div className="min-h-screen">
      {/* Hero — Blue glass gradient */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#3B82F6]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-[1280px] mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center font-bold text-white text-lg border border-white/30">S</div>
              <span className="text-sm text-white/80 tracking-wider uppercase font-medium">sqftlab.com</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-white">
              <span className="block">Dubai Pulse. ADREC. Every live listing.</span>
              <span className="block mt-2">
                <span className="bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-200 bg-clip-text text-transparent">One platform that tells you exactly what a property is worth</span>{' '}
                <span className="text-white/80">— before anyone else does.</span>
              </span>
            </h1>
            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={() => setPage('dashboard')}
                className="bg-white text-[#1E40AF] px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg shadow-blue-900/30">
                Explore Heatmap →
              </button>
              <button onClick={() => setPage('pricing')}
                className="border border-white/30 text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm">
                View Plans
              </button>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg">
              <div>
                <div className="text-3xl font-bold text-white">{stats.communityCount}</div>
                <div className="text-sm text-white/60">Communities</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-300">{(stats.transactionCount / 1000).toFixed(1)}K</div>
                <div className="text-sm text-white/60">Transactions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-200">{stats.listingCount}</div>
                <div className="text-sm text-white/60">Live Listings</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features — Glass cards */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-[#1E3A8A] mb-12">Every data source. Zero cost.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <MapPin className="text-[#3B82F6]" size={28} />, title: 'Price Heatmap', desc: 'Colour-graded AED/sqft across every UAE community on a real interactive map.' },
            { icon: <TrendingUp className="text-[#059669]" size={28} />, title: 'Yield Calculator', desc: 'Gross & net yields, mortgage simulation, break-even analysis. All with INR equivalents.' },
            { icon: <Zap className="text-[#DC2626]" size={28} />, title: 'Deal Alerts', desc: 'Below-market listings detected automatically. Get notified before everyone else.' },
            { icon: <Briefcase className="text-[#1E40AF]" size={28} />, title: 'Portfolio Tracker', desc: 'Track your properties, rental income, mortgage payments, and total returns.' },
            { icon: <Shield className="text-[#059669]" size={28} />, title: 'Developer Risk', desc: 'Handover delays, RERA compliance, and community sentiment scored for every developer.' },
            { icon: <BarChart3 className="text-[#3B82F6]" size={28} />, title: 'AI Predictions', desc: '6-month forward price forecasts trained on 25+ years of DLD transaction data.' },
          ].map((f, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg shadow-blue-50/50 p-6 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-0.5">
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-semibold text-[#1E3A8A] mb-2">{f.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#3B82F6]" />
        <div className="relative max-w-[1280px] mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start free. Upgrade when ready.</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">5 heatmap searches per day, 3 months of transaction history, and INR equivalents — completely free.</p>
          <button onClick={() => setPage('pricing')}
            className="bg-white text-[#1E40AF] px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg shadow-blue-900/30">
            Compare Plans →
          </button>
        </div>
      </section>
    </div>
  )
}

// ─── Heatmap Dashboard — Real Leaflet Map ────────────────────────────────────

function HeatmapDashboard({ setPage, setSelectedCommunity }: { setPage: (p: Page) => void; setSelectedCommunity: (s: string) => void }) {
  const [communities, setCommunities] = useState<Community[]>([])
  const [emirate, setEmirate] = useState('all')
  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sqftlab/communities?emirate=${emirate}&search=${search}`)
      .then(r => r.json())
      .then(d => { setCommunities(d.communities || d.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [emirate, search])

  const priceRange = useMemo(() => {
    if (communities.length === 0) return { min: 0, max: 1 }
    return {
      min: Math.min(...communities.map(c => c.medianAedSqft)),
      max: Math.max(...communities.map(c => c.medianAedSqft)),
    }
  }, [communities])

  // Initialize and update Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    mapInstance.current = L.map(mapRef.current, {
      center: [25.2, 55.27],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapInstance.current)

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
    }
  }, [])

  // Update markers when communities change
  useEffect(() => {
    if (!mapInstance.current) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    communities.forEach(c => {
      const color = PRICE_COLOR(c.medianAedSqft, priceRange.min, priceRange.max)
      const radius = 6 + (c.transactionCount30d / Math.max(...communities.map(cm => cm.transactionCount30d || 1))) * 14

      const marker = L.circleMarker([c.latitude, c.longitude], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(mapInstance.current!)

      marker.bindTooltip(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;color:#1E3A8A">${c.nameEn}</div>
          <div style="font-size:11px;color:#64748B;text-transform:capitalize">${c.emirate.replace('_', ' ')}</div>
          <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
            <div><span style="font-weight:700;color:#1E40AF">AED ${c.medianAedSqft.toLocaleString()}</span><br/><span style="color:#94A3B8;font-size:10px">per sqft</span></div>
            <div><span style="font-weight:700;color:#059669">${c.grossYieldPct}%</span><br/><span style="color:#94A3B8;font-size:10px">yield</span></div>
            <div><span style="font-weight:600;color:${c.priceChange30d >= 0 ? '#059669' : '#DC2626'}">${PCT(c.priceChange30d)}</span><br/><span style="color:#94A3B8;font-size:10px">30d change</span></div>
            <div><span style="font-weight:600;color:#1E3A8A">${c.transactionCount30d}</span><br/><span style="color:#94A3B8;font-size:10px">txns (30d)</span></div>
          </div>
        </div>
      `, { className: 'sqftlab-tooltip', direction: 'top', offset: [0, -radius] })

      marker.on('click', () => {
        setSelectedCommunity(c.slug)
        setPage('community')
      })

      marker.on('mouseover', () => setHovered(c))
      marker.on('mouseout', () => setHovered(null))

      markersRef.current.push(marker)
    })

    // Fit bounds
    if (communities.length > 0) {
      const bounds = L.latLngBounds(communities.map(c => [c.latitude, c.longitude] as [number, number]))
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }
  }, [communities, priceRange, setPage, setSelectedCommunity])

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <style>{`.sqftlab-tooltip { background: white; border: none; border-radius: 12px; box-shadow: 0 8px 32px rgba(30,64,175,0.15); padding: 10px 14px; } .sqftlab-tooltip::before { border-top-color: white !important; }`}</style>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-blue-100 bg-white/80 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all shadow-sm" />
        </div>
        <div className="flex gap-1 bg-white/80 backdrop-blur border border-blue-100 rounded-xl p-0.5 shadow-sm">
          {['all', 'dubai', 'abu_dhabi'].map(e => (
            <button key={e} onClick={() => setEmirate(e)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                emirate === e ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-200' : 'text-[#64748B] hover:text-[#1E40AF] hover:bg-blue-50')}>
              {e === 'all' ? 'All UAE' : e === 'dubai' ? 'Dubai' : 'Abu Dhabi'}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#94A3B8] font-medium">{communities.length} communities</div>
      </div>

      {/* Real Leaflet Map */}
      <div className="rounded-2xl overflow-hidden shadow-xl shadow-blue-100/50 border border-white/60 relative" style={{ height: '520px' }}>
        <div ref={mapRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

        {/* Legend overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xl rounded-xl p-3 text-xs shadow-lg border border-white/60 z-[1000]">
          <div className="font-semibold text-[#1E3A8A] mb-1.5">AED/sqft</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#06B6D4]" /> Low (&lt;1.2K)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6]" /> Medium (1.2–2.0K)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#1E40AF]" /> High (&gt;2.0K)</div>
          <div className="mt-2 pt-2 border-t border-blue-100">
            <div className="text-[#94A3B8]">Circle size = volume</div>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <div className="text-[#3B82F6] font-medium">Loading communities...</div>
          </div>
        )}
      </div>

      {/* Top movers */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="font-semibold text-[#1E3A8A] mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-[#059669]" /> Top Gainers (30d)</h3>
          <div className="space-y-1">
            {[...communities].sort((a, b) => b.priceChange30d - a.priceChange30d).slice(0, 5).map(c => (
              <button key={c.id} onClick={() => { setSelectedCommunity(c.slug); setPage('community') }}
                className="flex items-center justify-between w-full py-2 hover:bg-blue-50/50 rounded-lg px-2 transition-all">
                <span className="text-sm text-[#0F172A] font-medium">{c.nameEn}</span>
                <span className="text-sm font-bold text-[#059669]">{PCT(c.priceChange30d)}</span>
              </button>
            ))}
          </div>
        </GlassCard>
        <GlassCard>
          <h3 className="font-semibold text-[#1E3A8A] mb-3 flex items-center gap-2"><Target size={16} className="text-[#3B82F6]" /> Highest Yield</h3>
          <div className="space-y-1">
            {[...communities].sort((a, b) => b.grossYieldPct - a.grossYieldPct).slice(0, 5).map(c => (
              <button key={c.id} onClick={() => { setSelectedCommunity(c.slug); setPage('community') }}
                className="flex items-center justify-between w-full py-2 hover:bg-blue-50/50 rounded-lg px-2 transition-all">
                <span className="text-sm text-[#0F172A] font-medium">{c.nameEn}</span>
                <span className="text-sm font-bold text-[#3B82F6]">{c.grossYieldPct}%</span>
              </button>
            ))}
          </div>
        </GlassCard>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/sqftlab/communities/${slug}`).then(r => r.json()),
      fetch(`/api/sqftlab/communities/${slug}/trend?period=12m`).then(r => r.json()),
      fetch(`/api/sqftlab/communities/${slug}/transactions?limit=20`).then(r => r.json()),
      fetch(`/api/sqftlab/communities/${slug}/listings?purpose=sale`).then(r => r.json()),
    ]).then(([cData, tData, txData, lData]) => {
      setCommunity(cData.community || cData)
      setTrend(tData.trend || [])
      setTransactions(txData.transactions || [])
      setListings(lData.listings || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#64748B]">Loading community data...</div>
  if (!community) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#64748B]">Community not found</div>

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
      <button onClick={() => setPage('dashboard')} className="text-sm text-[#64748B] hover:text-[#1E40AF] mb-4 flex items-center gap-1 transition-colors">
        ← Back to Heatmap
      </button>

      {/* Price Summary Card */}
      <div className="relative overflow-hidden rounded-2xl p-6 mb-6 shadow-xl shadow-blue-100/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#3B82F6]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{community.nameEn}</h1>
                <span className="text-xs bg-white/20 backdrop-blur px-2 py-0.5 rounded-lg capitalize">{community.emirate.replace('_', ' ')}</span>
              </div>
              {community.nameAr && <div className="text-sm text-white/50">{community.nameAr}</div>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{AED(community.medianAedSqft)}<span className="text-sm font-normal text-white/50"> /sqft</span></div>
              <div className="text-sm text-white/50">{INR(community.medianAedSqft)} /sqft</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-4 border-t border-white/10">
            <div>
              <div className={cn('text-xl font-bold', community.priceChange30d >= 0 ? 'text-emerald-300' : 'text-red-300')}>{PCT(community.priceChange30d)}</div>
              <div className="text-xs text-white/50">30-day change</div>
            </div>
            <div>
              <div className={cn('text-xl font-bold', community.priceChange1y >= 0 ? 'text-emerald-300' : 'text-red-300')}>{PCT(community.priceChange1y)}</div>
              <div className="text-xs text-white/50">1-year change</div>
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-300">{community.grossYieldPct}%</div>
              <div className="text-xs text-white/50">Gross yield</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{community.transactionCount30d}</div>
              <div className="text-xs text-white/50">Txns (30d)</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-200">{community.neighbourhoodScore}</div>
              <div className="text-xs text-white/50">Neighbourhood score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Charts + Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard>
            <h3 className="font-semibold text-[#1E3A8A] mb-4">Price History (12 months)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Area type="monotone" dataKey="medianPrice" stroke="#3B82F6" fill="url(#priceGrad)" strokeWidth={2} name="AED/sqft" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard>
            <h3 className="font-semibold text-[#1E3A8A] mb-4">Transaction Volume</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Bar dataKey="volume" fill="#1E40AF" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard>
            <h3 className="font-semibold text-[#1E3A8A] mb-4">Recent Transactions (DLD)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-100 text-[#64748B] text-left">
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
                    <tr key={t.id} className={cn('border-b border-blue-50 text-[#0F172A]', i % 2 === 0 && 'bg-blue-50/30')}>
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
          </GlassCard>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <GlassCard>
            <h3 className="font-semibold text-[#1E3A8A] mb-2">Neighbourhood Score</h3>
            <div className="text-center mb-2">
              <span className="text-4xl font-bold" style={{ color: SCORE_COLOR(community.neighbourhoodScore) }}>{community.neighbourhoodScore}</span>
              <span className="text-sm text-[#94A3B8]">/100</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748B' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 9 }} />
                <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Live Listings — Clickable with images */}
          <GlassCard>
            <h3 className="font-semibold text-[#1E3A8A] mb-3">Live Listings</h3>
            <div className="space-y-3">
              {listings.slice(0, 5).map(l => (
                <a key={l.id}
                  href={l.sourceUrl || `https://www.propertyfinder.ae`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 p-2 rounded-xl hover:bg-blue-50/50 transition-all group cursor-pointer">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 flex-shrink-0 flex items-center justify-center">
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt={l.title || ''} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Camera className="text-blue-200" size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-[#0F172A] truncate">{l.beds === 0 ? 'Studio' : `${l.beds}BR`} {l.propertyType}</span>
                      <ExternalLink size={10} className="text-[#94A3B8] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xs text-[#94A3B8]">{l.areaSqft.toLocaleString()} sqft · {l.source}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-[#1E40AF]">{AED(l.priceAed)}</span>
                      {l.isDeal && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold">DEAL</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="font-semibold text-[#1E3A8A] mb-3">Rental Yield</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-[#64748B]">Annual Rent (median)</span><span className="text-sm font-semibold">{AED(community.medianAnnualRentAed)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-[#64748B]">Gross Yield</span><span className="text-sm font-bold text-[#059669]">{community.grossYieldPct}%</span></div>
              <div className="flex justify-between"><span className="text-sm text-[#64748B]">Net Yield (est.)</span><span className="text-sm font-semibold text-[#059669]">{(community.grossYieldPct * 0.78).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-sm text-[#64748B]">INR Equivalent</span><span className="text-xs text-[#94A3B8]">{INR(community.medianAnnualRentAed)}/yr</span></div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

// ─── Listings Feed — Clickable with images ───────────────────────────────────

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
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Live Listings</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white/80 backdrop-blur border border-blue-100 rounded-xl p-0.5 shadow-sm">
            {['sale', 'rent'].map(p => (
              <button key={p} onClick={() => setPurpose(p)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                  purpose === p ? 'bg-[#1E40AF] text-white shadow-md shadow-blue-200' : 'text-[#64748B] hover:bg-blue-50')}>
                {p}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={dealsOnly} onChange={e => setDealsOnly(e.target.checked)}
              className="rounded border-blue-200 accent-[#3B82F6]" />
            <span className="text-[#64748B]">Deals only</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#64748B]">Loading listings...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map(l => (
            <a key={l.id}
              href={l.sourceUrl || `https://www.propertyfinder.ae`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg shadow-blue-50/50 overflow-hidden hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer block">
              <div className="h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center relative overflow-hidden">
                {l.imageUrl ? (
                  <img src={l.imageUrl} alt={l.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <Building className="text-blue-200" size={48} />
                )}
                {l.isDeal && (
                  <div className="absolute top-3 right-3 bg-[#DC2626] text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">
                    DEAL · {Math.round((1 - l.pricePerSqft / (l.community?.medianAedSqft || l.pricePerSqft)) * 100)}% below median
                  </div>
                )}
                <div className="absolute bottom-3 left-3 text-white text-xs bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                  <ExternalLink size={10} /> {l.source}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-[#0F172A]">{l.beds === 0 ? 'Studio' : `${l.beds}BR`} {l.propertyType}</div>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedCommunity(l.community?.slug || ''); setPage('community') }}
                      className="text-xs text-[#3B82F6] hover:underline">
                      {l.community?.nameEn || 'View community'}
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#1E40AF]">{AED(l.priceAed)}</div>
                    <div className="text-[10px] text-[#94A3B8]">{INR(l.priceAed)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-2">
                  <span>{l.areaSqft.toLocaleString()} sqft</span>
                  <span>·</span>
                  <span>{l.baths} bath</span>
                  <span>·</span>
                  <span className="capitalize">{l.furnished}</span>
                </div>
                {l.agentName && (
                  <div className="mt-3 pt-3 border-t border-blue-50 flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">{l.agentName}</span>
                    <span className="text-[#94A3B8]">{l.agencyName}</span>
                  </div>
                )}
              </div>
            </a>
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

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#64748B]">Loading portfolio...</div>
  if (!data) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#64748B]">No portfolio data</div>

  const { summary, items } = data
  const pieData = items.map(i => ({ name: i.community.nameEn, value: i.currentValue }))
  const COLORS = ['#1E40AF', '#3B82F6', '#06B6D4', '#059669', '#94A3B8']

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">Portfolio</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Value', value: AED(summary.totalValue), color: 'text-[#1E40AF]' },
          { label: 'Total Gain/Loss', value: `${summary.totalGainLoss >= 0 ? '+' : ''}${AED(summary.totalGainLoss)}`, color: summary.totalGainLoss >= 0 ? 'text-[#059669]' : 'text-[#DC2626]' },
          { label: 'Weighted Yield', value: `${summary.weightedYield}%`, color: 'text-[#059669]' },
          { label: 'Monthly Cash Flow', value: AED(summary.monthlyCashFlow), color: 'text-[#059669]' },
        ].map((s, i) => (
          <GlassCard key={i}>
            <div className="text-xs text-[#94A3B8] mb-1">{s.label}</div>
            <div className={cn('text-xl font-bold', s.color)}>{s.value}</div>
          </GlassCard>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {items.map(item => (
            <GlassCard key={item.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-[#0F172A]">{item.title}</div>
                  <button className="text-xs text-[#3B82F6] hover:underline">{item.community.nameEn}</button>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#1E40AF]">{AED(item.currentValue)}</div>
                  <div className={cn('text-xs font-medium', item.currentValue >= item.purchasePrice ? 'text-[#059669]' : 'text-[#DC2626]')}>
                    {item.currentValue >= item.purchasePrice ? '+' : ''}{AED(item.currentValue - item.purchasePrice)} ({((item.currentValue - item.purchasePrice) / item.purchasePrice * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-[#94A3B8]">
                <div><span className="block font-medium text-[#0F172A]">{AED(item.purchasePrice)}</span> Purchase</div>
                <div><span className="block font-medium text-[#059669]">{AED(item.annualRent)}/yr</span> Annual Rent</div>
                <div><span className="block font-medium text-[#0F172A]">{item.beds}BR · {item.areaSqft.toLocaleString()} sqft</span> Specs</div>
              </div>
            </GlassCard>
          ))}
        </div>
        <GlassCard>
          <h3 className="font-semibold text-[#1E3A8A] mb-4">Portfolio Diversification</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => AED(v)} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
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

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-20 text-center text-[#64748B]">Loading watchlist...</div>

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">Watchlist</h2>
      {items.length === 0 ? (
        <div className="text-center py-20 text-[#64748B]">
          <Bookmark size={40} className="mx-auto mb-3 text-blue-200" />
          <p>No communities watched yet — search the heatmap to start tracking.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(w => {
            const c = w.community
            return (
              <button key={c.id} onClick={() => { setSelectedCommunity(c.slug); setPage('community') }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg shadow-blue-50/50 p-5 text-left hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-[#0F172A]">{c.nameEn}</div>
                    <div className="text-xs text-[#94A3B8] capitalize">{c.emirate.replace('_', ' ')}</div>
                  </div>
                  <div className={cn('text-sm font-bold', c.priceChange30d >= 0 ? 'text-[#059669]' : 'text-[#DC2626]')}>
                    {PCT(c.priceChange30d)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><div className="font-bold text-[#1E40AF]">{AED(c.medianAedSqft)}</div><div className="text-[#94A3B8]">AED/sqft</div></div>
                  <div><div className="font-bold text-[#059669]">{c.grossYieldPct}%</div><div className="text-[#94A3B8]">Yield</div></div>
                  <div><div className="font-bold text-[#1E3A8A]">{c.transactionCount30d}</div><div className="text-[#94A3B8]">Txns (30d)</div></div>
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
        <Zap className="text-[#DC2626]" size={24} />
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Deal Alert Feed</h2>
        <span className="text-xs bg-red-50 text-[#DC2626] px-2 py-1 rounded-lg font-semibold">{deals.length} deals</span>
      </div>
      <p className="text-sm text-[#64748B] mb-6">Listings priced below the community median — potential investment opportunities.</p>

      {loading ? (
        <div className="text-center py-20 text-[#64748B]">Loading deals...</div>
      ) : (
        <div className="space-y-3">
          {deals.map(d => {
            const discount = d.community?.medianAedSqft ? Math.round((1 - d.pricePerSqft / d.community.medianAedSqft) * 100) : 0
            return (
              <a key={d.id}
                href={d.sourceUrl || 'https://www.propertyfinder.ae'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-lg shadow-blue-50/50 p-4 flex flex-wrap items-center gap-4 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 group cursor-pointer block">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 flex-shrink-0 flex items-center justify-center">
                  {d.imageUrl ? (
                    <img src={d.imageUrl} alt={d.title || ''} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Zap className="text-red-300" size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0F172A]">{d.beds}BR {d.propertyType}</span>
                    <span className="text-xs text-[#94A3B8]">{d.areaSqft.toLocaleString()} sqft</span>
                    <ExternalLink size={10} className="text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedCommunity(d.community?.slug || ''); setPage('community') }}
                    className="text-xs text-[#3B82F6] hover:underline">{d.community?.nameEn}</button>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#1E40AF]">{AED(d.priceAed)}</div>
                  <div className="text-[10px] text-[#94A3B8]">{AED(d.pricePerSqft)}/sqft vs {AED(d.community?.medianAedSqft || 0)} median</div>
                </div>
                <div className="bg-[#DC2626] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
                  -{discount}%
                </div>
              </a>
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
    below_market: { label: 'Below Market', color: 'bg-red-50 text-[#DC2626]' },
    price_drop: { label: 'Price Drop', color: 'bg-emerald-50 text-[#059669]' },
    new_listing: { label: 'New Listing', color: 'bg-blue-50 text-[#1E40AF]' },
    yield_target: { label: 'Yield Target', color: 'bg-blue-50 text-[#3B82F6]' },
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">Deal Alerts</h2>
      {loading ? (
        <div className="text-center py-20 text-[#64748B]">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-[#64748B]">
          <Bell size={40} className="mx-auto mb-3 text-blue-200" />
          <p>No alerts configured — create one to get notified of deals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => {
            const type = typeLabels[a.alertType] || { label: a.alertType, color: 'bg-gray-100 text-gray-700' }
            return (
              <GlassCard key={a.id} className="flex flex-wrap items-center gap-4">
                <div className={cn('text-xs font-medium px-3 py-1.5 rounded-lg', type.color)}>{type.label}</div>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium text-[#0F172A]">
                    {a.community?.nameEn || 'All Communities'}
                    {a.propertyType && ` · ${a.propertyType}`}
                    {a.beds !== undefined && ` · ${a.beds}BR`}
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    {a.alertType === 'yield_target' ? `Target: ${a.yieldTargetPct}% yield` : `Threshold: ${a.thresholdPct}% below median`}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  {a.notifyPush && <span className="bg-blue-50 px-2 py-1 rounded-lg">Push</span>}
                  {a.notifyEmail && <span className="bg-blue-50 px-2 py-1 rounded-lg">Email</span>}
                  {a.notifyWhatsapp && <span className="bg-emerald-50 text-[#059669] px-2 py-1 rounded-lg">WhatsApp</span>}
                </div>
                <div className={cn('w-2 h-2 rounded-full', a.isActive ? 'bg-[#059669]' : 'bg-blue-200')} />
              </GlassCard>
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
      <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">Yield Calculator</h2>
      <p className="text-sm text-[#64748B] mb-6">Calculate gross & net yields, cash flow, and break-even for any property.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1">Purchase Price (AED)</label>
            <input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: +e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all" />
            <div className="text-[10px] text-[#94A3B8] mt-0.5">{INR(form.purchasePrice)}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1">Expected Annual Rent (AED)</label>
            <input type="number" value={form.annualRent} onChange={e => setForm({ ...form, annualRent: +e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1">Service Charge (AED/yr)</label>
            <input type="number" value={form.serviceCharge} onChange={e => setForm({ ...form, serviceCharge: +e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.mortgageEnabled} onChange={e => setForm({ ...form, mortgageEnabled: e.target.checked })}
              className="accent-[#3B82F6]" />
            <label className="text-sm text-[#0F172A]">Include Mortgage</label>
          </div>
          {form.mortgageEnabled && (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-[#64748B] block mb-1">Down Payment %</label>
                <input type="number" value={form.downPaymentPct} onChange={e => setForm({ ...form, downPaymentPct: +e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm" /></div>
              <div><label className="text-xs text-[#64748B] block mb-1">Rate %</label>
                <input type="number" step="0.1" value={form.mortgageRate} onChange={e => setForm({ ...form, mortgageRate: +e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm" /></div>
              <div><label className="text-xs text-[#64748B] block mb-1">Term (yrs)</label>
                <input type="number" value={form.mortgageTerm} onChange={e => setForm({ ...form, mortgageTerm: +e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm" /></div>
            </div>
          )}
          <button onClick={calculate}
            className="w-full bg-[#1E40AF] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1E3A8A] transition-all shadow-md shadow-blue-200">
            Calculate
          </button>
        </GlassCard>

        {result && (
          <div className="relative overflow-hidden rounded-2xl p-5 space-y-3 text-white">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#3B82F6]" />
            <div className="relative">
              <h3 className="font-semibold text-blue-200 mb-3">Results</h3>
              {[
                { label: 'Gross Yield', value: `${result.grossYield}%`, color: 'text-cyan-300' },
                { label: 'Net Yield', value: `${result.netYield}%`, color: 'text-cyan-300' },
                { label: 'Monthly Cash Flow', value: AED(result.monthlyCashFlow), color: result.monthlyCashFlow >= 0 ? 'text-cyan-300' : 'text-red-300' },
                { label: 'Annual Cash Flow', value: AED(result.annualCashFlow), color: result.annualCashFlow >= 0 ? 'text-cyan-300' : 'text-red-300' },
                { label: 'DLD Fee (4%)', value: AED(result.dldFee), color: 'text-white/70' },
                ...(form.mortgageEnabled ? [
                  { label: 'Monthly EMI', value: AED(result.emi), color: 'text-blue-200' },
                  { label: 'Total Interest', value: AED(result.totalInterest), color: 'text-red-300' },
                ] : []),
                { label: '5-Year Projected Return', value: `${result.fiveYearReturn}%`, color: 'text-cyan-300' },
              ].map((r, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-sm text-white/60">{r.label}</span>
                  <span className={cn('text-sm font-semibold', r.color)}>{r.value}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/40">INR equivalents shown using rate: 1 AED = ₹22.68</div>
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
      <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">Mortgage Simulator</h2>
      <p className="text-sm text-[#64748B] mb-6">Estimate EMI, total cost, and compare indicative bank rates.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#64748B] block mb-1">Property Price (AED)</label>
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-[#64748B] block mb-1">Down Payment %</label>
              <input type="number" value={form.downPaymentPct} onChange={e => setForm({ ...form, downPaymentPct: +e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm" /></div>
            <div><label className="text-xs text-[#64748B] block mb-1">Rate %</label>
              <input type="number" step="0.1" value={form.ratePct} onChange={e => setForm({ ...form, ratePct: +e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm" /></div>
            <div><label className="text-xs text-[#64748B] block mb-1">Term (yrs)</label>
              <input type="number" value={form.termYears} onChange={e => setForm({ ...form, termYears: +e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-white/80 text-sm" /></div>
          </div>
          <button onClick={simulate}
            className="w-full bg-[#1E40AF] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1E3A8A] transition-all shadow-md shadow-blue-200">
            Simulate
          </button>
        </GlassCard>

        {r && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl p-5 text-white">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#3B82F6]" />
              <div className="relative text-center mb-4">
                <div className="text-xs text-white/50">Monthly EMI</div>
                <div className="text-3xl font-bold">{AED(r.emi)}</div>
                <div className="text-xs text-white/50">{INR(r.emi)}/month</div>
              </div>
              <div className="relative grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/10 backdrop-blur rounded-xl p-3"><div className="text-white/50 text-xs">Down Payment</div><div className="font-semibold">{AED(r.downPayment)}</div></div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3"><div className="text-white/50 text-xs">Loan Amount</div><div className="font-semibold">{AED(r.loanAmount)}</div></div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3"><div className="text-white/50 text-xs">Total Interest</div><div className="font-semibold text-red-300">{AED(r.totalInterest)}</div></div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3"><div className="text-white/50 text-xs">Total Payment</div><div className="font-semibold">{AED(r.totalPayment)}</div></div>
              </div>
            </div>

            {bankRates && (
              <GlassCard>
                <h3 className="font-semibold text-[#1E3A8A] mb-3 text-sm">Indicative Bank Rates</h3>
                <div className="space-y-2">
                  {bankRates.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-blue-50 last:border-0">
                      <span className="text-sm text-[#0F172A]">{b.bank}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#94A3B8]">{b.type}</span>
                        <span className="text-sm font-semibold text-[#1E40AF]">{b.rate.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-3">Indicative only. Consult a mortgage adviser for actual rates.</p>
              </GlassCard>
            )}

            {amort && (
              <GlassCard>
                <h3 className="font-semibold text-[#1E3A8A] mb-3 text-sm">Amortization (First 5 Years)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={amort}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #E2E8F0' }} formatter={(v: number) => AED(v)} />
                    <Legend />
                    <Bar dataKey="principalPaid" name="Principal" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="interestPaid" name="Interest" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
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
    { name: 'Free', price: 0, period: '', color: 'border-blue-100', features: ['5 heatmap searches/day', '3-month transaction history', '10 live listings/day', 'Basic neighbourhood score', 'INR equivalent display', '3 community watchlist'], cta: 'Get Started', ctaStyle: 'bg-[#1E40AF] text-white' },
    { name: 'Pro', price: 49, period: '/mo', color: 'border-[#3B82F6]', badge: 'Most Popular', features: ['Unlimited heatmap searches', 'Full transaction history (1998–now)', 'Unlimited live listings', '12-month price charts', 'Yield calculator', 'Mortgage simulator', 'Developer risk scores', 'Off-plan tracker', '5-property portfolio', '20 community watchlist', '3 deal alerts', 'Comparable transactions', 'Visa eligibility screener'], cta: 'Start Pro', ctaStyle: 'bg-[#3B82F6] text-white' },
    { name: 'Elite', price: 149, period: '/mo', color: 'border-[#1E40AF]', features: ['Everything in Pro', '5-year price charts', 'AI price predictions (6-mo)', 'Unlimited portfolio', 'Unlimited watchlist', 'Unlimited deal alerts', 'PDF investment reports', 'WhatsApp alerts', 'API access (AED 299/mo add-on)'], cta: 'Start Elite', ctaStyle: 'bg-[#1E40AF] text-white' },
  ]

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#1E3A8A] mb-3">Simple, transparent pricing</h2>
        <p className="text-[#64748B] mb-6">Start free. Upgrade when you need more data and power tools.</p>
        <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur border border-blue-100 rounded-xl p-1 shadow-sm">
          <button onClick={() => setAnnual(false)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', !annual ? 'bg-[#1E40AF] text-white shadow-md' : 'text-[#64748B]')}>Monthly</button>
          <button onClick={() => setAnnual(true)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', annual ? 'bg-[#1E40AF] text-white shadow-md' : 'text-[#64748B]')}>
            Annual <span className="text-[10px] text-[#059669]">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map(t => (
          <div key={t.name} className={cn('bg-white/80 backdrop-blur-xl rounded-2xl border-2 p-6 relative shadow-lg shadow-blue-50/50 hover:shadow-xl transition-all', t.color)}>
            {t.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">{t.badge}</div>}
            <h3 className="text-xl font-bold text-[#1E3A8A]">{t.name}</h3>
            <div className="mt-2 mb-4">
              {t.price === 0 ? (
                <span className="text-3xl font-bold text-[#1E3A8A]">Free</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-[#1E40AF]">AED {annual ? Math.round(t.price * 0.8) : t.price}</span>
                  <span className="text-sm text-[#94A3B8]">{t.period}</span>
                </>
              )}
            </div>
            <ul className="space-y-2 mb-6">
              {t.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#0F172A]">
                  <span className="text-[#3B82F6] mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
            <button className={cn('w-full py-2.5 rounded-xl font-semibold transition-all shadow-md', t.ctaStyle)}>{t.cta}</button>
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
    <div className="min-h-screen bg-gradient-to-br from-[#EEF4FB] via-[#F0F4FA] to-[#E8F0FE]">
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
      <footer className="bg-gradient-to-r from-[#1E3A8A] to-[#1E40AF] text-white/60 text-center py-6 text-xs">
        © 2026 sqftLab · UAE Property Intelligence Platform · Data from DLD, ADREC, Bayut, PropertyFinder
      </footer>
    </div>
  )
}
