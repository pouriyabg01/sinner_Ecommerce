'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'

/**
 * خطای پیش‌بینی‌نشده در یک صفحه. بدون این فایل، نکست صفحه‌ی خطای انگلیسی خودش را
 * نشان می‌داد و کاربر راهی برای ادامه نداشت.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <title>خطا | سینر</title>
      <div className="space-y-5 text-center">
        <p className="font-display text-6xl font-bold text-ember-500/30">!</p>
        <h1 className="text-xl font-bold">مشکلی پیش آمد</h1>
        <p className="mx-auto max-w-sm text-[13px] leading-8 text-muted">
          نمایش این صفحه با خطا روبه‌رو شد. دوباره امتحان کنید؛ اگر مشکل ماند، از صفحه‌ی اصلی ادامه دهید.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button onClick={reset}>
            <RotateCcw className="size-4" />
            تلاش دوباره
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  )
}
