'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Link2Off, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api/endpoints'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/lib/use-page-title'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto my-20 h-64 max-w-md rounded-card" />}>
      <VerifyView />
    </Suspense>
  )
}

/**
 * مقصد لینک نامه‌ی تأیید. باز شدن صفحه خودش کار را انجام می‌دهد؛ کاربر فقط
 * نتیجه را می‌بیند.
 */
function VerifyView() {
  usePageTitle('تأیید ایمیل')
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working')

  // در حالت توسعه هر افکت دو بار اجرا می‌شود؛ بدون این نگهبان، بار دوم خطا می‌گیرد
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    if (!token || !email) {
      setState('failed')
      return
    }

    authApi
      .verifyEmail({ token, email })
      .then(() => setState('done'))
      .catch(() => setState('failed'))
  }, [token, email])

  if (state === 'working') {
    return (
      <div className="container-page py-20">
        <EmptyState as="h1" icon={Loader2} title="یک لحظه…" description="در حال بررسی لینک" />
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="container-page py-20">
        <EmptyState
          as="h1"
          icon={Link2Off}
          title="این لینک کار نمی‌کند"
          description="لینک یا منقضی شده یا قبلاً استفاده شده است. از پنل کاربری می‌توانید نامه‌ی تازه بخواهید."
          action={
            <Link href="/profile/account" className={buttonVariants({ variant: 'soft' })}>
              رفتن به حساب کاربری
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page py-20">
      <EmptyState
        as="h1"
        icon={CheckCircle2}
        title="ایمیل شما تأیید شد"
        description="از این به بعد خبر سفارش‌ها و تعمیرهایتان به همین نشانی می‌رسد."
        action={
          <Link href="/profile" className={buttonVariants()}>
            رفتن به پنل کاربری
          </Link>
        }
      />
    </div>
  )
}
