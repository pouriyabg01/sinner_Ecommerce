import type { RepairPickupSetting, RepairSettings } from '@/types/cms'
import { PICKUP_METHOD_LABEL, type PickupMethod } from '@/types/repair'

/**
 * پیکربندی پیش‌فرض روش‌های تحویل دستگاه. هم seed داده‌ی ساختگی از این می‌خواند و
 * هم ویزارد تعمیر وقتی بک‌اند هنوز بلوک `repair` را برنمی‌گرداند — تا مرحله‌ی
 * «تحویل» هیچ‌وقت بدون گزینه نماند. همتای `RepairPickup::DEFAULTS` در بک‌اند است.
 */
export const DEFAULT_REPAIR_SETTINGS: RepairSettings = {
  title: 'دستگاه را چگونه به دست ما می‌رسانید؟',
  methods: [
    {
      id: 'courier',
      enabled: true,
      label: PICKUP_METHOD_LABEL.courier,
      hint: 'پیک سینر در بازه‌ی زمانی انتخابی شما مراجعه و دستگاه را تحویل می‌گیرد.',
      icon: 'home',
    },
    {
      id: 'post',
      enabled: true,
      label: PICKUP_METHOD_LABEL.post,
      hint: 'دستگاه را با پست ارسال کنید؛ هزینه‌ی بازگشت بر عهده‌ی ماست.',
      icon: 'package-check',
    },
    {
      id: 'in_person',
      enabled: true,
      label: PICKUP_METHOD_LABEL.in_person,
      hint: 'به شعبه مراجعه کنید؛ عیب‌یابی در حضور شما انجام می‌شود.',
      icon: 'store',
    },
  ],
}

/**
 * تنظیمات ذخیره‌شده را روی پیش‌فرض می‌نشاند: ترتیب و مجموعه‌ی شناسه‌ها همیشه همان
 * پیش‌فرض می‌ماند (روشی که در تایپ نیست ساخته نمی‌شود و روشی هم گم نمی‌شود) و فقط
 * متن، آیکون و روشن/خاموش بودن از سند تنظیمات می‌آید.
 */
export function repairSettings(saved?: Partial<RepairSettings> | null): RepairSettings {
  const bySavedId = new Map((saved?.methods ?? []).map((m) => [m.id, m]))

  return {
    title: saved?.title?.trim() || DEFAULT_REPAIR_SETTINGS.title,
    methods: DEFAULT_REPAIR_SETTINGS.methods.map((fallback) => {
      const stored = bySavedId.get(fallback.id)
      if (!stored) return { ...fallback }
      return {
        id: fallback.id,
        enabled: stored.enabled ?? fallback.enabled,
        label: stored.label?.trim() || fallback.label,
        hint: stored.hint ?? fallback.hint,
        icon: stored.icon || fallback.icon,
      }
    }),
  }
}

/** روش‌های قابل انتخاب برای مشتری؛ اگر ادمین همه را خاموش کرده باشد، پیش‌فرض برمی‌گردد */
export function enabledPickupMethods(settings: RepairSettings): RepairPickupSetting[] {
  const active = settings.methods.filter((m) => m.enabled)
  return active.length > 0 ? active : DEFAULT_REPAIR_SETTINGS.methods
}

/** عنوانِ ویرایش‌شده‌ی یک روش، با برگشت به برچسب ثابت برای داده‌های قدیمی */
export function pickupLabel(settings: RepairSettings | undefined, id: PickupMethod): string {
  return settings?.methods.find((m) => m.id === id)?.label || PICKUP_METHOD_LABEL[id]
}
