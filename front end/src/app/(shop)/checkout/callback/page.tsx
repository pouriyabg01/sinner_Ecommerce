'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * صفحه‌ی بازگشت از بانک.
 *
 * بانک کاربر را به بک‌اند برمی‌گرداند، آنجا تراکنش سمت سرور تأیید می‌شود و بعد
 * کاربر با نتیجه‌ی قطعی به اینجا می‌رسد. پس این صفحه فقط نتیجه را نشان می‌دهد
 * و هیچ‌وقت خودش چیزی را «پرداخت‌شده» نمی‌کند — پارامترهای URL قابل دستکاری‌اند.
 */
export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={<Skeleton className="container-page my-16 h-72 rounded-card" />}>
      <CallbackResult />
    </Suspense>
  )
}

function CallbackResult() {
  const params = useSearchParams()
  const status = params.get('status')
  // همین صفحه هم بازگشتِ سفارش را نشان می‌دهد و هم بازگشتِ هزینه‌ی تعمیر
  const type = params.get('type') === 'repair' ? 'repair' : 'order'
  const orderCode = params.get('code')
  const referenceId = params.get('ref')
  const message = params.get('message')
  const paid = status === 'success'
  const backHref = type === 'repair' ? '/profile/repairs' : '/profile/orders'

  return (
    <div className="container-page py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`mx-auto max-w-lg space-y-6 rounded-card border bg-surface p-8 text-center ${
          paid ? 'border-brand-500/30' : 'border-red-500/30'
        }`}
      >
        <span
          className={`mx-auto grid size-16 place-items-center rounded-3xl ${
            paid ? 'bg-brand-500/12 text-brand-600 dark:text-brand-400' : 'bg-red-500/12 text-red-500'
          }`}
        >
          {paid ? <CheckCircle2 className="size-8" /> : <XCircle className="size-8" />}
        </span>

        <div className="space-y-2">
          <h1 className="text-lg font-bold">
            {paid
              ? 'پرداخت با موفقیت انجام شد'
              : status === 'not_found'
                ? 'موردی پیدا نشد'
                : 'پرداخت انجام نشد'}
          </h1>
          <p className="text-[13px] leading-7 text-muted">
            {paid
              ? type === 'repair'
                ? 'هزینه‌ی تعمیر پرداخت شد و تعمیر دستگاه شما شروع می‌شود.'
                : 'سفارش شما ثبت شد و در حال آماده‌سازی است. جزئیات به‌زودی پیامک می‌شود.'
              : (message ??
                'اگر مبلغی از حساب شما کم شده باشد، طبق قوانین بانک مرکزی حداکثر تا ۷۲ ساعت بازمی‌گردد.')}
          </p>
        </div>

        {orderCode && (
          <div className="space-y-2 rounded-2xl bg-surface-2 px-4 py-3">
            <p className="flex items-center justify-center gap-2">
              <span className="text-xs text-muted">{type === 'repair' ? 'کد پیگیری تعمیر:' : 'شماره سفارش:'}</span>
              <span className="en-code text-sm font-bold">{orderCode}</span>
            </p>
            {referenceId && (
              <p className="flex items-center justify-center gap-2">
                <span className="text-xs text-muted">کد پیگیری بانک:</span>
                <span className="en-code text-sm font-bold">{referenceId}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {paid ? (
            <Link href={backHref} className={buttonVariants()}>
              {type === 'repair' ? 'پیگیری تعمیر' : 'پیگیری سفارش'}
            </Link>
          ) : (
            <>
              {/* تلاش دوباره از همان صفحه‌ی پیگیری انجام می‌شود؛ سبد خرید دیگر خالی شده است */}
              <Link href={backHref} className={buttonVariants()}>
                <RotateCcw className="size-4" />
                {type === 'repair' ? 'تلاش دوباره از تعمیرات من' : 'تلاش دوباره از سفارش‌های من'}
              </Link>
              <Link href="/" className={buttonVariants({ variant: 'ghost' })}>
                بازگشت به فروشگاه
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
