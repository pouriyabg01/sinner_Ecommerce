/**
 * تنها نقطه‌ای که آدرس بک‌اند تعریف می‌شود.
 * فاز mock: درخواست‌ها به این آدرس می‌روند و MSW آن‌ها را intercept می‌کند
 *           (هم در مرورگر با Service Worker، هم در سرور با msw/node).
 * فاز واقعی: کافی است NEXT_PUBLIC_API_URL را ست کنید و
 *           NEXT_PUBLIC_API_MOCKING را روی 'disabled' بگذارید.
 */
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sinner.local/v1'

/**
 * آدرس بک‌اند از دید مرورگر همان آدرس عمومی سایت است، ولی رندر سمت سرور داخل
 * شبکه‌ی داکر انجام می‌شود و به آن آدرس عمومی راه ندارد؛ آنجا باید نام سرویس
 * صدا زده شود. بیرون از داکر INTERNAL_API_URL خالی است و هیچ فرقی نمی‌کند.
 */
export const API_BASE_URL =
  typeof window === 'undefined' ? (process.env.INTERNAL_API_URL ?? PUBLIC_API_URL) : PUBLIC_API_URL

export const MOCKING_ENABLED = (process.env.NEXT_PUBLIC_API_MOCKING ?? 'enabled') !== 'disabled'

/** تأخیر مصنوعی شبکه تا اسکلتون‌ها و حالت loading واقعی دیده شوند */
export const MOCK_LATENCY_MS = 320
