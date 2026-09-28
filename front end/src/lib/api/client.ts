import { API_BASE_URL } from './config'
import { sessionToken } from '@/store/session'

/**
 * سقفِ انتظار برای هر درخواست. بدون این، یک درخواستی که هیچ‌وقت جواب نمی‌گیرد
 * کوئری را برای همیشه در حالت loading نگه می‌دارد و کاربر فقط اسکلتون می‌بیند؛
 * با این، تبدیل به خطای قابل‌دیدن و قابل‌retry می‌شود.
 */
const REQUEST_TIMEOUT_MS = 20_000

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type QueryValue = string | number | boolean | undefined | null | (string | number)[]

export function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '' || value === false) continue
      if (Array.isArray(value)) {
        if (value.length) url.searchParams.set(key, value.join(','))
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, QueryValue>
  body?: unknown
}

/**
 * تنها لایه‌ای که با شبکه حرف می‌زند. هدر احراز هویت، مدیریت خطا و
 * سریال‌سازی همه اینجا جمع است تا اپ موبایل هم بتواند همین را استفاده کند.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers, signal, ...rest } = options

  // روی سرور (پیش‌بارگذاری صفحه) نشستی نیست؛ فقط داده‌ی عمومی کاتالوگ گرفته می‌شود
  const token = typeof window === 'undefined' ? null : sessionToken()
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      ...rest,
      headers: {
        Accept: 'application/json',
        /*
         * پیش‌بارگذاری روی سرور: پاسخِ فشرده‌ی nginx را لایه‌ی fetch نکست باز
         * نمی‌کند و به‌جای JSON یک رشته‌ی بایت تحویل می‌دهد — منو و فوتر آن‌وقت
         * از HTML سرور می‌افتند. درخواست داخلی است و فشرده‌سازی سودی ندارد.
         */
        ...(typeof window === 'undefined' ? { 'Accept-Encoding': 'identity' } : {}),
        // FormData مرز خودش را می‌سازد؛ ست‌کردن دستی Content-Type خرابش می‌کند
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        // بک‌اند واقعی کاربر را از روی همین می‌شناسد؛ در حالت mock توکنی نیست
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError('پاسخی از سرور نرسید؛ دوباره تلاش کنید', 408)
    }
    throw error
  }

  /*
   * نوع پاسخ از خود متن فهمیده می‌شود نه از سرآیند: نکست پاسخِ پیش‌بارگذاری را
   * کش می‌کند و نسخه‌ی کش‌شده سرآیند ندارد، پس شرطِ content-type روی سرور
   * می‌شکست و JSON به‌شکل یک رشته‌ی خام برمی‌گشت — منو و فوتر از HTML سرور
   * می‌افتادند. پاسخی که JSON نیست، مثل قبل به‌صورت متن برمی‌گردد.
   */
  const raw = await response.text()
  let payload: unknown = raw
  try {
    payload = raw ? JSON.parse(raw) : null
  } catch {
    payload = raw
  }

  if (!response.ok) {
    const message =
      (typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? 'خطایی در ارتباط با سرور رخ داد'
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}
