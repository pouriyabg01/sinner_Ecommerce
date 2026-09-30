import type { MetadataRoute } from 'next'
import type { Category, Product } from '@/types/catalog'
import { SITE_URL, serverFetch } from '@/lib/api/server'

/**
 * درخواستی ساخته می‌شود، نه هنگام build.
 *
 * پیش از این نکست نقشه را موقع ساختِ ایمیج از پیش می‌ساخت؛ آنجا بک‌اند بالا
 * نیست، پس هر دو درخواست خالی برمی‌گشت و نقشه فقط پنج صفحه‌ی ثابت داشت —
 * بدون حتی یک کالا. با هر استقرار هم همان نسخه‌ی خالی از نو جا می‌افتاد.
 *
 * خودِ درخواست‌ها همچنان یک ساعت کش می‌شوند (`serverFetch`)، پس این تغییر
 * بار اضافه‌ای روی بک‌اند نمی‌گذارد.
 */
export const dynamic = 'force-dynamic'

type Page = { items: Product[]; totalPages: number }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const pages: MetadataRoute.Sitemap = ['', '/products', '/repair/track', '/compare', '/about'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: path === '' ? 1 : 0.7,
  }))

  // فروشگاه فقط دسته و کالای قابل نمایش را برمی‌گرداند؛ کالای غیرفعال در نقشه نمی‌آید
  const categories = (await serverFetch<(Category & { productCount: number })[]>('/categories', 3600)) ?? []
  categories
    .filter((c) => c.productCount > 0)
    .forEach((c) => pages.push({ url: `${SITE_URL}/products?category=${c.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 }))

  for (let page = 1, total = 1; page <= total && page <= 50; page++) {
    // ناموجودها هم می‌مانند: صفحه‌شان باز است و نباید با تمام‌شدن موجودی از نقشه بیفتد
    const result = await serverFetch<Page>(`/products?perPage=100&page=${page}&includeOutOfStock=true`, 3600)
    if (!result) break
    total = result.totalPages
    result.items.forEach((p) =>
      pages.push({ url: `${SITE_URL}/product/${p.slug}`, lastModified: new Date(p.createdAt), changeFrequency: 'weekly', priority: 0.9 }),
    )
  }

  return pages
}
