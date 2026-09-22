import { QueryClient, type QueryKey } from '@tanstack/react-query'
import { MOCKING_ENABLED } from './config'

/** سقف انتظار صفحه برای API؛ بک‌اندِ کند نباید بالا آمدن صفحه را معطل کند */
const PREFETCH_TIMEOUT_MS = 4000

/** هر درخواست صفحه یک QueryClient تازه — کش سرور بین کاربران مشترک نمی‌شود */
export const makeServerQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } })

/**
 * داده‌ای که صفحه‌ی مرورگر لازم دارد، از پیش روی سرور گرفته می‌شود تا HTML اولیه خودِ
 * محتوا را داشته باشد (برای گوگل و اینترنت کند). اگر API دیر جواب دهد یا خطا بدهد،
 * صفحه بدون آن ساخته می‌شود و مرورگر مثل قبل خودش می‌گیرد. در حالت داده‌ی ساختگی،
 * MSW فقط در مرورگر است؛ پس اینجا کاری نمی‌شود.
 */
export async function prefetch(client: QueryClient, queryKey: QueryKey, queryFn: () => Promise<unknown>) {
  if (MOCKING_ENABLED) return
  await Promise.race([
    client.prefetchQuery({ queryKey, queryFn }),
    new Promise((resolve) => setTimeout(resolve, PREFETCH_TIMEOUT_MS)),
  ])
}
