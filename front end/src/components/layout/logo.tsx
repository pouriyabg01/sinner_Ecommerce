'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSiteSettings } from '@/lib/api/queries'
import { BRAND_FALLBACK, MARK_PATHS } from '@/lib/brand'
import { cn } from '@/lib/utils'

export function Logo({
  className,
  textClassName,
  compact = false,
}: {
  className?: string
  /** برای جمع کردن نام کنار نشان در عرض‌های تنگ، مثل هدر روی گوشی‌های باریک */
  textClassName?: string
  compact?: boolean
}) {
  const { data } = useSiteSettings()
  const brand = data?.brand

  const mark = brand?.mark ?? ''
  const wordmark = brand?.wordmark || BRAND_FALLBACK.wordmark
  const caption = brand?.caption || BRAND_FALLBACK.caption
  const siteName = data?.siteName || BRAND_FALLBACK.siteName

  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label={`${siteName} — صفحه اصلی`}
    >
      {/*
       * نشان آپلودی رنگ خودش را دارد، پس زمینه‌ی گرادیانی برایش کشیده نمی‌شود؛
       * وگرنه لوگوی مشتری روی یک مربع سبز می‌نشست.
       */}
      <span
        className={cn(
          'relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-105',
          mark
            ? 'bg-surface-2'
            : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow',
        )}
      >
        {mark ? (
          <Image
            src={mark}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="size-full object-contain"
          />
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              {MARK_PATHS.map((d) => (
                <path key={d} d={d} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
            <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-full" />
          </>
        )}
      </span>

      {!compact && (
        <span className={cn('flex flex-col leading-none', textClassName)}>
          <span className="font-display text-lg font-bold tracking-[0.18em]">{wordmark}</span>
          {caption && <span className="pt-1 text-[10px] text-muted">{caption}</span>}
        </span>
      )}
    </Link>
  )
}
