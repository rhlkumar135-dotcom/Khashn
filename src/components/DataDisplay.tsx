import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  decimals?: number
}

export function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1500, decimals = 0 }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = null
    const from = display

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const progress = Math.min((timestamp - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(from + (value - from) * eased)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {prefix}{display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{suffix}
    </span>
  )
}

interface HeatmapCellProps {
  name: string
  value: number
  maxValue: number
  onClick?: () => void
  selected?: boolean
}

export function HeatmapCell({ name, value, maxValue, onClick, selected }: HeatmapCellProps) {
  const intensity = maxValue > 0 ? value / maxValue : 0
  const bg = `rgba(19, 106, 136, ${0.08 + intensity * 0.85})`
  const textColor = intensity > 0.5 ? 'white' : '#0A2540'

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl p-3 text-left transition-all duration-200',
        'border hover:scale-[1.02] active:scale-[0.98]',
        selected ? 'ring-2 ring-[#C8A96E] shadow-lg' : 'border-white/10 hover:shadow-md'
      )}
      style={{ backgroundColor: bg }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-[11px] font-medium opacity-80 truncate" style={{ color: textColor }}>{name}</p>
        <p className="text-lg font-bold mt-0.5" style={{ color: textColor, fontFamily: "'JetBrains Mono', monospace" }}>
          {value > 0 ? `AED ${value.toLocaleString()}` : '—'}
        </p>
        <p className="text-[10px] opacity-60" style={{ color: textColor }}>per sqft</p>
      </div>
    </button>
  )
}

interface TrendLineProps {
  data: { label: string; value: number }[]
  color?: string
  height?: number
}

export function TrendLine({ data, color = '#2563EB', height = 40 }: TrendLineProps) {
  if (data.length < 2) return <div style={{ height }} className="flex items-center text-xs text-gray-400">No data</div>

  const max = Math.max(...data.map(d => d.value))
  const min = Math.min(...data.map(d => d.value))
  const range = max - min || 1
  const w = 100
  const h = height

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d.value - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${h} ${points} ${w},${h}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`trend-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#trend-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface ScoreBarProps {
  label: string
  score: number
  maxScore?: number
}

export function ScoreBar({ label, score, maxScore = 100 }: ScoreBarProps) {
  const pct = Math.min((score / maxScore) * 100, 100)
  const color = score >= 80 ? '#0E7C6E' : score >= 60 ? '#C8A96E' : '#B91C1C'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

interface SpinnerProps {
  size?: number
  color?: string
}

export function Spinner({ size = 24, color = '#C8A96E' }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="rounded-full animate-spin"
        style={{
          width: size,
          height: size,
          border: `2.5px solid ${color}20`,
          borderTopColor: color,
        }}
      />
    </div>
  )
}
