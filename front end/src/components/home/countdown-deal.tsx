'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Flame } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import { useProducts } from '@/lib/api/queries'
import { buttonVariants } from '@/components/ui/button'
import { Rating } from '@/components/ui/rating'
import { Skeleton } from '@/components/ui/skeleton'
import { discountPercent, formatPrice, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

function useCountdown(endsAt: string) {
  const [left, setLeft] = useState(() => Math.max(0, +new Date(endsAt) - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, +new Date(endsAt) - Date.now())), 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const totalSeconds = Math.floor(left / 1000)
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: left <= 0,
  }
}

export function CountdownDeal({ title, productId, endsAt, note }: SectionProps['countdown_deal']) {
  const { hours, minutes, seconds, expired } = useCountdown(endsAt)
  const { data, isLoading } = useProducts({ perPage: 100 })
  const product = data?.items.find((p) => p.id === productId)

  if (isLoading) return <div className="container-page"><Skeleton className="h-72 rounded-card" /></div>
  if (!product) return null

  const off = discountPercent(product.price, product.compareAtPrice)

  return (
    <div className="container-page">
      <div className="grid overflow-hidden rounded-card border border-white/10 bg-gradient-to-bl from-ink-900 via-ink-950 to-ink-900 md:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col justify-center gap-5 p-7 sm:p-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-ember-500/15 px-3 py-1.5 text-xs font-medium text-ember-400">
            <Flame className="size-3.5" />
            {title}
          </span>

          <h3 className="text-xl font-bold leading-9 text-white sm:text-2xl">{product.title}</h3>
          <Rating value={product.rating} count={product.reviewCount} className="text-white/70" />

          <div className="flex flex-wrap items-center gap-3">
            {off != null && (
              <span className="rounded-xl bg-ember-500 px-3 py-1.5 text-sm font-bold text-white">
                {toFaDigits(off)}٪ تخفیف
              </span>
            )}
            <span className="text-2xl font-bold text-white">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-white/40 line-through">{formatPrice(product.compareAtPrice, false)}</span>
            )}
          </div>

          {/*
            کادر ساعت‌شمار مثل هر ساعتی چپ‌به‌راست خوانده می‌شود، پس ترتیب
            آرایه هم باید از بزرگ به کوچک باشد: ساعت، دقیقه، ثانیه.
          */}
          <div className="flex items-center gap-2" dir="ltr">
            {[
              { value: hours, label: 'ساعت' },
              { value: minutes, label: 'دقیقه' },
              { value: seconds, label: 'ثانیه' },
            ].map((unit) => (
              <div
                key={unit.label}
                className="flex min-w-16 flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <span className="num text-xl font-bold text-white">
                  {toFaDigits(String(unit.value).padStart(2, '0'))}
                </span>
                <span className="text-[10px] text-white/50">{unit.label}</span>
              </div>
            ))}
          </div>

          <p className="text-xs leading-6 text-white/45">{expired ? 'این پیشنهاد به پایان رسید.' : note}</p>

          <Link href={`/product/${product.slug}`} className={cn(buttonVariants({ variant: 'ember', size: 'lg' }), 'w-fit')}>
            همین حالا بخر
          </Link>
        </div>

        <Link href={`/product/${product.slug}`} className="group relative min-h-64 overflow-hidden">
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>
      </div>
    </div>
  )
}
