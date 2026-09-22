'use client'

import { useSiteSettings } from '@/lib/api/queries'

/** وقتی تنظیمات هنوز نرسیده، همان مقدارهای seed تا لحظه‌ای بعد جای خالی را پر می‌کنند */
const FALLBACK = { freeThreshold: 5_000_000, cost: 350_000 }

/**
 * قواعد ارسال از تنظیمات سایت. سبد خرید و تسویه هر دو از این می‌خوانند تا
 * وعده‌ی نوار اعلان و مبلغی که واقعاً حساب می‌شود از هم جدا نیفتند.
 */
export function useShipping() {
  const { data } = useSiteSettings()
  return data?.shipping ?? FALLBACK
}
