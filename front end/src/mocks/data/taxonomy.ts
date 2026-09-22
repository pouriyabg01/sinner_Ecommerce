import type { Brand, Category, Tag } from '@/types/catalog'

export const categories: Category[] = [
  {
    id: 'cat_mobile',
    slug: 'mobile',
    title: 'گوشی موبایل',
    icon: 'smartphone',
    description: 'پرچم‌داران و میان‌رده‌های روز بازار با گارانتی رسمی',
    specKeys: ['display', 'chipset', 'ram', 'storage', 'battery', 'camera'],
  },
  {
    id: 'cat_laptop',
    slug: 'laptop',
    title: 'لپ‌تاپ و کامپیوتر',
    icon: 'laptop',
    description: 'از اولترابوک‌های سبک تا سیستم‌های گیمینگ سنگین',
    specKeys: ['display', 'cpu', 'gpu', 'ram', 'storage', 'weight'],
  },
  {
    id: 'cat_console',
    slug: 'console',
    title: 'کنسول بازی',
    icon: 'gamepad-2',
    description: 'پلی‌استیشن، ایکس‌باکس و نینتندو با ضمانت اصالت',
    specKeys: ['storage', 'resolution', 'fps', 'controllers'],
  },
  {
    id: 'cat_game',
    slug: 'game',
    title: 'بازی',
    icon: 'disc-3',
    description: 'دیسک و اکانت قانونی جدیدترین بازی‌ها',
    specKeys: ['platform', 'genre', 'players', 'language'],
  },
  {
    id: 'cat_accessory',
    slug: 'accessory',
    title: 'لوازم جانبی',
    icon: 'headphones',
    description: 'هدست، شارژر، کیبورد و هر آنچه تجربه‌ی کاربری شما را کامل می‌کند',
    specKeys: ['type', 'connection', 'battery', 'weight'],
  },
]

export const brands: Brand[] = [
  { id: 'br_apple', slug: 'apple', title: 'اپل', logo: '/img/brands/apple.svg' },
  { id: 'br_samsung', slug: 'samsung', title: 'سامسونگ', logo: '/img/brands/samsung.svg' },
  { id: 'br_xiaomi', slug: 'xiaomi', title: 'شیائومی', logo: '/img/brands/xiaomi.svg' },
  { id: 'br_asus', slug: 'asus', title: 'ایسوس', logo: '/img/brands/asus.svg' },
  { id: 'br_lenovo', slug: 'lenovo', title: 'لنوو', logo: '/img/brands/lenovo.svg' },
  { id: 'br_sony', slug: 'sony', title: 'سونی', logo: '/img/brands/sony.svg' },
  { id: 'br_microsoft', slug: 'microsoft', title: 'مایکروسافت', logo: '/img/brands/microsoft.svg' },
  { id: 'br_nintendo', slug: 'nintendo', title: 'نینتندو', logo: '/img/brands/nintendo.svg' },
  { id: 'br_logitech', slug: 'logitech', title: 'لاجیتک', logo: '/img/brands/logitech.svg' },
]

export const tags: Tag[] = [
  { id: 'tg_bestseller', title: 'پرفروش' },
  { id: 'tg_editor', title: 'پیشنهاد سردبیر' },
  { id: 'tg_gaming', title: 'گیمینگ' },
  { id: 'tg_budget', title: 'اقتصادی' },
  { id: 'tg_flagship', title: 'پرچم‌دار' },
  { id: 'tg_used', title: 'کارکرده تمیز' },
  { id: 'tg_fast', title: 'ارسال فوری' },
  { id: 'tg_warranty', title: 'گارانتی طلایی' },
]

/**
 * برچسب فارسی پیش‌فرض هر کلید مشخصات فنی.
 * کلیدها در Category.specKeys تعریف می‌شوند و صفحه‌ی مقایسه ستون‌هایش را
 * از روی همین کلیدها می‌سازد؛ این نگاشت فقط برای پیش‌پرکردن فرم ادمین است
 * تا برچسب‌ها بین محصول‌های یک دسته یک‌دست بماند.
 */
export const SPEC_LABELS: Record<string, string> = {
  display: 'نمایشگر',
  chipset: 'پردازنده',
  cpu: 'پردازنده',
  gpu: 'گرافیک',
  ram: 'حافظه رم',
  storage: 'حافظه',
  battery: 'باتری',
  camera: 'دوربین اصلی',
  weight: 'وزن',
  resolution: 'رزولوشن',
  fps: 'نرخ فریم',
  controllers: 'دسته همراه',
  platform: 'پلتفرم',
  genre: 'سبک',
  players: 'تعداد بازیکن',
  language: 'زبان',
  type: 'نوع',
  connection: 'اتصال',
}

export function specLabel(key: string) {
  return SPEC_LABELS[key] ?? key
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug)
}

export function getBrand(slug: string) {
  return brands.find((b) => b.slug === slug)
}
