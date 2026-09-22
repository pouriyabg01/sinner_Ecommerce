'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useWishlist } from '@/lib/api/queries'
import { ProductCard } from '@/components/product/product-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadError } from '@/components/ui/load-error'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { toFaDigits } from '@/lib/format'

/** همان کارت‌های فروشگاه؛ قلبِ پرِ روی هر کارت آن را از لیست برمی‌دارد */
export default function WishlistPage() {
  const { data, isLoading, isError, refetch } = useWishlist()

  if (isError) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <LoadError as="h1" onRetry={() => refetch()} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-card" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          as="h1"
          icon={Heart}
          title="لیست علاقه‌مندی خالی است"
          description="روی قلبِ هر کالا بزنید تا اینجا ذخیره شود و بعداً راحت پیدایش کنید."
          action={
            <Link href="/products" className={buttonVariants({ variant: 'soft' })}>
              رفتن به فروشگاه
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold">علاقه‌مندی‌ها</h1>
        <span className="num text-[13px] text-muted">({toFaDigits(data.length)} کالا)</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {data.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </div>
  )
}
