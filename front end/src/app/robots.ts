import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/api/server'

/** صفحه‌های حساب، پرداخت و پنل ارزشی برای موتور جست‌وجو ندارند */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/profile', '/checkout', '/login'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
