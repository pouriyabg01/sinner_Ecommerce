import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { catalogApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queries'
import { makeServerQueryClient, prefetch } from '@/lib/api/prefetch'
import { ProductView } from './product-view'

/**
 * صفحه‌ی کالا روی سرور ساخته می‌شود: کالا و نظرهایش از پیش گرفته می‌شوند تا HTML اولیه
 * نام، قیمت، مشخصات و نظرها را داشته باشد. بخش تعاملی (انتخاب مدل، سبد، مقایسه) همان
 * کامپوننت مرورگر است که حالا با داده‌ی آماده شروع می‌کند، نه با اسکلتون.
 */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const client = makeServerQueryClient()

  await Promise.all([
    prefetch(client, qk.product(slug), () => catalogApi.detail(slug)),
    prefetch(client, qk.reviews(slug), () => catalogApi.reviews(slug)),
  ])

  return (
    <HydrationBoundary state={dehydrate(client)}>
      <ProductView slug={slug} />
    </HydrationBoundary>
  )
}
