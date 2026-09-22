'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import { useCategories } from '@/lib/api/queries'
import { SectionHeading } from '@/components/ui/section-heading'
import { Skeleton } from '@/components/ui/skeleton'
import { getIcon } from '@/lib/icons'
import { toFaDigits } from '@/lib/format'

export function CategoryGrid({ title, categorySlugs }: SectionProps['category_grid']) {
  const { data, isLoading } = useCategories()
  const items = (data ?? []).filter((c) => categorySlugs.includes(c.slug))

  return (
    <div className="container-page">
      <SectionHeading title={title} href="/products" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-card" />)
          : items.map((cat, i) => {
              const Icon = getIcon(cat.icon)
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
                    {/* عنوان کنار آیکون، نه زیرش: کارت کوتاه‌تر و نام دسته زودتر خوانده می‌شود */}
                    <span className="relative flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 dark:text-brand-400">
                        <Icon className="size-6" />
                      </span>
                      <span className="min-w-0 text-sm leading-6 font-bold">{cat.title}</span>
                    </span>
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
