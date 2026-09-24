import { networkInterfaces } from 'node:os'
import type { NextConfig } from 'next'

/**
 * آی‌پی‌های محلی همین دستگاه.
 *
 * Next در حالت توسعه، درخواست به منابع dev را از هر origin غیر از localhost
 * می‌بندد. برای باز کردن سایت روی گوشیِ همان وای‌فای (`http://192.168.x.x:3210`)
 * باید آن آدرس مجاز باشد، وگرنه چانک‌های داینامیک و HMR بلاک می‌شوند و صفحه
 * روی اسپلش می‌ماند. به‌جای نوشتن دستی آی‌پی، از خود سیستم خوانده می‌شود تا با
 * عوض شدن شبکه هم درست بماند.
 */
const lanOrigins = Object.values(networkInterfaces())
  .flat()
  .filter((iface) => iface?.family === 'IPv4' && !iface.internal)
  .map((iface) => iface!.address)

const nextConfig: NextConfig = {
  allowedDevOrigins: lanOrigins,
  /**
   * خروجی standalone: یک سرور کوچک با همان چند فایلی که واقعاً لازم است.
   * بدون این، تصویر داکر مجبور بود کل node_modules را با خود حمل کند.
   */
  output: 'standalone',
  images: {
    // روی دامنه‌ی واقعی همه‌چیز https است؛ http فقط برای اجرای محلی داکر لازم است.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  /**
   * فایل‌های آپلودشده با نشانی نسبی ذخیره می‌شوند (`/storage/…`) تا به میزبانِ
   * امروز گره نخورند؛ وگرنه تصویرهای آپلودشده روی یک آدرس، بعد از رفتن به دامنه
   * و https همچنان به آدرس قدیمی اشاره می‌کردند.
   *
   * ولی خودِ نکست به این فایل‌ها نمی‌رسد:
   *
   * - موقع توسعه، فرانت و لاراول روی دو پورت جدا هستند.
   * - در اجرای واقعی، درخواستِ مرورگر برای `/storage/…` را nginx جواب می‌دهد و
   *   هیچ‌وقت به نکست نمی‌رسد؛ اما بهینه‌ساز تصویر (`/_next/image`) برای منبعِ
   *   نسبی، درخواست را *داخل خودش* پاسخ می‌دهد و از nginx رد نمی‌شود. بدون این
   *   پل، دنبال فایل در پوشه‌ی `public` می‌گردد و پیدایش نمی‌کند.
   *
   * پس هر دو حالت به یک پل نیاز دارند، فقط مقصدش فرق می‌کند: داخل داکر خودِ
   * nginx، و موقع توسعه لاراول.
   */
  async rewrites() {
    /*
     * این مقصد هنگام «ساخت» در فهرست مسیرها می‌نشیند، نه هنگام اجرا؛ پس
     * `INTERNAL_ORIGIN` باید آرگومانِ ساختِ داکر باشد (در compose ست شده)، نه
     * متغیر محیطیِ کانتینر. موقع توسعه هیچ‌کدام نیست و از آدرس لاراول درمی‌آید.
     */
    const origin =
      process.env.INTERNAL_ORIGIN ?? (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/v1\/?$/, '')
    if (!origin) return []

    return [{ source: '/storage/:path*', destination: `${origin}/storage/:path*` }]
  },
}

export default nextConfig
