import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  accent?: string
  delay?: number
}

export function StatCard({ label, value, change, changeLabel, icon, accent = '#C8A96E', delay = 0 }: StatCardProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const isUp = (change ?? 0) > 0
  const isDown = (change ?? 0) < 0

  return (
    <div
      ref={ref}
      className={cn(
        'relative group overflow-hidden rounded-2xl border border-white/20',
        'bg-white/60 backdrop-blur-xl shadow-lg shadow-black/[0.03]',
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}, transparent)` }} />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110')}
            style={{ background: `${accent}15`, color: accent }}>
            {icon}
          </div>
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              isUp && 'bg-emerald-50 text-emerald-700',
              isDown && 'bg-red-50 text-red-700',
              !isUp && !isDown && 'bg-gray-50 text-gray-500'
            )}>
              {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : <Minus size={12} />}
              <span>{isUp ? '+' : ''}{change?.toFixed(1)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[13px] text-gray-500 font-medium tracking-wide uppercase">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-[#0A2540]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {value}
          </p>
          {changeLabel && (
            <p className="text-xs text-gray-400">{changeLabel}</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-white/20',
      'bg-white/60 backdrop-blur-xl shadow-lg shadow-black/[0.03]',
      hover && 'transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.06] hover:border-white/30 hover:-translate-y-0.5',
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  )
}

interface PropertyCardProps {
  title: string
  price: number
  purpose: string
  beds: number
  baths: number
  area: number
  imageUrl?: string | null
  location: string
  source: string
  type?: string
}

export function PropertyCard({ title, price, purpose, beds, baths, area, imageUrl, location, source, type }: PropertyCardProps) {
  const isRent = purpose === 'rent'
  const formattedPrice = isRent
    ? `AED ${(price / 1000).toFixed(0)}K/yr`
    : `AED ${(price / 1000000).toFixed(2)}M`

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 backdrop-blur-xl shadow-lg shadow-black/[0.03] transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.06] hover:border-white/30 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent pointer-events-none" />

      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
        )}

        {/* Tags */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn(
            'px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md',
            isRent ? 'bg-sky-500/90 text-white' : 'bg-violet-500/90 text-white'
          )}>
            {purpose}
          </span>
          {type && (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium backdrop-blur-md bg-black/40 text-white">
              {type}
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 rounded-lg text-[10px] font-medium backdrop-blur-md bg-white/80 text-gray-600">
            {source}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-[#0A2540] line-clamp-2 leading-snug">{title}</h3>
          <p className="text-base font-bold text-[#0A2540] whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {formattedPrice}
          </p>
        </div>

        <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {location}
        </p>

        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-xs font-medium text-gray-600">{beds} BD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-gray-600">{baths} BA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            <span className="text-xs font-medium text-gray-600">{area.toLocaleString()} sqft</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PricingCardProps {
  name: string
  price: number
  period: string
  features: string[]
  highlighted?: boolean
  icon: React.ReactNode
  accent?: string
  cta?: string
}

export function PricingCard({ name, price, period, features, highlighted, icon, accent = '#C8A96E', cta = 'Get Started' }: PricingCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border transition-all duration-300',
      highlighted
        ? 'border-[#C8A96E]/40 bg-[#0A2540] text-white shadow-2xl shadow-[#C8A96E]/10 scale-[1.02]'
        : 'border-white/20 bg-white/60 backdrop-blur-xl shadow-lg shadow-black/[0.03] hover:shadow-xl'
    )}>
      {highlighted && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8A96E]/10 via-transparent to-[#0A2540] pointer-events-none" />
      )}

      {highlighted && (
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8A96E] text-[#0A2540]">
            Most Popular
          </span>
        </div>
      )}

      <div className="relative p-6">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
          highlighted ? 'bg-[#C8A96E]/20 text-[#C8A96E]' : 'bg-[#0A2540]/5 text-[#0A2540]'
        )}>
          {icon}
        </div>

        <h3 className="text-lg font-bold mb-1">{name}</h3>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {price === 0 ? 'Free' : `AED ${price}`}
          </span>
          {price > 0 && <span className={cn('text-sm', highlighted ? 'text-white/50' : 'text-gray-400')}>/{period}</span>}
        </div>

        <ul className="space-y-3 mb-8">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <svg className={cn('w-4 h-4 mt-0.5 flex-shrink-0', highlighted ? 'text-[#C8A96E]' : 'text-emerald-500')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className={highlighted ? 'text-white/80' : 'text-gray-600'}>{f}</span>
            </li>
          ))}
        </ul>

        <button className={cn(
          'w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200',
          highlighted
            ? 'bg-[#C8A96E] text-[#0A2540] hover:bg-[#D4B978] shadow-lg shadow-[#C8A96E]/20'
            : 'bg-[#0A2540] text-white hover:bg-[#0A2540]/90'
        )}>
          {cta}
        </button>
      </div>
    </div>
  )
}
