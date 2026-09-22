import type { MetadataRoute } from 'next'
import type { Category, Product } from '@/types/catalog'
import { SITE_URL, serverFetch } from '@/lib/api/server'

/** هر ساعت از نو ساخته می‌شود تا کالا و دسته‌ی تازه به موتور جست‌وجو معرفی شود */
export const revalidate = 3600

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
    const result = await serverFetch<Page>(`/products?perPage=100&page=${page}`, 3600)
    if (!result) break
    total = result.totalPages
    result.items.forEach((p) =>
      pages.push({ url: `${SITE_URL}/product/${p.slug}`, lastModified: new Date(p.createdAt), changeFrequency: 'weekly', priority: 0.9 }),
    )
  }

  return pages
}
