'use client'

import { useEffect } from 'react'
import NotFound from '@/app/not-found'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useHydrated } from '@/lib/use-hydrated'
import { useSession } from '@/store/session'

const TITLE = 'پنل مدیریت | سینر'

/**
 * پنل برای هر کسی جز ادمینِ واردشده وجود ندارد.
 *
 * مهمان یا مشتری‌ای که آدرس را حدس بزند همان ۴۰۴ همیشگی سایت را می‌بیند، نه
 * قالب پنل با پیام «دسترسی ندارید» که خودش وجود پنل را لو می‌داد. نشست در
 * localStorage است، پس تا hydrate چیزی رندر نمی‌شود و HTML سرور هم نشانی از پنل
 * ندارد. امنیت واقعی همچنان در بک‌اند است (EnsurePermission)؛ این فقط پنهان‌کاری است.
 *
 * در حالت mock ورودی وجود ندارد و سوییچ نقش داخل خود پنل است، پس باز می‌ماند.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated()
  const allowed = useSession((s) => MOCKING_ENABLED || (Boolean(s.token) && s.role !== 'customer'))

  // عنوان تب در متادیتای layout نیست تا در HTML سرور دیده نشود. نکست بعد از
  // hydrate و با هر ناوبری عنوان پیش‌فرض ریشه را برمی‌گرداند، پس یک بار گذاشتن
  // کافی نیست و هر تغییر <head> زیر نظر است.
  useEffect(() => {
    if (!hydrated || !allowed) return
    const apply = () => {
      if (document.title !== TITLE) document.title = TITLE
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [hydrated, allowed])

  if (MOCKING_ENABLED) return <>{children}</>
  if (!hydrated) return <div className="min-h-dvh bg-background" />
  if (!allowed) return <NotFound />
  return <>{children}</>
}
