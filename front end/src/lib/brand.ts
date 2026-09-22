/**
 * نشان پیش‌فرض سایت. یک تعریف، دو مصرف: هم لوگوی داخل صفحه از همین مسیرها
 * ساخته می‌شود، هم آیکون تب مرورگر — تا اگر روزی شکل نشان عوض شد، تب مرورگر
 * عقب نماند.
 */
export const MARK_PATHS = ['M4 17.5 9.5 12 4 6.5', 'M12.5 18h7.5'] as const

/** رنگ زمینه‌ی نشان؛ همان brand-500 است ولی داخل SVG نمی‌شود از متغیر CSS خواند */
const MARK_BG = '#00b392'

/**
 * آیکون پیش‌فرض تب مرورگر به‌صورت data URL.
 * SVG است تا در هر اندازه‌ای تیز بماند و فایل جداگانه‌ای لازم نداشته باشد.
 */
export const DEFAULT_FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
      `<rect width="32" height="32" rx="8" fill="${MARK_BG}"/>` +
      `<g transform="translate(4 4)" fill="none" stroke="#fff" stroke-width="2.2" ` +
      `stroke-linecap="round" stroke-linejoin="round">` +
      MARK_PATHS.map((d) => `<path d="${d}"/>`).join('') +
      `</g></svg>`,
  )

/** مقادیر پشتیبان وقتی تنظیمات هنوز نرسیده یا ادمین خالی‌شان گذاشته */
export const BRAND_FALLBACK = {
  wordmark: 'SINNER',
  caption: 'فروشگاه و تعمیرگاه',
  siteName: 'سینر',
} as const
