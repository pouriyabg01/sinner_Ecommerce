'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Package, Truck } from 'lucide-react'
import { useMyOrders } from '@/lib/api/queries'
import { useSession } from '@/store/session'
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/types/order'
import { OrderStatusChip, PaymentStatusChip } from '@/components/ui/status-chip'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { formatDate, formatDateTime, formatPrice, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function OrdersPage() {
  const userId = useSession((s) => s.userId)
  const { data, isLoading } = useMyOrders(userId)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          as="h1"
          icon={Package}
          title="سفارشی ثبت نشده"
          description="اولین سفارش خود را ثبت کنید تا در این بخش نمایش داده شود."
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
      <h1 className="text-lg font-bold">سفارش‌های من</h1>

      {data.map((order) => {
        const open = expanded === order.id
        return (
          <div key={order.id} className="overflow-hidden rounded-card border border-border bg-surface">
            <button
              onClick={() => setExpanded(open ? null : order.id)}
              className="flex w-full flex-wrap items-center gap-3 p-5 text-start transition-colors hover:bg-surface-2/50"
            >
              <span className="en-code text-sm font-bold">{order.code}</span>
              <OrderStatusChip status={order.status} />
              <span className="text-[11px] text-muted">{formatDate(order.createdAt)}</span>
              <span className="num text-[11px] text-muted">{toFaDigits(order.items.length)} کالا</span>
              <span className="num ms-auto text-sm font-bold">{formatPrice(order.total)}</span>
              <ChevronDown className={cn('size-4 text-muted transition-transform', open && 'rotate-180')} />
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.productId + item.variantTitle} className="flex gap-3">
                          <Image
                            src={item.image}
                            alt={item.title}
                            width={56}
                            height={56}
                            className="size-14 rounded-xl bg-ink-950 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium leading-6">{item.title}</p>
                            {item.variantTitle && <p className="text-[11px] text-muted">{item.variantTitle}</p>}
                            <p className="num mt-1 text-[11px] text-muted">
                              {toFaDigits(item.quantity)} × {formatPrice(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                      ))}

                      <dl className="space-y-2 border-t border-border pt-3 text-[12.5px]">
                        {[
                          { label: 'جمع کالاها', value: formatPrice(order.subtotal) },
                          ...(order.discount ? [{ label: 'تخفیف', value: `− ${formatPrice(order.discount)}` }] : []),
                          {
                            label: 'هزینه ارسال',
                            value: order.shippingCost ? formatPrice(order.shippingCost) : 'رایگان',
                          },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-muted">
                            <dt>{row.label}</dt>
                            <dd className="num">{row.value}</dd>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-border pt-2 font-bold">
                          <dt>مبلغ نهایی</dt>
                          <dd className="num">{formatPrice(order.total)}</dd>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-muted">
                          <dt>روش پرداخت</dt>
                          <dd className="flex items-center gap-2">
                            {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                            <PaymentStatusChip status={order.paymentStatus} />
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl bg-surface-2 p-4">
                        <p className="mb-1.5 text-[11px] text-muted">آدرس تحویل</p>
                        <p className="text-[12.5px] leading-7">{order.addressSummary}</p>
                        <p className="mt-2 text-[12px] text-muted">
                          زمان تحویل درخواستی:{' '}
                          {order.preferredDeliveryDate ? formatDate(order.preferredDeliveryDate) : 'زودترین زمان ممکن'}
                        </p>
                        {order.trackingCode && (
                          <p className="num mt-3 flex items-center gap-2 text-[12px]">
                            <Truck className="size-3.5 text-brand-500" />
                            کد رهگیری: <span className="en-code">{order.trackingCode}</span>
                          </p>
                        )}
                      </div>

                      <ol className="relative space-y-3 ps-6">
                        <span className="absolute bottom-1.5 start-2 top-1.5 w-px bg-border" />
                        {order.timeline.map((step, i) => (
                          <li key={i} className="relative">
                            <span
                              className={cn(
                                'absolute -start-6 top-1 size-4 rounded-full ring-4 ring-surface',
                                i === order.timeline.length - 1 ? 'bg-brand-500' : 'bg-brand-500/30',
                              )}
                            />
                            <p className="text-[12.5px] font-medium">{ORDER_STATUS_LABEL[step.status]}</p>
                            <p className="mt-0.5 text-[10.5px] text-muted">{formatDateTime(step.at)}</p>
                            {step.note && <p className="mt-1 text-[11px] text-muted">{step.note}</p>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
