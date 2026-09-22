import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { catalogApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queries'
import { makeServerQueryClient, prefetch } from '@/lib/api/prefetch'
import { parseProductQuery } from '@/lib/product-query'
import { ProductsPageClient } from './products-view'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * فهرست کالا روی سرور ساخته می‌شود: همان کوئری‌ای که هوک فیلترها از آدرس می‌سازد، اینجا
 * هم ساخته و از پیش گرفته می‌شود (کالاها و فیلترها). کلید کش باید دقیقاً یکی باشد
 * وگرنه مرورگر داده‌ی سرور را نمی‌شناسد و دوباره می‌گیرد.
 */
export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first !== undefined) params.set(key, first)
  }
  const query = parseProductQuery(params)
  const client = makeServerQueryClient()

  // دسته‌ها را لایه‌ی فروشگاه از پیش گرفته است
  await prefetch(client, qk.products(query), () => catalogApi.list(query))

  return (
    <HydrationBoundary state={dehydrate(client)}>
      <ProductsPageClient />
    </HydrationBoundary>
  )
}
