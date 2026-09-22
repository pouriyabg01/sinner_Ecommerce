'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, FlaskConical, Loader2, Lock, XCircle } from 'lucide-react'
import type { DemoOutcome } from '@/types/cms'
import type { Order } from '@/types/order'
import type { PaymentOutcome } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'

/**
 * درگاه بانکی ساختگی. هیچ تراکنشی انجام نمی‌شود؛ فقط مسیر «انتقال به بانک →
 * نتیجه» را قابل تست می‌کند. با `outcome` غیر از `ask` خودش بعد از تأخیر
 * تصمیم می‌گیرد، تا سناریوهای موفق/ناموفق بدون کلیک هم قابل اجرا باشد.
 */
export function DemoGateway({
  order,
  gatewayLabel,
  merchantName,
  outcome,
  delayMs,
  pending,
  onResolve,
}: {
  order: Order
  gatewayLabel: string
  merchantName: string
  outcome: DemoOutcome
  delayMs: number
  pending: boolean
  onResolve: (outcome: PaymentOutcome) => void
}) {
  const [connecting, setConnecting] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnecting(false)
      // نتیجه‌ی از پیش تعیین‌شده نیازی به کلیک کاربر ندارد
      if (outcome !== 'ask') onResolve(outcome)
    }, Math.max(0, delayMs))
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container-page py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg overflow-hidden rounded-card border border-border bg-surface"
      >
        <p className="flex items-center justify-center gap-2 bg-ember-500/12 px-4 py-2.5 text-[11.5px] font-medium text-ember-700 dark:text-ember-300">
          <FlaskConical className="size-3.5" />
          درگاه آزمایشی — هیچ مبلغی از حساب شما کم نمی‌شود
        </p>

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm font-bold">{gatewayLabel}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <Lock className="size-3.5" />
            اتصال امن
          </span>
        </div>

        <dl className="space-y-3 px-6 py-5 text-[12.5px]">
          <div className="flex justify-between">
            <dt className="text-muted">پذیرنده</dt>
            <dd className="font-medium">{merchantName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">شماره سفارش</dt>
            <dd className="en-code font-medium">{order.code}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <dt className="font-bold">مبلغ قابل پرداخت</dt>
            <dd className="num font-bold text-brand-600 dark:text-brand-400">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <div className="border-t border-border p-6">
          {connecting || pending ? (
            <p className="flex items-center justify-center gap-2 py-4 text-[13px] text-muted">
              <Loader2 className="size-4 animate-spin text-brand-500" />
              {connecting ? `در حال اتصال به ${gatewayLabel}…` : 'در حال ثبت نتیجه‌ی تراکنش…'}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-[12px] text-muted">نتیجه‌ی تراکنش را برای تست انتخاب کنید</p>
              <Button block onClick={() => onResolve('success')}>
                <CheckCircle2 className="size-4" />
                پرداخت موفق
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => onResolve('failed')}>
                  <XCircle className="size-4" />
                  پرداخت ناموفق
                </Button>
                <Button variant="ghost" onClick={() => onResolve('cancelled')}>
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
