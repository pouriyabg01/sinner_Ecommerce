import { API_BASE_URL } from '@/lib/api/config'
import { handlers } from './handlers'

/**
 * لایه‌ی mock سمت مرورگر: خودِ `fetch` گرفته می‌شود و همان handlerهای MSW
 * روی آن اجرا می‌شوند.
 *
 * جای Service Worker از این استفاده می‌کنیم چون SW همه‌ی درخواست‌های هم‌ریشه را
 * از راه یک MessageChannel بدون timeout به صفحه پاس می‌داد و گم‌شدنِ یک پاسخ،
 * درخواست را تا ابد pending نگه می‌داشت (صفحه روی loading گیر می‌کرد). ضمناً
 * SW فقط روی https یا localhost در دسترس است، پس باز کردن سایت با آی‌پی محلی
 * روی گوشی (`http://192.168.x.x:3000`) هم با همین مسیر کار می‌کند.
 *
 * فقط درخواست‌های API گرفته می‌شوند؛ بقیه (اسکریپت، تصویر، HMR) دست‌نخورده
 * به fetch اصلی می‌روند.
 */
let installed = false

export function installFetchFallback() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalFetch = window.fetch.bind(window)
  let requestCounter = 0

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url

    if (!url.startsWith(API_BASE_URL)) return originalFetch(input as RequestInfo, init)

    const request = new Request(input as RequestInfo, init)
    const requestId = `fetch-fallback-${++requestCounter}`

    for (const handler of handlers) {
      // هر handler یک کپی از request می‌گیرد تا بدنه‌اش برای بعدی مصرف نشود
      const result = await handler.run({ request: request.clone() as never, requestId })
      if (result?.response) return result.response
    }

    // هیچ handlerی مطابقت نداشت — همان رفتار onUnhandledRequest: 'bypass'
    return originalFetch(request)
  }
}
