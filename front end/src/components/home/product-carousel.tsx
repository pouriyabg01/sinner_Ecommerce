'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import type { ProductQuery } from '@/types/catalog'
import { useProducts } from '@/lib/api/queries'
import { SectionHeading } from '@/components/ui/section-heading'
import { ProductCard, ProductCardSkeleton } from '@/components/product/product-card'
import { cn } from '@/lib/utils'

function queryFromSource(props: SectionProps['product_carousel']): ProductQuery {
  const base: ProductQuery = { perPage: props.limit }
  switch (props.source) {
    case 'discounted':
      return { ...base, hasDiscount: true, sort: 'discount' }
    case 'newest':
      return { ...base, sort: 'newest' }
    case 'category':
      return { ...base, category: props.categorySlug as ProductQuery['category'] }
    case 'manual':
      // کالاها با شناسه گرفته می‌شوند؛ ترتیب نمایش را پایین‌تر خود سکشن می‌چیند
      return { ...base, ids: props.productIds ?? [], perPage: props.productIds?.length || 1 }
    case 'featured':
    default:
      return { ...base, sort: 'popular' }
  }
}

export function ProductCarousel(props: SectionProps['product_carousel']) {
  const [emblaRef, embla] = useEmblaCarousel({ direction: 'rtl', align: 'start', containScroll: 'trimSnaps' })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!embla) return
    setCanPrev(embla.canScrollPrev())
    setCanNext(embla.canScrollNext())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    embla.on('select', onSelect).on('reInit', onSelect)
    onSelect()
  }, [embla, onSelect])

  const { data, isLoading } = useProducts(queryFromSource(props))

  let items = data?.items ?? []
  if (props.source === 'featured') items = items.filter((p) => p.isFeatured)
  // ترتیبی که ادمین چیده مهم است، پس روی همان فهرست شناسه‌ها map می‌شود
  if (props.source === 'manual') {
    items = (props.productIds ?? [])
      .map((id) => items.find((p) => p.id === id))
      .filter(Boolean) as typeof items
  }
  items = items.slice(0, props.limit)

  return (
    <div className="container-page">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading title={props.title} href={props.href} className="mb-7 flex-1" />
        <div className="mb-7 hidden shrink-0 gap-1.5 sm:flex">
          {[
            { dir: 'prev' as const, Icon: ChevronRight, enabled: canPrev, label: 'قبلی' },
            { dir: 'next' as const, Icon: ChevronLeft, enabled: canNext, label: 'بعدی' },
          ].map(({ dir, Icon, enabled, label }) => (
            <button
              key={dir}
              onClick={() => (dir === 'prev' ? embla?.scrollPrev() : embla?.scrollNext())}
              disabled={!enabled}
              aria-label={label}
              className={cn(
                'grid size-10 place-items-center rounded-xl border border-border transition-colors',
                enabled ? 'hover:border-brand-400 hover:text-brand-600' : 'opacity-35',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/*
        overflow-hidden ویوپورت امبلا (که برای کروسل لازم است) سایه‌ی hover کارت را می‌بُرید.
        پدینگ به کلیپ فضا می‌دهد و مارجین منفی همان اندازه را از جریان صفحه پس می‌گیرد،
        پس چیدمان تکان نمی‌خورد.

        عدد ۶۴ پیکسل اندازه‌گیری شده است، نه تخمینی: سایه‌ی --shadow-lift روی
        پس‌زمینه‌ی سفید تا ۶۳ پیکسل زیر لبه‌ی کارت هنوز رنگ دارد. فرمول رایج
        «نصف بلر» اینجا گمراه‌کننده است چون دُم گاوسی مرورگر تا نزدیک کل شعاع بلر می‌رسد.

        بالا فقط ۸ پیکسل لازم است (سایه رو به پایین است) و بیشتر از آن هم نمی‌دهیم،
        چون ویوپورت روی تیتر سکشن و دکمه‌های قبلی/بعدی می‌افتاد و کلیکشان را می‌گرفت.

        pointer-events-none روی ویوپورت و auto روی کانتینر: ناحیه‌ی پدینگ نباید
        جلوی کلیکِ سکشن بعدی را بگیرد. رویداد از کارت‌ها بابل می‌شود، پس درگ امبلا سالم می‌ماند.
      */}
      <div ref={emblaRef} className="pointer-events-none -mt-2 -mb-16 overflow-hidden pt-2 pb-16">
        <div className="pointer-events-auto flex gap-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="min-w-0 flex-[0_0_72%] sm:flex-[0_0_44%] lg:flex-[0_0_30%] xl:flex-[0_0_23%]">
                  <ProductCardSkeleton />
                </div>
              ))
            : items.map((product, i) => (
                <div
                  key={product.id}
                  className="min-w-0 flex-[0_0_72%] sm:flex-[0_0_44%] lg:flex-[0_0_30%] xl:flex-[0_0_23%]"
                >
                  <ProductCard product={product} index={i} />
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
