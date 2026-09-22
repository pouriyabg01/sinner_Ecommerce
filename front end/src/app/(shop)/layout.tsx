import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { catalogApi, repairApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queries'
import { makeServerQueryClient, prefetch } from '@/lib/api/prefetch'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { CartSync } from '@/components/cart/cart-sync'
import { CompareBar } from '@/components/product/compare-bar'

/**
 * هدر و فوتر هم دسته‌ها و خدمات تعمیر را می‌خوانند (تنظیمات سایت را لایه‌ی ریشه می‌گیرد). اینجا از پیش گرفته
 * می‌شوند تا (۱) منو و فوتر در HTML سرور باشند و (۲) صفحه‌ای که همین داده را لازم دارد
 * (مثل فهرست کالا) با هدر یک نسخه ببیند. اگر هدر زودتر کوئری خالی بسازد، داده‌ی سرور
 * برای آن کوئری فقط بعد از بالا آمدن صفحه اعمال می‌شود و HTML سرور با مرورگر فرق می‌کند.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const client = makeServerQueryClient()
  await Promise.all([
    prefetch(client, qk.categories, () => catalogApi.categories()),
    prefetch(client, qk.repairIssues(undefined), () => repairApi.issues()),
  ])

  return (
    <HydrationBoundary state={dehydrate(client)}>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <CartSync />
        <CompareBar />
      </div>
    </HydrationBoundary>
  )
}
