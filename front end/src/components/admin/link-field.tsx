'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * ریشه‌ی سایت را از ابتدای آدرس برمی‌دارد.
 *
 * ادمین آدرس صفحه را از نوار مرورگر کپی می‌کند
 * (`http://localhost:3000/product/playstation-5-slim`) و همان را می‌چسباند.
 * چیزی که ذخیره می‌شود باید مسیر داخلی باشد (`/product/playstation-5-slim`)،
 * وگرنه لینک روی دامنه‌ی واقعی به localhost اشاره می‌کند و ناوبری هم به‌جای
 * client-side شدن، کل صفحه را از نو لود می‌کند.
 */
function stripOrigin(raw: string, origin: string) {
  const value = raw.trim()
  if (origin && value.toLowerCase().startsWith(origin.toLowerCase())) {
    const path = value.slice(origin.length)
    return path.startsWith('/') ? path : `/${path}`
  }
  return value
}

/** فقط هنگام خروج از فیلد اجرا می‌شود؛ وسط تایپ، «/» اضافه‌کردن آزاردهنده است */
function normalize(raw: string, origin: string) {
  const value = stripOrigin(raw, origin)
  if (!value || /^https?:\/\//i.test(value) || value.startsWith('#')) return value
  return value.startsWith('/') ? value : `/${value}`
}

/**
 * ورودی لینک با ریشه‌ی سایت به‌عنوان پیشوندِ ثابت، تا ادمین ببیند لینکِ نهایی
 * دقیقاً چه شکلی است. لینک بیرونی (http/https غیرِ این سایت) دست‌نخورده می‌ماند
 * و در آن حالت پیشوند نمایش داده نمی‌شود.
 */
export function LinkField({
  value,
  onChange,
  invalid,
  placeholder = '/product/playstation-5-slim',
}: {
  value: string
  onChange: (href: string) => void
  invalid?: boolean
  placeholder?: string
}) {
  // روی سرور origin معلوم نیست؛ بعد از hydrate پر می‌شود تا مارکاپ دو طرف یکی بماند
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const external = /^https?:\/\//i.test(value)

  return (
    <div
      dir="ltr"
      className={cn(
        'flex h-11 items-stretch overflow-hidden rounded-2xl border border-border bg-surface transition-[border-color,box-shadow] focus-within:border-brand-400 focus-within:shadow-[0_0_0_4px_rgba(0,179,146,0.14)]',
        invalid &&
          'border-red-500 focus-within:border-red-500 focus-within:shadow-[0_0_0_4px_rgba(239,68,68,0.16)]',
      )}
    >
      {!external && origin && (
        <span className="flex shrink-0 select-none items-center border-e border-border bg-surface-2 px-3 text-[12px] text-muted">
          {origin}
        </span>
      )}
      <input
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(stripOrigin(e.target.value, origin))}
        onBlur={(e) => onChange(normalize(e.target.value, origin))}
        placeholder={placeholder}
        className="h-full w-full min-w-0 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted/70"
      />
    </div>
  )
}

/** متن راهنمای مشترک همه‌ی فیلدهای لینک */
export const LINK_HINT = 'آدرس صفحه را از مرورگر کپی و اینجا بچسبانید؛ ریشه‌ی سایت خودکار جدا می‌شود.'
