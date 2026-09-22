'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Save } from 'lucide-react'
import type { SiteSettings } from '@/types/cms'
import { useSaveSettings, useSiteSettings } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Field, Input, PriceInput, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { emailSchema, linkSchema, optionalText, phoneSchema, requiredText } from '@/lib/validation'
import { formatPrice } from '@/lib/format'
import { PaymentSettingsCards } from '@/components/admin/payment-settings'
import { GatewaySettingsCard } from '@/components/admin/gateway-settings'
import { RepairPickupCard } from '@/components/admin/repair-pickup-settings'
import { DEFAULT_PAYMENT_SETTINGS } from '@/lib/payment'
import { repairSettings } from '@/lib/repair-pickup'

const amountRule = z
  .number()
  .int('مبلغ باید عدد صحیح باشد')
  .min(0, 'مبلغ نمی‌تواند منفی باشد')

const methodRule = z
  .object({
    id: z.string(),
    enabled: z.boolean(),
    label: requiredText('عنوان روش', 2),
    hint: optionalText(80, 'توضیح روش'),
    minTotal: amountRule,
    maxTotal: amountRule,
  })
  // سقف صفر یعنی بی‌نهایت، پس فقط سقفِ واقعیِ کمتر از کف ایراد دارد
  .refine((m) => m.maxTotal === 0 || m.maxTotal >= m.minTotal, {
    message: 'سقف نباید از حداقل مبلغ کمتر باشد',
    path: ['maxTotal'],
  })

const paymentRule = z
  .object({
    methods: z.array(methodRule),
    // تنظیمات درگاه فرم جداگانه‌ای دارد (کارت «درگاه بانکی»)، چون محرمانه است
    // و نباید از مسیر عمومی cms/settings رد شود. اینجا فقط خوانده می‌شود.
    gateway: z.object({
      provider: z.string(),
      label: z.string(),
      ready: z.boolean(),
    }),
    demo: z.object({
      enabled: z.boolean(),
      outcome: z.string(),
      delayMs: z.number().int().min(0, 'تأخیر نمی‌تواند منفی باشد').max(15000, 'تأخیر نباید بیشتر از ۱۵ ثانیه باشد'),
    }),
  })
  .superRefine((payment, ctx) => {
    if (!payment.methods.some((m) => m.enabled))
      ctx.addIssue({ code: 'custom', path: ['methods'], message: 'حداقل یک روش پرداخت باید فعال باشد' })

    // بدون دمو و بدون درگاهِ تنظیم‌شده، دکمه‌ی پرداخت اینترنتی در سایت به بن‌بست می‌خورد
    const online = payment.methods.find((m) => m.id === 'online')
    if (online?.enabled && !payment.demo.enabled && !payment.gateway.ready)
      ctx.addIssue({
        code: 'custom',
        path: ['gateway', 'ready'],
        message: 'درگاه بانکی هنوز کامل تنظیم نشده — در کارت «درگاه بانکی» کاملش کنید یا حالت دمو را روشن کنید',
      })
  })

/** قواعد ارسال پیش‌تر زیر ویرایشگر نوار اعلان بود و ادمین در «تنظیمات» پیدایش نمی‌کرد */
const shippingRule = z.object({
  freeThreshold: amountRule.max(1_000_000_000, 'سقف ارسال رایگان خیلی بزرگ است'),
  cost: amountRule.max(100_000_000, 'هزینه ارسال خیلی بزرگ است'),
})

/** روش‌های تحویل تعمیر؛ شناسه‌ها ثابت‌اند و فقط متن و وضعیتشان ویرایش می‌شود */
const repairRule = z
  .object({
    title: optionalText(120, 'تیتر بخش'),
    methods: z.array(
      z.object({
        id: z.string(),
        enabled: z.boolean(),
        label: requiredText('عنوان روش', 2),
        hint: optionalText(160, 'توضیح روش'),
        icon: z.string(),
      }),
    ),
  })
  .superRefine((repair, ctx) => {
    // خاموش شدن هر سه یعنی مشتری در مرحله‌ی تحویل هیچ گزینه‌ای ندارد
    if (!repair.methods.some((m) => m.enabled))
      ctx.addIssue({ code: 'custom', path: ['methods'], message: 'حداقل یک روش تحویل باید فعال باشد' })
  })

const settingsSchema = z.object({
  siteName: requiredText('نام سایت'),
  tagline: optionalText(120, 'شعار'),
  phone: phoneSchema,
  email: emailSchema,
  address: optionalText(300, 'آدرس'),
  socials: z.array(z.object({ label: optionalText(40, 'عنوان'), href: linkSchema })),
  shipping: shippingRule,
  payment: paymentRule,
  repair: repairRule,
})

export default function AdminSettingsPage() {
  const { data, isLoading, isError, refetch } = useSiteSettings()
  const saveSettings = useSaveSettings()
  const [draft, setDraft] = useState<SiteSettings | null>(null)
  const form = useForm(settingsSchema)

  /** هر تغییری بعد از اولین تلاش برای ذخیره، خطاها را زنده به‌روز می‌کند */
  const update = (next: SiteSettings) => {
    setDraft(next)
    form.revalidate(next)
  }

  const save = () => {
    if (!draft) return
    if (!form.validate(draft)) {
      toast.error('چند فیلد ایراد دارد — لطفاً پیام‌های قرمز را بررسی کنید')
      return
    }
    saveSettings.mutate(draft, { onSuccess: () => toast.success('تنظیمات ذخیره شد') })
  }

  useEffect(() => {
    // بک‌اندی که هنوز بلوک payment را برنمی‌گرداند نباید فرم را خالی بگذارد
    if (!data || draft) return
    const payment = structuredClone(data.payment ?? DEFAULT_PAYMENT_SETTINGS)
    // تنظیماتِ ذخیره‌شده‌ی قدیمی ممکن است بلوک ارسال نداشته باشد
    const shipping = data.shipping ?? { freeThreshold: 0, cost: 0 }
    // بک‌اند یا تنظیمات قدیمیِ بدون بلوک repair نباید کارت روش‌های تحویل را خالی بگذارد
    const repair = repairSettings(data.repair)
    setDraft({ ...structuredClone(data), payment, shipping, repair })
  }, [data, draft])

  if (isError) return <LoadError onRetry={() => refetch()} />
  if (isLoading || !draft) return <Skeleton className="h-96 rounded-card" />

  return (
    <PermissionGate permission="settings.manage">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">تنظیمات سایت</h1>
            <p className="mt-1.5 text-[13px] text-muted">
              اطلاعات پایه، تماس، شبکه‌های اجتماعی، هزینه ارسال، پرداخت و روش‌های تحویل تعمیر
            </p>
          </div>
          <Button
            loading={saveSettings.isPending}
            onClick={save}
          >
            <Save className="size-4" />
            ذخیره
          </Button>
        </div>

        <AdminCard title="اطلاعات پایه">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="نام سایت" required error={form.errors.siteName}>
              <Input
                value={draft.siteName}
                onChange={(e) => update({ ...draft, siteName: e.target.value })}
                invalid={Boolean(form.errors.siteName)}
              />
            </Field>
            <Field label="شعار" error={form.errors.tagline}>
              <Input
                value={draft.tagline}
                onChange={(e) => update({ ...draft, tagline: e.target.value })}
                invalid={Boolean(form.errors.tagline)}
              />
            </Field>
            <Field label="تلفن" required hint="ثابت یا موبایل — ۸ تا ۱۱ رقم" error={form.errors.phone}>
              <Input
                value={draft.phone}
                onChange={(e) => update({ ...draft, phone: e.target.value })}
                invalid={Boolean(form.errors.phone)}
                inputMode="numeric"
                dir="ltr"
                className="num"
              />
            </Field>
            <Field label="ایمیل" required error={form.errors.email}>
              <Input
                value={draft.email}
                onChange={(e) => update({ ...draft, email: e.target.value })}
                invalid={Boolean(form.errors.email)}
                dir="ltr"
              />
            </Field>
            <Field label="آدرس" className="sm:col-span-2" error={form.errors.address}>
              <Textarea
                value={draft.address}
                onChange={(e) => update({ ...draft, address: e.target.value })}
                invalid={Boolean(form.errors.address)}
                className="min-h-20"
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard title="روش‌های ورود کاربران">
          <div className="space-y-3 p-5">
            <p className="text-[13px] leading-7 text-muted">
              دست‌کم یکی از دو روش باید روشن بماند، وگرنه هیچ‌کس نمی‌تواند وارد شود.
            </p>

            {(
              [
                ['otp', 'کد یک‌بارمصرف پیامکی', 'کاربر شماره‌اش را می‌زند و با کد پنج‌رقمی وارد می‌شود.'],
                ['password', 'رمز عبور', 'ورود و ثبت‌نام با شماره/ایمیل و رمز عبور.'],
              ] as const
            ).map(([key, label, hint]) => {
              // نبودن مقدار یعنی روشن — همان پیش‌فرض سرور. بدون `?? true` روی روش دیگر،
              // هر دو روش خودشان را «تنها روش فعال» می‌دیدند و هیچ‌کدام خاموش نمی‌شد.
              const enabled = draft.auth?.[key] ?? true
              const otherEnabled = key === 'otp' ? (draft.auth?.password ?? true) : (draft.auth?.otp ?? true)
              // خاموش کردن آخرین روش یعنی قفل‌شدن همه بیرونِ سایت
              const isLast = enabled && !otherEnabled

              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4"
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={isLast}
                    onChange={(e) =>
                      update({
                        ...draft,
                        auth: {
                          otp: draft.auth?.otp ?? true,
                          password: draft.auth?.password ?? true,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="mt-1 size-4 accent-brand-500 disabled:opacity-50"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{label}</span>
                    <span className="block pt-1 text-xs leading-6 text-muted">
                      {isLast ? 'تنها روش فعال است و نمی‌شود خاموشش کرد.' : hint}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </AdminCard>

        <AdminCard title="شبکه‌های اجتماعی">
          <div className="space-y-3 p-5">
            {draft.socials.map((social, i) => (
              <div key={social.id} className="grid gap-3 sm:grid-cols-2">
                <Field label="عنوان" error={form.errors[`socials.${i}.label`]}>
                  <Input
                    value={social.label}
                    invalid={Boolean(form.errors[`socials.${i}.label`])}
                    onChange={(e) =>
                      update({
                        ...draft,
                        socials: draft.socials.map((s) => (s.id === social.id ? { ...s, label: e.target.value } : s)),
                      })
                    }
                  />
                </Field>
                <Field label="لینک" error={form.errors[`socials.${i}.href`]}>
                  <Input
                    value={social.href}
                    dir="ltr"
                    invalid={Boolean(form.errors[`socials.${i}.href`])}
                    onChange={(e) =>
                      update({
                        ...draft,
                        socials: draft.socials.map((s) => (s.id === social.id ? { ...s, href: e.target.value } : s)),
                      })
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
        </AdminCard>
        <AdminCard title="هزینه ارسال">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <p className="text-[13px] leading-7 text-muted sm:col-span-2">
              سبد خرید و صفحه‌ی تسویه از همین دو مقدار حساب می‌کنند. اگر نوار اعلان بالای سایت مبلغی را وعده می‌دهد،
              همان مبلغ را اینجا بگذارید تا با هم نخوانند نشود.
            </p>
            <Field
              label="ارسال رایگان از (تومان)"
              hint={
                draft.shipping.freeThreshold > 0
                  ? `سفارش‌های ${formatPrice(draft.shipping.freeThreshold)} به بالا رایگان`
                  : 'صفر یعنی ارسال همیشه رایگان است'
              }
              error={form.errors['shipping.freeThreshold']}
            >
              <PriceInput
                value={String(draft.shipping.freeThreshold)}
                invalid={Boolean(form.errors['shipping.freeThreshold'])}
                onChange={(next) =>
                  update({ ...draft, shipping: { ...draft.shipping, freeThreshold: Number(next) || 0 } })
                }
              />
            </Field>
            <Field
              label="هزینه ارسال (تومان)"
              hint={draft.shipping.cost > 0 ? formatPrice(draft.shipping.cost) : 'ارسال رایگان'}
              error={form.errors['shipping.cost']}
            >
              <PriceInput
                value={String(draft.shipping.cost)}
                invalid={Boolean(form.errors['shipping.cost'])}
                onChange={(next) => update({ ...draft, shipping: { ...draft.shipping, cost: Number(next) || 0 } })}
              />
            </Field>
          </div>
        </AdminCard>

        <PaymentSettingsCards
          value={draft.payment}
          errors={form.errors}
          onChange={(payment) => update({ ...draft, payment })}
        />

        {/* درگاه فرم و ذخیره‌ی خودش را دارد؛ مقدارهایش از این سند جدا ذخیره می‌شوند */}
        <GatewaySettingsCard />

        <RepairPickupCard
          value={draft.repair}
          errors={form.errors}
          onChange={(repair) => update({ ...draft, repair })}
        />
      </div>
    </PermissionGate>
  )
}
