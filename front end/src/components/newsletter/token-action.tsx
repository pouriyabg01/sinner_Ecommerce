'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, Link2Off, Loader2, MailX } from 'lucide-react'
import { useConfirmSubscription, useUnsubscribe } from '@/lib/api/queries'
import { EmptyState } from '@/components/ui/empty-state'
import { buttonVariants } from '@/components/ui/button'

/**
 * صفحه‌ی مقصد لینک‌های داخل ایمیل: تأیید عضویت و لغو عضویت.
 *
 * هر دو یک شکل دارند — باز شدن صفحه خودش کار را انجام می‌دهد و کاربر فقط نتیجه را
 * می‌بیند. عمداً دکمه‌ی «مطمئنید؟» ندارد: کسی که لینک لغو عضویت را زده تصمیمش را
 * گرفته، و هر مانعی سر راهش او را به‌جای لغو عضویت به دکمه‌ی «هرزنامه» می‌رساند.
 */
export function NewsletterTokenAction({ action }: { action: 'confirm' | 'unsubscribe' }) {
  const { token } = useParams<{ token: string }>()
  const confirm = useConfirmSubscription()
  const unsubscribe = useUnsubscribe()
  const mutation = action === 'confirm' ? confirm : unsubscribe
  const { mutate } = mutation

  /*
   * در حالت توسعه، React هر افکت را دو بار اجرا می‌کند؛ بدون این نگهبان، درخواست
   * دو بار می‌رود و بار دوم خطای «لینک نامعتبر» می‌گیرد.
   */
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    mutate(token)
  }, [token, mutate])

  if (mutation.isPending || mutation.isIdle) {
    return (
      <div className="container-page py-20">
        <EmptyState as="h1" icon={Loader2} title="یک لحظه…" description="در حال بررسی لینک" />
      </div>
    )
  }

  if (mutation.isError) {
    return (
      <div className="container-page py-20">
        <EmptyState
          as="h1"
          icon={Link2Off}
          title="این لینک کار نمی‌کند"
          description="لینک یا منقضی شده یا قبلاً استفاده شده است. اگر می‌خواهید عضو خبرنامه شوید، ایمیلتان را دوباره در صفحه‌ی اصلی ثبت کنید."
          action={
            <Link href="/" className={buttonVariants({ variant: 'soft' })}>
              رفتن به صفحه‌ی اصلی
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page py-20">
      {action === 'confirm' ? (
        <EmptyState
          as="h1"
          icon={CheckCircle2}
          title="عضویت شما تأیید شد"
          description="از این به بعد تخفیف‌ها و کالاهای تازه را برایتان می‌فرستیم. هر وقت خواستید، از پایین همان نامه‌ها می‌توانید عضویت را لغو کنید."
          action={
            <Link href="/products" className={buttonVariants()}>
              دیدن کالاها
            </Link>
          }
        />
      ) : (
        <EmptyState
          as="h1"
          icon={MailX}
          title="عضویت شما لغو شد"
          description="دیگر خبرنامه‌ای برایتان فرستاده نمی‌شود. اگر نظرتان عوض شد، از صفحه‌ی اصلی می‌توانید دوباره عضو شوید."
          action={
            <Link href="/" className={buttonVariants({ variant: 'soft' })}>
              رفتن به صفحه‌ی اصلی
            </Link>
          }
        />
      )}
    </div>
  )
}
