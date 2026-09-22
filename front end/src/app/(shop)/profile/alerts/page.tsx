'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Bell, Trash2 } from 'lucide-react'
import { useStockAlerts, useToggleStockAlert } from '@/lib/api/queries'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadError } from '@/components/ui/load-error'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { formatDate } from '@/lib/format'

/**
 * کالاهایی که مشتری برایشان «موجود شد خبرم کن» زده. بدون سرویس پیامک هم به کار می‌آید:
 * هر کالایی که دوباره موجود شده همین‌جا «موجود شد» نشان داده می‌شود.
 */
export default function StockAlertsPage() {
  const { data, isLoading, isError, refetch } = useStockAlerts()
  const toggle = useToggleStockAlert()

  if (isError) return <LoadError onRetry={() => refetch()} />

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          as="h1"
          icon={Bell}
          title="هنوز برای کالایی «خبرم کن» نزده‌اید"
          description="روی صفحه‌ی کالای ناموجود، دکمه‌ی «موجود شد خبرم کن» را بزنید تا به‌محض موجود شدن خبرتان کنیم."
          action={
            <Link href="/products" className={buttonVariants({ variant: 'soft' })}>
              رفتن به فروشگاه
            </Link>
          }
        />
      </div>
    )
  }

  const ready = data.filter((a) => a.available).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">خبرم کن</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          {ready ? `${ready.toLocaleString('fa-IR')} کالا دوباره موجود شده است.` : 'به‌محض موجود شدن هرکدام خبرتان می‌کنیم.'}
        </p>
      </div>

      <ul className="space-y-3">
        {data.map((alert) => (
          <li key={alert.id} className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-4">
            {alert.image ? (
              <Image
                src={alert.image}
                alt={alert.title}
                width={64}
                height={64}
                unoptimized
                className="size-16 shrink-0 rounded-xl bg-ink-950 object-cover"
              />
            ) : (
              <span className="size-16 shrink-0 rounded-xl bg-surface-2" />
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <Link href={`/product/${alert.slug}`} className="block text-[13.5px] font-bold leading-6 hover:text-brand-600">
                {alert.title}
              </Link>
              {alert.variantTitle && alert.variantTitle !== 'استاندارد' && (
                <p className="text-[11.5px] text-muted">{alert.variantTitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {alert.available ? (
                  <Badge tone="success">موجود شد</Badge>
                ) : (
                  <Badge tone="neutral">در انتظار موجودی</Badge>
                )}
                <span className="text-[11px] text-muted">از {formatDate(alert.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {alert.available && (
                <Link href={`/product/${alert.slug}`} className={buttonVariants({ size: 'sm' })}>
                  مشاهده و خرید
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="حذف از خبرم کن"
                className="text-muted hover:text-red-500"
                disabled={toggle.isPending}
                onClick={() =>
                  toggle.mutate(
                    { alert, productId: alert.productId, variantTitle: alert.variantTitle },
                    { onSuccess: () => toast.success('از فهرست خبرم کن حذف شد') },
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
