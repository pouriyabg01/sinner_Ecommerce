import localFont from 'next/font/local'

/**
 * ترکیب دو فونت:
 * - Yekan  → فونت نمایشی (تیتر، لوگو، اعداد بزرگ). فرم هندسی و خاص.
 * - Vazirmatn → فونت متن و رابط کاربری. variable (۱۰۰ تا ۹۰۰) و خوانا.
 * چون گلیف‌های لاتین Yekan ضعیف است، Vazirmatn به عنوان fallback آن تعریف شده.
 */
export const vazirmatn = localFont({
  /*
   * نام فایل عمداً براکت ندارد: با `Vazirmatn[wght].woff2` نکست در لینک preload
   * براکت‌ها را encode می‌کرد (`%5B`) ولی در url@font-face خام می‌گذاشت. مرورگر
   * این دو را یک منبع نمی‌دید، پس هم هشدار «preloaded but not used» می‌داد و هم
   * فونت ۱۱۱ کیلوبایتی را دو بار دانلود می‌کرد.
   */
  src: [{ path: '../../public/fonts/Vazirmatn-Variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-vazirmatn',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  fallback: ['system-ui', 'Segoe UI', 'sans-serif'],
})

export const yekan = localFont({
  src: [
    { path: '../../public/fonts/Yekan-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Yekan-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-yekan',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  fallback: ['Vazirmatn', 'system-ui', 'sans-serif'],
})
