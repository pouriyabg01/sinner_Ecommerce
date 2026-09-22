'use client'

import Image from 'next/image'
import Link from 'next/link'
import { GitCompareArrows, ShoppingBag, X } from 'lucide-react'
import { useCompare } from '@/lib/api/queries'
import { useCompareStore } from '@/store/compare'
import { useCart } from '@/store/cart'
import { Button, buttonVariants } from '@/components/ui/button'
import { Rating } from '@/components/ui/rating'
import { Price } from '@/components/ui/price'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export default function ComparePage() {
  const { ids, remove, clear } = useCompareStore()
  const { data, isLoading, isError, refetch } = useCompare(ids)
  const add = useCart((s) => s.add)

  if (ids.length === 0) {
    return (
      <div className="container-page py-20">
        <EmptyState
          as="h1"
          icon={GitCompareArrows}
          title="لیست مقایسه خالی است"
          description="از صفحه‌ی محصولات، روی آیکون مقایسه کلیک کنید تا بتوانید تا ۴ کالا را کنار هم بررسی کنید."
          action={
            <Link href="/products" className={buttonVariants({ variant: 'soft' })}>
              رفتن به فروشگاه
            </Link>
          }
        />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container-page py-10">
        <LoadError as="h1" onRetry={() => refetch()} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-96 rounded-card" />
      </div>
    )
  }

  const { items, specKeys } = data

  /** برای هر ویژگی، بهترین مقدار عددی را برجسته می‌کنیم */
  const bestScores = new Map<string, number>()
  specKeys.forEach(({ key }) => {
    const scores = items
      .map((p) => p.specs.find((s) => s.key === key)?.score)
      .filter((s): s is number => typeof s === 'number')
    if (scores.length > 1) bestScores.set(key, Math.max(...scores))
  })

  const cheapest = Math.min(...items.map((p) => p.price))

  return (
    <div className="container-page py-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مقایسه محصولات</h1>
          <p className="mt-1.5 text-sm text-muted">مقادیر برتر هر ویژگی با رنگ سبز مشخص شده‌اند.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="size-4" />
          پاک کردن همه
        </Button>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-3xl border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="sticky start-0 z-10 w-40 bg-surface p-4" />
              {items.map((p) => (
                <th key={p.id} className="min-w-52 border-s border-border p-4 align-top">
                  <div className="space-y-3 text-center">
                    <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-2xl bg-ink-950">
                      <Image src={p.images[0]} alt={p.title} fill sizes="128px" className="object-cover" />
                      <button
                        onClick={() => remove(p.id)}
                        aria-label="حذف"
                        className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-lg bg-ink-950/70 text-white transition-colors hover:bg-red-500"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <Link href={`/product/${p.slug}`} className="block text-[13px] font-bold leading-6 hover:text-brand-600">
                      {p.title}
                    </Link>
                    <Rating value={p.rating} count={p.reviewCount} className="justify-center" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-surface-2/40">
              <th className="sticky start-0 z-10 bg-surface-2/40 p-4 text-start font-medium text-muted">قیمت</th>
              {items.map((p) => (
                <td key={p.id} className="border-s border-t border-border p-4 text-center">
                  <Price
                    value={p.price}
                    compareAt={p.compareAtPrice}
                    className={cn('justify-center', p.price === cheapest && 'text-brand-600 dark:text-brand-400')}
                  />
                </td>
              ))}
            </tr>

            {specKeys.map(({ key, label }) => (
              <tr key={key}>
                <th className="sticky start-0 z-10 bg-surface p-4 text-start font-medium text-muted">{label}</th>
                {items.map((p) => {
                  const spec = p.specs.find((s) => s.key === key)
                  const isBest = spec?.score != null && bestScores.get(key) === spec.score
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        'border-s border-t border-border p-4 text-center leading-7',
                        isBest && 'bg-brand-500/8 font-bold text-brand-700 dark:text-brand-300',
                      )}
                    >
                      {spec?.value ?? <span className="text-muted/50">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}

            <tr>
              <th className="sticky start-0 z-10 bg-surface p-4" />
              {items.map((p) => (
                <td key={p.id} className="border-s border-t border-border p-4">
                  <Button
                    block
                    size="sm"
                    disabled={p.stock <= 0}
                    onClick={() => {
                      add({
                        productId: p.id,
                        variantId: p.variants[0].id,
                        title: p.title,
                        variantTitle: '',
                        image: p.images[0],
                        slug: p.slug,
                        unitPrice: p.variants[0].price,
                        maxStock: p.variants[0].stock,
                      })
                      toast.success('به سبد خرید اضافه شد')
                    }}
                  >
                    <ShoppingBag className="size-4" />
                    {p.stock > 0 ? 'خرید' : 'ناموجود'}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
