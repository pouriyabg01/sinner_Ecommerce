'use client'

import { useEffect } from 'react'

/**
 * عنوان تب برای صفحه‌هایی که تیترشان از دیتای کلاینتی می‌آید (مثل صفحه‌ی محصول).
 * صفحه‌های ثابت عنوانشان را از `metadata` لایه‌ی سرور می‌گیرند؛ این هوک فقط
 * جایی لازم است که عنوان قبل از رسیدن دیتا معلوم نیست.
 *
 * توجه: این عنوان در HTML سمت سرور نیست، پس برای موتور جست‌وجو حساب نمی‌شود.
 * با وصل شدن API واقعی، جایش `generateMetadata` می‌نشیند.
 */
export function usePageTitle(title: string | null | undefined, suffix = 'سینر') {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} | ${suffix}`
    return () => {
      document.title = previous
    }
  }, [title, suffix])
}
