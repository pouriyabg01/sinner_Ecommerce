'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import type { Category } from '@/types/catalog'
import { useCategories } from '@/lib/api/queries'
import { SectionHeading } from '@/components/ui/section-heading'
import { Skeleton } from '@/components/ui/skeleton'
import { toFaDigits } from '@/lib/format'

/** بیشتر از این تعداد، شبکه به سطر دوم می‌افتد و به‌جای میان‌بر، فهرست می‌شود */
const LIMIT = 4

type Listed = Category & { productCount: number }

/**
 * بدون انتخاب دستی، دسته‌ها خودشان انتخاب می‌شوند: فقط دسته‌های اصلی (آن‌هایی
 * که مادر ندارند) و از پرکالاترین به کم‌کالاترین. دسته‌ی بی‌کالا نمی‌آید —
 * کارتی که «۰ کالا» بنویسد، کسی را جایی نمی‌برد.
 *
 * فهرست دستی هم به ترتیب خودِ پنل می‌ماند، نه ترتیب پاسخ سرور.
 */
function pick(all: Listed[], slugs: string[]): Listed[] {
  if (slugs.length) {
    return slugs.map((slug) => all.find((c) => c.slug === slug)).filter((c): c is Listed => Boolean(c))
  }

  return all.filter((c) => !c.parentId && c.productCount > 0).sort((a, b) => b.productCount - a.productCount)
}

export function CategoryGrid({ title, categorySlugs }: SectionProps['category_grid']) {
  const { data, isLoading } = useCategories()
  const items = pick(data ?? [], categorySlugs).slice(0, LIMIT)

  // بخشِ بی‌کارت فقط یک عنوان معلق است؛ تا کالایی نباشد اصلاً کشیده نمی‌شود
  if (!isLoading && items.length === 0) return null

  return (
    <div className="container-page">
      <SectionHeading title={title} href="/products" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: LIMIT }).map((_, i) => <Skeleton key={i} className="h-40 rounded-card" />)
          : items.map((cat, i) => {
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                >
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="group relative flex h-full flex-col justify-between overflow-hidden rounded-card border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift dark:hover:border-brand-800"
                  >
                    {/*
                     * هاله‌ی گوشه با گرادیان محو می‌شود، نه دایره‌ی توپر. دایره‌ی توپر لبه‌ی
                     * سختی داشت که overflow-hidden آن را روی حاشیه‌ی کارت می‌برید و گوشه
                     * «بریده» به نظر می‌رسید؛ گرادیان پیش از رسیدن به لبه شفاف شده است.
                     */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -end-10 -top-10 size-36 bg-[radial-gradient(circle,var(--color-brand-500),transparent_70%)] opacity-[0.16] transition-transform duration-500 group-hover:scale-125"
                    />
                    <span className="relative block min-w-0 text-base leading-7 font-bold">{cat.title}</span>
                    <span className="relative mt-3 space-y-1.5">
                      <span className="block text-[11px] leading-5 text-muted">{cat.description}</span>
                      <span className="num flex items-center gap-1 pt-1.5 text-[11px] font-medium text-brand-600 dark:text-brand-400">
                        {toFaDigits(cat.productCount)} کالا
                        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-1" />
                      </span>
                    </span>
                  </Link>
                </motion.div>
              )
            })}
      </div>
    </div>
  )
}
