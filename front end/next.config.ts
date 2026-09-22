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
}

export default nextConfig
