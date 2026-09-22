'use client'

import type { RepairPickupSetting, RepairSettings } from '@/types/cms'
import type { FieldErrors } from '@/lib/validation'
import { AdminCard } from '@/components/admin/data-table'
import { IconPicker } from '@/components/admin/editor-bits'
import { Badge } from '@/components/ui/badge'
import { Field, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** توضیح رفتار هر روش؛ ادمین باید بداند خاموش کردن یا تغییر متن چه چیزی را جابه‌جا می‌کند */
const BEHAVIOUR: Record<RepairPickupSetting['id'], string> = {
  courier: 'مشتری آدرس و تاریخ ترجیحی مراجعه‌ی پیک را وارد می‌کند.',
  post: 'مشتری فقط آدرس را وارد می‌کند؛ تاریخ پیک پرسیده نمی‌شود.',
  in_person: 'نه آدرس پرسیده می‌شود نه تاریخ؛ مشتری خودش به شعبه می‌آید.',
}

/**
 * ویرایش روش‌های تحویل دستگاه در فرم تعمیر. شناسه‌ها ثابت‌اند چون سرور، پنل
 * تعمیرها و گزارش‌ها روی همان سه مقدار حساب می‌کنند؛ آنچه ادمین عوض می‌کند
 * تیتر بخش، عنوان و توضیح هر کارت، آیکون، و روشن/خاموش بودن آن است.
 */
export function RepairPickupCard({
  value,
  onChange,
  errors,
}: {
  value: RepairSettings
  onChange: (next: RepairSettings) => void
  /** خطاهای فرم تنظیمات؛ کلیدها با `repair.` شروع می‌شوند */
  errors: FieldErrors
}) {
  const patch = (id: string, next: Partial<RepairPickupSetting>) =>
    onChange({ ...value, methods: value.methods.map((m) => (m.id === id ? { ...m, ...next } : m)) })

  return (
    <AdminCard
      title="روش‌های تحویل دستگاه (تعمیر)"
      action={<span className="text-[11px] text-muted">فقط روش‌های روشن در فرم تعمیر دیده می‌شوند</span>}
    >
      <div className="space-y-3 p-5">
        <Field label="تیتر بخش" error={errors['repair.title']}>
          <Input
            value={value.title}
            invalid={Boolean(errors['repair.title'])}
            placeholder="دستگاه را چگونه به دست ما می‌رسانید؟"
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </Field>

        {errors['repair.methods'] && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {errors['repair.methods']}
          </p>
        )}

        {value.methods.map((method, i) => (
          <div
            key={method.id}
            className={cn(
              'space-y-4 rounded-2xl border p-4 transition-colors',
              method.enabled ? 'border-border' : 'border-dashed border-border bg-surface-2/40',
            )}
          >
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={method.enabled}
                onChange={(e) => patch(method.id, { enabled: e.target.checked })}
                className="size-4 accent-[var(--color-brand-500)]"
              />
              <span className="text-[13px] font-bold">{method.label || method.id}</span>
              <Badge tone={method.enabled ? 'success' : 'neutral'}>{method.enabled ? 'فعال' : 'خاموش'}</Badge>
            </label>

            <p className="text-[11.5px] leading-6 text-muted">{BEHAVIOUR[method.id]}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان" required error={errors[`repair.methods.${i}.label`]}>
                <Input
                  value={method.label}
                  invalid={Boolean(errors[`repair.methods.${i}.label`])}
                  onChange={(e) => patch(method.id, { label: e.target.value })}
                />
              </Field>
              <IconPicker value={method.icon} onChange={(icon) => patch(method.id, { icon })} />
              <Field
                label="توضیح زیر عنوان"
                hint="خالی بگذارید تا فقط عنوان نشان داده شود"
                error={errors[`repair.methods.${i}.hint`]}
                className="sm:col-span-2"
              >
                <Input
                  value={method.hint}
                  invalid={Boolean(errors[`repair.methods.${i}.hint`])}
                  onChange={(e) => patch(method.id, { hint: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  )
}
