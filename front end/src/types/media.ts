/** یک تصویر در کتابخانه‌ی سایت */
export interface MediaItem {
  id: string
  /** نشانی نسبی مثل `/storage/uploads/…` */
  url: string
  /** نام فایل اصلی */
  name: string
  title: string
  alt: string
  caption: string
  mime: string
  /** حجم به بایت */
  size: number
  width: number
  height: number
  createdAt: string
}

export interface MediaPage {
  items: MediaItem[]
  total: number
  page: number
  lastPage: number
}

export type MediaSort = 'newest' | 'oldest' | 'name' | 'largest'

export const MEDIA_SORT_LABEL: Record<MediaSort, string> = {
  newest: 'تازه‌ترین',
  oldest: 'قدیمی‌ترین',
  name: 'نام فایل',
  largest: 'حجیم‌ترین',
}

export interface MediaMeta {
  title?: string
  alt?: string
  caption?: string
}

/**
 * اندازه‌ی پیشنهادی هر جایی که تصویر می‌گیرد.
 *
 * عدد دقیق نیست، راهنماست: تصویر خیلی کوچک کشیده و مات می‌شود و تصویر خیلی بزرگ
 * فقط صفحه را سنگین می‌کند. پنجره‌ی انتخاب همین را کنار هر تصویر می‌سنجد و
 * می‌گوید مناسب است یا نه.
 */
export interface MediaAdvice {
  width: number
  height: number
  note?: string
}

/** آیا این تصویر برای جایی که می‌خواهیم مناسب است */
export function mediaFit(item: MediaItem, advice?: MediaAdvice): 'ok' | 'small' | 'unknown' {
  if (!advice || !item.width || !item.height) return 'unknown'

  // نصفِ اندازه‌ی پیشنهادی هنوز قابل قبول است؛ کمتر از آن روی صفحه‌ی رتینا می‌شکند
  return item.width >= advice.width / 2 && item.height >= advice.height / 2 ? 'ok' : 'small'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`
}
