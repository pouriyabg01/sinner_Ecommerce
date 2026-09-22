import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9؀-ۿ-]/g, '')
}

/**
 * اسلاگ لاتینِ آدرس‌پذیر. `slugify` حروف فارسی را نگه می‌دارد (برای جست‌وجو مفید است)
 * ولی اسلاگ دسته و برند در URL می‌نشیند و باید فقط لاتین باشد. اگر عنوان فارسی
 * باشد رشته‌ی خالی برمی‌گردد تا فرم چیزی نامعتبر را روی کاربر ننویسد.
 */
export function latinSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
