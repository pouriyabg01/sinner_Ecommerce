import type { PaymentSettings } from '@/types/cms'
import { PAYMENT_METHOD_LABEL, type PaymentMethodId } from '@/types/order'
import { formatPrice } from '@/lib/format'

/**
 * پیکربندی پیش‌فرض پرداخت. هم seed دیتابیس mock از این می‌خواند و هم صفحه‌ی
 * تسویه وقتی بک‌اند هنوز بلوک `payment` را برنمی‌گرداند، تا فرم پرداخت هیچ‌وقت
 * خالی نماند.
 */
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  methods: [
    {
      id: 'online',
      enabled: true,
      label: PAYMENT_METHOD_LABEL.online,
      hint: 'انتقال به درگاه بانکی',
      minTotal: 0,
      maxTotal: 0,
    },
    {
      id: 'cod',
      enabled: true,
      label: PAYMENT_METHOD_LABEL.cod,
      hint: 'هنگام تحویل به پیک',
      minTotal: 0,
      // پرداخت در محل برای سفارش سنگین ریسک دارد
      maxTotal: 50_000_000,
    },
    {
      id: 'installment',
      enabled: true,
      label: PAYMENT_METHOD_LABEL.installment,
      hint: 'با بررسی اعتبارسنجی',
      minTotal: 20_000_000,
      maxTotal: 0,
    },
  ],
  gateway: {
    provider: 'zarinpal',
    label: 'زرین‌پال',
    // تا وقتی سرور نگفته درگاه تنظیم شده، صفحه‌ی تسویه نباید وعده‌ی پرداخت بدهد
    ready: false,
  },
  demo: {
    // تا وقتی شناسه‌ی پذیرنده‌ی واقعی نداریم، مسیر پرداخت با درگاه ساختگی تست می‌شود
    enabled: true,
    outcome: 'ask',
    delayMs: 1200,
  },
}

export interface AvailableMethod {
  id: PaymentMethodId
  label: string
  hint: string
  /** وقتی پر است، روش به‌خاطر مبلغ سفارش قابل انتخاب نیست و دلیلش همین متن است */
  blockedReason: string | null
}

/**
 * روش‌های روشن، به‌ترتیب تنظیمات، همراه با دلیل غیرفعال بودنشان برای این مبلغ.
 * روش خارج از بازه حذف نمی‌شود تا کاربر بفهمد چرا نمی‌تواند انتخابش کند.
 */
export function availableMethods(settings: PaymentSettings, total: number): AvailableMethod[] {
  return settings.methods
    .filter((m) => m.enabled)
    .map((m) => {
      // درگاه هر مبلغی را می‌پذیرد؛ مقدار قدیمیِ ذخیره‌شده هم نباید جلوی خرید را بگیرد
      const minTotal = m.id === 'online' ? 0 : m.minTotal
      const maxTotal = m.id === 'online' ? 0 : m.maxTotal

      return {
        id: m.id,
        label: m.label,
        hint: m.hint,
        blockedReason:
          minTotal > 0 && total < minTotal
            ? `از ${formatPrice(minTotal)} به بالا`
            : maxTotal > 0 && total > maxTotal
              ? `تا سقف ${formatPrice(maxTotal)}`
              : null,
      }
    })
}
