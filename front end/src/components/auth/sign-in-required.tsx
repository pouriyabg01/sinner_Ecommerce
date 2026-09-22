'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useSession } from '@/store/session'
import { useHydrated } from '@/lib/use-hydrated'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * بخشی که فقط کاربر واردشده می‌بیند؛ مهمان به‌جایش دعوت به ورود می‌گیرد و بعد
 * از ورود به همین صفحه برمی‌گردد.
 *
 * بدون این، مهمان فرم‌ها را پر می‌کرد و تازه در مرحله‌ی آخر با خطای سرور
 * روبه‌رو می‌شد — بک‌اند این مسیرها را فقط برای کاربر واردشده باز می‌کند.
 *
 * در حالت mock ورودی وجود ندارد، پس همیشه باز است.
 */
export function SignInRequired({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hydrated = useHydrated()
  const hasToken = useSession((s) => Boolean(s.token))

  if (MOCKING_ENABLED) return <>{children}</>

  // نشست در localStorage است و پیش از hydrate معلوم نیست؛ بدون این، کاربرِ
  // واردشده یک لحظه دعوت به ورود را می‌دید
  if (!hydrated) {
    return (
      <div className="container-page py-8">
        <Skeleton className="h-96 rounded-card" />
      </div>
    )
  }

  if (!hasToken) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-card border border-border bg-surface">
          <EmptyState
            as="h1"
            icon={LogIn}
            title={title}
            description={description}
            action={
              <Link
                // کوئری هم نگه داشته می‌شود؛ مثلاً ?device=laptop در صفحه‌ی تعمیر.
                // این شاخه فقط بعد از hydrate رندر می‌شود، پس window در دسترس است
                href={`/login?next=${encodeURIComponent(pathname + window.location.search)}`}
                className={cn(buttonVariants({ variant: 'primary' }))}
              >
                <LogIn className="size-4" />
                ورود یا ثبت‌نام
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
