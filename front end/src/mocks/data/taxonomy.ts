import type { Brand, Category, Tag } from '@/types/catalog'

export const categories: Category[] = [
  {
    id: 'cat_mobile',
    slug: 'mobile',
    title: 'گوشی موبایل',
    description: 'پرچم‌داران و میان‌رده‌های روز بازار با گارانتی رسمی',
    specKeys: ['display', 'chipset', 'ram', 'storage', 'battery', 'camera'],
  },
  {
    id: 'cat_laptop',
    slug: 'laptop',
    title: 'لپ‌تاپ و کامپیوتر',
    description: 'از اولترابوک‌های سبک تا سیستم‌های گیمینگ سنگین',
    specKeys: ['display', 'cpu', 'gpu', 'ram', 'storage', 'weight'],
  },
  {
    id: 'cat_console',
    slug: 'console',
    title: 'کنسول بازی',
    description: 'پلی‌استیشن، ایکس‌باکس و نینتندو با ضمانت اصالت',
    specKeys: ['storage', 'resolution', 'fps', 'controllers'],
  },
  {
    id: 'cat_game',
    slug: 'game',
    title: 'بازی',
    description: 'دیسک و اکانت قانونی جدیدترین بازی‌ها',
    specKeys: ['platform', 'genre', 'players', 'language'],
  },
  {
    id: 'cat_accessory',
    slug: 'accessory',
    title: 'لوازم جانبی',
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

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug)
}

export function getBrand(slug: string) {
  return brands.find((b) => b.slug === slug)
}
