/**
 * هویت سایت برای موتور جست‌وجو.
 *
 * عنوان و توضیح صفحه‌ها تا امروز ثابت و در کد نوشته شده بودند، پس نام واقعی
 * فروشگاه هیچ‌جای HTML نبود و گوگل راهی نداشت نام را به سایت وصل کند. حالا
 * همه از تنظیمات پنل خوانده می‌شوند.
 */
import type { SiteSettings } from '@/types/cms'
import { BRAND_FALLBACK } from '@/lib/brand'
import { serverFetch } from '@/lib/api/server'

export interface SiteIdentity {
  /** نام فارسی فروشگاه */
  name: string
  /** واژه‌نشان لاتین؛ کسی که نام را با حروف انگلیسی جست‌وجو می‌کند دنبال همین است */
  wordmark: string
  tagline: string
  logo: string
  phone: string
  email: string
  address: string
  socials: string[]
}

const FALLBACK: SiteIdentity = {
  name: BRAND_FALLBACK.siteName,
  wordmark: BRAND_FALLBACK.wordmark,
  tagline: BRAND_FALLBACK.caption,
  logo: '',
  phone: '',
  email: '',
  address: '',
  socials: [],
}

/** تنظیمات سایت از دید سرور؛ در حالت داده‌ی ساختگی یا قطعی API مقدار پشتیبان برمی‌گردد */
export async function siteIdentity(): Promise<SiteIdentity> {
  const settings = await serverFetch<SiteSettings>('/cms/settings', 300)
  if (!settings) return FALLBACK

  return {
    name: settings.siteName?.trim() || FALLBACK.name,
    wordmark: settings.brand?.wordmark?.trim() || FALLBACK.wordmark,
    tagline: settings.tagline?.trim() || FALLBACK.tagline,
    logo: settings.brand?.mark?.trim() || '',
    phone: settings.phone?.trim() || '',
    email: settings.email?.trim() || '',
    address: settings.address?.trim() || '',
    // فقط آدرس‌های کامل؛ sameAs در schema.org مسیر نسبی نمی‌پذیرد
    socials: (settings.socials ?? []).map((s) => s.href).filter((href) => /^https?:\/\//.test(href)),
  }
}

/**
 * نامِ سایت آن‌طور که در عنوان تب می‌نشیند. واژه‌نشان لاتین هم کنارش می‌آید تا
 * جست‌وجوی نام با حروف انگلیسی هم به همین صفحه برسد — مگر اینکه همان نام باشد.
 */
export function titleName({ name, wordmark }: SiteIdentity): string {
  const latin = wordmark && wordmark.toLowerCase() !== name.toLowerCase()

  return latin ? `${name} (${wordmark})` : name
}
