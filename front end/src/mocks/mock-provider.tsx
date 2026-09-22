'use client'

import { useEffect, useState } from 'react'
import { MOCKING_ENABLED } from '@/lib/api/config'

/**
 * لایه‌ی mock با گرفتنِ خودِ fetch بالا می‌آید، نه با Service Worker.
 *
 * چرا SW کنار گذاشته شد: `mockServiceWorker.js` همه‌ی درخواست‌های هم‌ریشه را
 * می‌گیرد — چانک‌های جاوااسکریپت، پیلود RSC، تصویر و ترافیک HMR — و هرکدام را
 * از راه یک MessageChannel به صفحه پاس می‌دهد تا صفحه بگوید mock کند یا رد کند.
 * آن انتظار هیچ timeout ای ندارد؛ اگر پاسخِ صفحه گم شود (مثلاً ماژول MSW وسط
 * Fast Refresh دوباره ارزیابی شود یا تب مشغول باشد)، آن درخواست تا ابد pending
 * می‌ماند. نتیجه‌اش همان «صفحه روی loading گیر می‌کند و باید refresh کنم» است،
 * روی هر صفحه‌ای که آن لحظه چانکی می‌گرفت.
 *
 * تنها لایه‌ای که در این اپ با شبکه حرف می‌زند `apiFetch` است، پس گرفتنِ fetch
 * صددرصدِ چیزی را که باید mock شود پوشش می‌دهد و بقیه‌ی ترافیک اصلاً از این
 * مسیر رد نمی‌شود.
 */
let startPromise: Promise<void> | null = null

function startMocking(): Promise<void> {
  startPromise ??= (async () => {
    const { installFetchFallback } = await import('./fetch-fallback')
    installFetchFallback()
    void unregisterMockWorker()
  })()

  return startPromise
}

/**
 * نسخه‌های قبلی این اپ mockServiceWorker را ثبت می‌کردند و آن ثبت در مرورگرِ
 * کاربر باقی می‌ماند. تا وقتی پاک نشود، همان SW سرِ راهِ هر درخواست می‌ایستد.
 */
async function unregisterMockWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations
        .filter((registration) => {
          const worker = registration.active ?? registration.waiting ?? registration.installing
          return worker?.scriptURL.includes('mockServiceWorker.js')
        })
        .map((registration) => registration.unregister()),
    )
  } catch (error) {
    console.warn('[msw] پاک کردن Service Worker قدیمی ناموفق بود:', error)
  }
}

/**
 * تا وقتی لایه‌ی mock نصب نشده، فرزندان render نمی‌شوند؛
 * وگرنه اولین fetch ها به بیرون نشت می‌کنند و خطا می‌گیرند.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKING_ENABLED)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!MOCKING_ENABLED) return
    let cancelled = false

    startMocking()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((error) => {
        // اگر نصب نشد، اپ را زندانی اسپلش نمی‌کنیم؛
        // صفحه render می‌شود و خطای هر درخواست جداگانه دیده می‌شود.
        console.error('[msw] راه‌اندازی mock ناموفق بود:', error)
        startPromise = null
        if (!cancelled) {
          setFailed(true)
          setReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <span className="font-display text-2xl font-bold tracking-[0.35em] text-brand-500">SINNER</span>
          <span className="h-0.5 w-40 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full w-1/3 animate-[marquee_1.1s_ease-in-out_infinite] rounded-full bg-brand-500" />
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      {failed && (
        <div className="bg-ember-500 px-4 py-2 text-center text-[12px] text-white">
          لایه‌ی داده‌ی آزمایشی (MSW) راه‌اندازی نشد — لطفاً کنسول مرورگر را بررسی کنید.
        </div>
      )}
      {children}
    </>
  )
}
