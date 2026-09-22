import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'

export const metadata: Metadata = { title: 'صفحه پیدا نشد' }

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="space-y-5 text-center">
        <p className="num font-display text-7xl font-bold text-brand-500/25">۴۰۴</p>
        <h1 className="text-xl font-bold">این صفحه یافت نشد</h1>
        <p className="mx-auto max-w-sm text-[13px] leading-8 text-muted">
          ممکن است آدرس صفحه نادرست باشد یا صفحه حذف شده باشد. لطفاً از صفحه‌ی اصلی ادامه دهید.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link href="/" className={buttonVariants()}>
            صفحه اصلی
          </Link>
          <Link href="/products" className={buttonVariants({ variant: 'outline' })}>
            فروشگاه
          </Link>
        </div>
      </div>
    </div>
  )
}
