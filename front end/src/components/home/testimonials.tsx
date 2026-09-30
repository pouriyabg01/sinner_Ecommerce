'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { BadgeCheck, Quote } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import { useTopReviews } from '@/lib/api/queries'
import { SectionHeading } from '@/components/ui/section-heading'
import { Rating } from '@/components/ui/rating'
import { Skeleton } from '@/components/ui/skeleton'

const DEFAULT_LIMIT = 6

/**
 * نظرهای واقعی مشتری‌ها، نه متن دست‌نویس.
 *
 * تا پیش از این سه نظرِ نمونه داخل تنظیمات نوشته شده بود و همیشه همان‌ها
 * نمایش داده می‌شد. حالا از نظرهای تأییدشده‌ی کالاها خوانده می‌شود؛ تا وقتی
 * نظری ثبت نشده باشد، این بخش اصلاً کشیده نمی‌شود — بخشِ خالی از نبودنش بدتر است.
 */
export function Testimonials({ title, limit = DEFAULT_LIMIT }: SectionProps['testimonials']) {
  const { data, isLoading } = useTopReviews(limit)
  const items = data?.items ?? []

  if (!isLoading && items.length === 0) return null

  return (
    <div className="container-page">
      <SectionHeading title={title} />
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-card" />)
          : items.map((item, i) => (
              <motion.figure
                key={item.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.09 }}
                className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-surface p-6 transition-colors hover:border-brand-300 dark:hover:border-brand-800"
              >
                <Quote className="absolute -end-2 -top-2 size-16 text-brand-500/8" />
                <Rating value={item.rating} showValue={false} />
                <blockquote className="flex-1 text-[13px] leading-8 text-muted">{item.body}</blockquote>
                <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600 dark:text-brand-400">
                    {item.userName.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold">
                      {item.userName}
                      {/* خریدِ تأییدشده یعنی نظر از کسی است که همان کالا را از همین‌جا گرفته */}
                      {item.verifiedPurchase && (
                        <BadgeCheck aria-label="خرید تأییدشده" className="size-3.5 shrink-0 text-brand-500" />
                      )}
                    </span>
                    {item.productSlug && item.productTitle ? (
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="block truncate text-[11px] text-muted transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        {item.productTitle}
                      </Link>
                    ) : null}
                  </span>
                </figcaption>
              </motion.figure>
            ))}
      </div>
    </div>
  )
}
