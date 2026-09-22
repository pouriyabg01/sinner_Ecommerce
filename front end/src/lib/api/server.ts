/**
 * خواندن از API در سمت سرور — فقط برای متادیتا، داده‌ی ساختاریافته و نقشه‌ی سایت.
 * فقط از کامپوننت‌های سرور (layout، sitemap، robots) import شود.
 * در حالت داده‌ی ساختگی (MSW فقط در مرورگر اجرا می‌شود) یا وقتی API در دسترس نیست
 * null برمی‌گرداند تا صفحه با متادیتای عمومی ساخته شود، نه اینکه خطا بدهد.
 */
import { API_BASE_URL } from './config'

const API = API_BASE_URL
const REAL_API = Boolean(process.env.NEXT_PUBLIC_API_URL) && process.env.NEXT_PUBLIC_API_MOCKING === 'disabled'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sinner.shop').replace(/\/$/, '')

/**
 * پاسخ کامل با کد وضعیت؛ `null` یعنی API در دسترس نیست (یا حالت داده‌ی ساختگی است) —
 * که با «پیدا نشد» فرق دارد و نباید صفحه را ۴۰۴ کند.
 */
export async function serverGet<T>(path: string, revalidate = 300): Promise<{ status: number; data: T | null } | null> {
  if (!REAL_API) return null
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate },
      signal: AbortSignal.timeout(4000),
    })
    return { status: res.status, data: res.ok ? ((await res.json()) as T) : null }
  } catch {
    return null
  }
}

export async function serverFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  return (await serverGet<T>(path, revalidate))?.data ?? null
}

/** آدرس کامل برای موتور جست‌وجو و شبکه‌های اجتماعی؛ تصویرهای کالا مسیر نسبی دارند */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString()
