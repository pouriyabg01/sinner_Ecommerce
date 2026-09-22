'use client'

import { CreditCard, FlaskConical } from 'lucide-react'
import {
  DEMO_OUTCOME_LABEL,
  type DemoOutcome,
  type PaymentMethodSetting,
  type PaymentSettings,
} from '@/types/cms'
import type { FieldErrors } from '@/lib/validation'
import { AdminCard } from '@/components/admin/data-table'
import { Badge } from '@/components/ui/badge'
import { Field, Input, PriceInput, Select } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** صفر یعنی «بدون محدودیت»، پس در ورودی خالی نشان داده می‌شود نه ۰ */
const amountValue = (value: number) => (value > 0 ? String(value) : '')

export function PaymentSettingsCards({
  value,
  onChange,
  errors,
}: {
  value: PaymentSettings
  onChange: (next: PaymentSettings) => void
  /** خطاهای فرم تنظیمات؛ کلیدها با `payment.` شروع می‌شوند */
  errors: FieldErrors
}) {
  const patchMethod = (id: string, patch: Partial<PaymentMethodSetting>) =>
    onChange({ ...value, methods: value.methods.map((m) => (m.id === id ? { ...m, ...patch } : m)) })

  const onlineEnabled = value.methods.some((m) => m.id === 'online' && m.enabled)

  return (
    <>
      <AdminCard
        title="روش‌های پرداخت"
        action={
          <span className="text-[11px] text-muted">
            فقط روش‌های روشن در صفحه‌ی تسویه دیده می‌شوند
          </span>
        }
      >
        <div className="space-y-3 p-5">
          {errors['payment.methods'] && (
            <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {errors['payment.methods']}
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
                  onChange={(e) => patchMethod(method.id, { enabled: e.target.checked })}
                  className="size-4 accent-[var(--color-brand-500)]"
                />
                <span className="text-[13px] font-bold">{method.label || method.id}</span>
                <Badge tone={method.enabled ? 'success' : 'neutral'}>{method.enabled ? 'فعال' : 'خاموش'}</Badge>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="عنوان" required error={errors[`payment.methods.${i}.label`]}>
                  <Input
                    value={method.label}
                    invalid={Boolean(errors[`payment.methods.${i}.label`])}
                    onChange={(e) => patchMethod(method.id, { label: e.target.value })}
                  />
                </Field>
                <Field label="توضیح زیر عنوان" error={errors[`payment.methods.${i}.hint`]}>
                  <Input
                    value={method.hint}
                    invalid={Boolean(errors[`payment.methods.${i}.hint`])}
                    onChange={(e) => patchMethod(method.id, { hint: e.target.value })}
                  />
                </Field>
                {/* درگاه بانکی هر مبلغی را می‌پذیرد، پس کف و سقف برایش معنا ندارد */}
                {method.id === 'online' ? (
                  <p className="text-[11.5px] leading-6 text-muted sm:col-span-2">
                    این روش محدودیت مبلغ ندارد؛ سفارش با هر مبلغی از درگاه قابل پرداخت است.
                  </p>
                ) : (
                  <>
                    <Field
                      label="حداقل مبلغ سفارش"
                      hint="خالی یعنی بدون محدودیت"
                      error={errors[`payment.methods.${i}.minTotal`]}
                    >
                      <PriceInput
                        value={amountValue(method.minTotal)}
                        invalid={Boolean(errors[`payment.methods.${i}.minTotal`])}
                        placeholder="بدون محدودیت"
                        onChange={(raw) => patchMethod(method.id, { minTotal: Number(raw || 0) })}
                      />
                    </Field>
                    <Field
                      label="حداکثر مبلغ سفارش"
                      hint="خالی یعنی بدون محدودیت"
                      error={errors[`payment.methods.${i}.maxTotal`]}
                    >
                      <PriceInput
                        value={amountValue(method.maxTotal)}
                        invalid={Boolean(errors[`payment.methods.${i}.maxTotal`])}
                        placeholder="بدون محدودیت"
                        onChange={(raw) => patchMethod(method.id, { maxTotal: Number(raw || 0) })}
                      />
                    </Field>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard
        title="حالت دمو (تست)"
        action={
          <label className="flex cursor-pointer items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={value.demo.enabled}
              onChange={(e) => onChange({ ...value, demo: { ...value.demo, enabled: e.target.checked } })}
              className="size-4 accent-[var(--color-brand-500)]"
            />
            {value.demo.enabled ? 'روشن' : 'خاموش'}
          </label>
        }
      >
        <div className="space-y-4 p-5">
          <p className="flex items-start gap-2 rounded-2xl bg-ember-500/8 p-3.5 text-[12px] leading-6 text-ember-700 dark:text-ember-300">
            <FlaskConical className="mt-0.5 size-4 shrink-0" />
            <span>
              با روشن بودن این گزینه، «{value.methods.find((m) => m.id === 'online')?.label || 'پرداخت اینترنتی'}»
              به‌جای بانک به یک درگاه ساختگی می‌رود. هیچ تراکنش واقعی‌ای ثبت نمی‌شود و نتیجه‌ی پرداخت همان چیزی است
              که اینجا انتخاب می‌کنید — برای تست مسیر موفق، ناموفق و انصراف.
              <b className="mx-1">قبل از انتشار سایت این را خاموش کنید.</b>
            </span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نتیجه‌ی پرداخت" hint="با «در درگاه بپرس» هر بار خودتان نتیجه را انتخاب می‌کنید">
              <Select
                value={value.demo.outcome}
                disabled={!value.demo.enabled}
                onChange={(e) => onChange({ ...value, demo: { ...value.demo, outcome: e.target.value as DemoOutcome } })}
              >
                {(Object.keys(DEMO_OUTCOME_LABEL) as DemoOutcome[]).map((id) => (
                  <option key={id} value={id}>
                    {DEMO_OUTCOME_LABEL[id]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="تأخیر ساختگی درگاه"
              hint="میلی‌ثانیه — تا حالت «در حال انتقال به بانک» هم دیده شود"
              error={errors['payment.demo.delayMs']}
            >
              <Input
                value={String(value.demo.delayMs)}
                dir="ltr"
                className="num text-start"
                inputMode="numeric"
                disabled={!value.demo.enabled}
                invalid={Boolean(errors['payment.demo.delayMs'])}
                onChange={(e) =>
                  onChange({ ...value, demo: { ...value.demo, delayMs: Number(e.target.value.replace(/\D/g, '') || 0) } })
                }
              />
            </Field>
          </div>

          {!value.demo.enabled && onlineEnabled && !value.gateway.ready && (
            <p className="flex items-center gap-2 text-[12px] text-ember-600 dark:text-ember-400">
              <CreditCard className="size-4" />
              دمو خاموش است ولی «{value.gateway.label}» هنوز کامل تنظیم نشده — پرداخت اینترنتی کار نخواهد کرد.
            </p>
          )}
        </div>
      </AdminCard>
    </>
  )
}
