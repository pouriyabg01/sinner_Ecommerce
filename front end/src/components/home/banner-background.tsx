'use client'

import { useId } from 'react'
import type { BannerPattern } from '@/types/cms'
import { cn } from '@/lib/utils'

export const BANNER_PATTERNS: { value: BannerPattern; label: string }[] = [
  { value: 'rings', label: 'حلقه' },
  { value: 'dots', label: 'نقطه' },
  { value: 'grid', label: 'شطرنجی' },
  { value: 'diagonal', label: 'خط مورب' },
  { value: 'waves', label: 'موج' },
  { value: 'none', label: 'ساده' },
]

const INK = '#070b12'

function rgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const full = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1]
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

/**
 * رنگ پیش‌فرض پس‌زمینه: همان ترکیب بنرهای SVG قدیمی — کمی از رنگ تأکید روی
 * زمینه‌ی تیره — تا بنرِ بی‌رنگِ انتخاب‌شده هم به سبک قبلی بماند.
 */
export function defaultBannerColor(accent: string): string {
  const a = rgb(accent) ?? [0, 179, 146]
  const b = rgb(INK)!
  return `#${a.map((v, i) => Math.round(v * 0.18 + b[i] * 0.82).toString(16).padStart(2, '0')).join('')}`
}

/** روشنایی نسبی (WCAG). بالای این حد، متن سفید روی رنگ خوانا نیست */
export function isLightColor(hex: string): boolean {
  const c = rgb(hex)
  if (!c) return false
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.2
}

/**
 * پس‌زمینه‌ی رنگ + الگو برای بنر. هم خود بنر و هم پیش‌نمایش گزینه‌ها در پنل از
 * همین استفاده می‌کنند، پس آنچه ادمین انتخاب می‌کند دقیقاً همان است که می‌بیند.
 *
 * رنگ از سمت متن (راست) شروع می‌شود و به‌سمت چپ تیره می‌شود؛ روشن یا تیره بودن
 * متن هم از روی همین رنگ تصمیم گرفته می‌شود.
 */
export function BannerBackground({
  color,
  accent,
  pattern,
  className,
}: {
  color: string
  accent: string
  pattern: BannerPattern
  className?: string
}) {
  // شناسه‌ی الگوی SVG باید در صفحه یکتا و در url(#…) معتبر باشد
  const id = `bp${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div
      aria-hidden
      className={cn('absolute inset-0', className)}
      style={{ background: `linear-gradient(to left, ${color}, color-mix(in oklab, ${color} 55%, ${INK}))` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(55% 90% at 72% 28%, color-mix(in srgb, ${accent} 40%, transparent), transparent 70%)`,
        }}
      />
      {pattern !== 'none' && (
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 1200 640"
          preserveAspectRatio="xMidYMid slice"
          style={{ color: accent }}
        >
          <defs>
            <pattern id={`${id}-dots`} width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="2.4" fill="currentColor" fillOpacity=".3" />
            </pattern>
            <pattern id={`${id}-grid`} width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0H0V44" fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth="1.5" />
            </pattern>
            <pattern id={`${id}-diagonal`} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="20" stroke="currentColor" strokeOpacity=".16" strokeWidth="3" />
            </pattern>
          </defs>

          {pattern === 'rings' && (
            <>
              <g fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="2">
                <circle cx="880" cy="200" r="120" />
                <circle cx="880" cy="200" r="190" />
                <circle cx="880" cy="200" r="270" />
              </g>
              <g fill="currentColor" fillOpacity=".14">
                <rect x="120" y="420" width="180" height="8" rx="4" />
                <rect x="120" y="452" width="120" height="8" rx="4" />
              </g>
            </>
          )}
          {pattern === 'dots' && <rect width="1200" height="640" fill={`url(#${id}-dots)`} />}
          {pattern === 'grid' && <rect width="1200" height="640" fill={`url(#${id}-grid)`} />}
          {pattern === 'diagonal' && <rect width="1200" height="640" fill={`url(#${id}-diagonal)`} />}
          {pattern === 'waves' && (
            <g fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="2.5">
              {[360, 420, 480, 540].map((y) => (
                <path key={y} d={`M0 ${y} C 200 ${y - 50}, 400 ${y + 50}, 600 ${y} S 1000 ${y - 50}, 1200 ${y}`} />
              ))}
            </g>
          )}
        </svg>
      )}
    </div>
  )
}
