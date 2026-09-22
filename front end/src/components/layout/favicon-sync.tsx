'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSiteSettings } from '@/lib/api/queries'
import { DEFAULT_FAVICON } from '@/lib/brand'

/** نوع فایل را از خود data URL درمی‌آورد تا مرورگر لازم نباشد حدس بزند */
const mimeOf = (href: string) => href.match(/^data:([^;,]+)/)?.[1]

/**
 * آیکون تب مرورگر را با تنظیمات سایت هماهنگ می‌کند.
 * چون آیکون از پنل عوض می‌شود و سرور در زمان build آن را نمی‌داند، اینجا
 * سمت کلاینت روی همان `<link rel="icon">`ای که layout ساخته بازنویسی می‌شود.
 */
export function FaviconSync() {
  const { data } = useSiteSettings()
  // مسیر در وابستگی‌هاست تا اگر ناوبری لینک را دست‌کاری کرد، دوباره اعمال شود
  const pathname = usePathname()
  const href = data?.brand?.favicon || DEFAULT_FAVICON

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }

    const type = mimeOf(href)
    if (type) link.type = type
    else link.removeAttribute('type')
    if (link.href !== href) link.href = href
  }, [href, pathname])

  return null
}
