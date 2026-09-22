'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Save } from 'lucide-react'
import type { Address } from '@/types/user'
import { useSaveAddress } from '@/lib/api/queries'
import { PROVINCES } from '@/lib/provinces'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { toFaDigits } from '@/lib/format'
import {
  addressSchema,
  mobileSchema,
  postalCodeSchema,
  requiredText,
  type FieldErrors,
} from '@/lib/validation'

/** فیلدهای نشانی؛ دفترچه‌ی آدرس و تکمیل سفارش هر دو از همین قواعد استفاده می‌کنند */
export const addressFieldsSchema = z.object({
  receiver: requiredText('نام گیرنده'),
  phone: mobileSchema,
  province: requiredText('استان', 2),
  city: requiredText('شهر', 2),
  postalCode: postalCodeSchema,
  line: addressSchema,
})

export type AddressFieldValues = z.input<typeof addressFieldsSchema>

export const emptyAddressFields = (fallback: Partial<AddressFieldValues> = {}): AddressFieldValues => ({
  receiver: fallback.receiver ?? '',
  phone: fallback.phone ?? '',
  province: fallback.province ?? 'تهران',
  city: fallback.city ?? '',
  postalCode: fallback.postalCode ?? '',
  line: fallback.line ?? '',
})

/**
 * متن نشانی که همراه سفارش ذخیره می‌شود. گیرنده و موبایلش هم در آن است، چون
 * سفارش ممکن است برای شخص دیگری باشد و پیک باید بداند به چه کسی تحویل دهد.
 */
export const formatAddressSummary = (address: z.output<typeof addressFieldsSchema> | Address) =>
  `${address.receiver} (${toFaDigits(address.phone)}) — ${address.province}، ${address.city}، ${address.line} — کد پستی ${toFaDigits(address.postalCode)}`

const schema = addressFieldsSchema.extend({
  title: requiredText('عنوان آدرس', 2),
  isDefault: z.boolean(),
})

type Values = z.input<typeof schema>

const toValues = (address: Address | null, fallback: Partial<AddressFieldValues>): Values => ({
  title: address?.title ?? '',
  ...emptyAddressFields(address ?? fallback),
  isDefault: address?.isDefault ?? false,
})

export function AddressFields({
  values,
  errors,
  onChange,
}: {
  values: AddressFieldValues
  errors: FieldErrors
  onChange: (patch: Partial<AddressFieldValues>) => void
}) {
  // آدرس قدیمی شاید استانی خارج از فهرست داشته باشد؛ نباید از دست برود
  const provinces: readonly string[] = PROVINCES.includes(values.province as (typeof PROVINCES)[number])
    ? PROVINCES
    : [values.province, ...PROVINCES]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام گیرنده" required error={errors.receiver}>
          <Input
            value={values.receiver}
            onChange={(e) => onChange({ receiver: e.target.value })}
            invalid={Boolean(errors.receiver)}
            autoComplete="name"
          />
        </Field>
        <Field label="موبایل گیرنده" required error={errors.phone}>
          <Input
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            invalid={Boolean(errors.phone)}
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            className="num text-start"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="استان" required error={errors.province}>
          <Select
            value={values.province}
            onChange={(e) => onChange({ province: e.target.value })}
            invalid={Boolean(errors.province)}
          >
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="شهر" required error={errors.city}>
          <Input
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            invalid={Boolean(errors.city)}
          />
        </Field>
      </div>

      <Field label="نشانی کامل" required hint="خیابان، کوچه، پلاک و واحد" error={errors.line}>
        <Textarea
          value={values.line}
          onChange={(e) => onChange({ line: e.target.value })}
          invalid={Boolean(errors.line)}
          className="min-h-24"
        />
      </Field>

      <Field label="کد پستی" required hint="۱۰ رقم، بدون خط تیره" error={errors.postalCode}>
        <Input
          value={values.postalCode}
          onChange={(e) => onChange({ postalCode: e.target.value })}
          invalid={Boolean(errors.postalCode)}
          inputMode="numeric"
          maxLength={12}
          dir="ltr"
          className="num text-start"
        />
      </Field>
    </>
  )
}

/**
 * فرم افزودن/ویرایش آدرس در کشو.
 *
 * برای آدرس تازه، نام و شماره‌ی خودِ حساب از پیش پر می‌شود چون بیشتر وقت‌ها
 * گیرنده خود کاربر است.
 */
export function AddressFormDrawer({
  open,
  onClose,
  address,
  fallback,
  isFirst,
}: {
  open: boolean
  onClose: () => void
  /** null یعنی آدرس تازه */
  address: Address | null
  fallback: Partial<AddressFieldValues>
  /** اولین آدرس خودکار پیش‌فرض می‌شود و انتخابش معنا ندارد */
  isFirst: boolean
}) {
  const [values, setValues] = useState(() => toValues(address, fallback))
  const form = useForm(schema)
  const save = useSaveAddress()

  const update = (patch: Partial<Values>) => {
    const next = { ...values, ...patch }
    setValues(next)
    form.revalidate(next)
  }

  const submit = () => {
    const parsed = form.validate(values)
    if (!parsed) return

    save.mutate(
      { id: address?.id, body: parsed },
      {
        onSuccess: () => {
          toast.success(address ? 'آدرس ویرایش شد' : 'آدرس جدید ذخیره شد')
          onClose()
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  // پیش‌فرضِ فعلی را نمی‌شود از پیش‌فرض بودن درآورد؛ باید آدرس دیگری پیش‌فرض شود
  const defaultLocked = isFirst || Boolean(address?.isDefault)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={address ? 'ویرایش آدرس' : 'آدرس جدید'}
      footer={
        <Button block loading={save.isPending} onClick={submit}>
          <Save className="size-4" />
          ذخیره آدرس
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="عنوان آدرس" required hint="مثلاً خانه یا محل کار" error={form.errors.title}>
          <Input
            value={values.title}
            onChange={(e) => update({ title: e.target.value })}
            invalid={Boolean(form.errors.title)}
            maxLength={40}
          />
        </Field>

        <AddressFields values={values} errors={form.errors} onChange={update} />

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
          <input
            type="checkbox"
            checked={defaultLocked || values.isDefault}
            disabled={defaultLocked}
            onChange={(e) => update({ isDefault: e.target.checked })}
            className="mt-1 size-4 accent-brand-500 disabled:opacity-60"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">آدرس پیش‌فرض</span>
            <span className="block pt-1 text-xs leading-6 text-muted">
              {isFirst
                ? 'اولین آدرس شما خودکار پیش‌فرض می‌شود.'
                : address?.isDefault
                  ? 'برای عوض کردن پیش‌فرض، آدرس دیگری را پیش‌فرض کنید.'
                  : 'در تکمیل سفارش، این آدرس از پیش انتخاب می‌شود.'}
            </span>
          </span>
        </label>
      </form>
    </Drawer>
  )
}
