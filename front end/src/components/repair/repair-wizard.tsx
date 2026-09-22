'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, MapPin, Star } from 'lucide-react'
import {
  DEVICE_KIND_LABEL,
  type DeviceKind,
  type PickupMethod,
  type RepairRequest,
} from '@/types/repair'
import { useCreateRepair, useMe, useRepairIssues, useSiteSettings } from '@/lib/api/queries'
import { enabledPickupMethods, pickupLabel, repairSettings } from '@/lib/repair-pickup'
import { useSession } from '@/store/session'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getIcon } from '@/lib/icons'
import { useForm } from '@/lib/use-form'
import { addressSchema, futureDateSchema, requiredText, wordCount } from '@/lib/validation'
import { formatDate, formatDayMonth, formatPrice, formatWeekday, toFaDigits, toLocalIso } from '@/lib/format'
import { cn } from '@/lib/utils'

const steps = ['دستگاه', 'مشکل', 'تحویل', 'تأیید'] as const

/** هر مرحله فقط فیلدهای خودش را می‌سنجد تا کاربر وسط ویزارد خطای مرحله‌ی بعد را نبیند */
const deviceStepSchema = z.object({
  deviceBrand: requiredText('برند', 2),
  deviceModel: requiredText('مدل دستگاه', 2),
})

const issueStepSchema = z
  .object({
    issueIds: z.array(z.string()),
    issueDescription: z.string().transform((v) => v.trim()),
  })
  // شمارش کلمه، نه حرف: «۱۰ حرف» برای شرح مشکل معیار بی‌معنایی بود
  .refine((v) => v.issueIds.length > 0 || wordCount(v.issueDescription) >= 3, {
    message: 'لطفاً یک مشکل از فهرست انتخاب کنید یا دست‌کم ۳ کلمه توضیح بنویسید',
    path: ['issueDescription'],
  })

const pickupStepSchema = z
  .object({
    pickupMethod: z.enum(['courier', 'post', 'in_person']),
    address: z.string(),
    preferredDate: futureDateSchema,
  })
  .superRefine((v, ctx) => {
    // تحویل حضوری آدرس نمی‌خواهد
    if (v.pickupMethod === 'in_person') return
    const result = addressSchema.safeParse(v.address)
    if (!result.success) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: result.error.issues[0].message })
    }
  })

const deviceOptions: { kind: DeviceKind; icon: string }[] = [
  { kind: 'mobile', icon: 'smartphone' },
  { kind: 'laptop', icon: 'laptop' },
  { kind: 'console', icon: 'gamepad-2' },
  { kind: 'tablet', icon: 'tablet' },
  { kind: 'desktop', icon: 'package' },
  { kind: 'other', icon: 'package' },
]

/** لینک‌هایی مثل «تعمیر لپ‌تاپ» در فوتر با ?device=laptop می‌آیند */
const deviceFromParam = (value: string | null): DeviceKind | null =>
  value && value in DEVICE_KIND_LABEL ? (value as DeviceKind) : null

export function RepairWizard({ onDone }: { onDone: (repair: RepairRequest) => void }) {
  const deviceParam = deviceFromParam(useSearchParams().get('device'))
  const [step, setStep] = useState(0)
  const [deviceKind, setDeviceKind] = useState<DeviceKind>(deviceParam ?? 'mobile')
  const [deviceBrand, setDeviceBrand] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [issueIds, setIssueIds] = useState<string[]>([])
  const [issueDescription, setIssueDescription] = useState('')

  // روی همین صفحه، زدن لینک دستگاه دیگری در فوتر کامپوننت را از نو نمی‌سازد
  const [seenParam, setSeenParam] = useState(deviceParam)
  if (deviceParam !== seenParam) {
    setSeenParam(deviceParam)
    if (deviceParam) {
      setDeviceKind(deviceParam)
      setIssueIds([])
      setStep(0)
    }
  }
  /** روش‌های تحویل از تنظیمات سایت می‌آیند تا ادمین بتواند متن، آیکون و فعال بودنشان را عوض کند */
  const { data: settings } = useSiteSettings()
  const repair = useMemo(() => repairSettings(settings?.repair), [settings?.repair])
  const pickupOptions = useMemo(() => enabledPickupMethods(repair), [repair])

  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('courier')
  // اگر ادمین روشِ انتخاب‌شده را خاموش کرده باشد، انتخاب روی اولین روش فعال می‌افتد
  if (!pickupOptions.some((m) => m.id === pickupMethod)) setPickupMethod(pickupOptions[0].id)
  // آدرس ذخیره‌شده‌ی انتخابی و آدرس دستی جدا نگه داشته می‌شوند تا کاربر بتواند
  // بین‌شان جابه‌جا شود بدون اینکه نوشته‌اش پاک شود
  const [addressId, setAddressId] = useState<string | null>(null)
  const [customAddress, setCustomAddress] = useState('')
  const [preferredDate, setPreferredDate] = useState('')

  const userId = useSession((state) => state.userId)
  const { data: user } = useMe(userId)
  const savedAddresses = useMemo(() => user?.addresses ?? [], [user?.addresses])
  const activeAddressId = addressId ?? savedAddresses.find((a) => a.isDefault)?.id ?? null
  const selectedAddress = savedAddresses.find((a) => a.id === activeAddressId)
  /** آدرس دستی بر آدرس ذخیره‌شده اولویت دارد — همان قرارداد صفحه‌ی تسویه */
  const address =
    customAddress.trim() ||
    (selectedAddress ? `${selectedAddress.province}، ${selectedAddress.city}، ${selectedAddress.line}` : '')

  /**
   * دو هفته‌ی پیش رو به‌صورت روزهای شمسی. `input[type=date]` تقویم میلادی مرورگر
   * را باز می‌کرد؛ برای «تاریخ ترجیحی پیک» انتخاب از میان چند روز آینده هم
   * سریع‌تر است هم کاملاً فارسی. مقدار ذخیره‌شده همان ISO می‌ماند.
   */
  const courierDays = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const iso = toLocalIso(date)
      return { iso, weekday: i === 0 ? 'امروز' : i === 1 ? 'فردا' : formatWeekday(iso), label: formatDayMonth(iso) }
    })
  }, [])

  // سرور فقط مشکلات همین نوع دستگاه را برمی‌گرداند؛ با عوض شدن دستگاه، انتخاب‌ها هم پاک می‌شوند
  const { data: issues, isLoading } = useRepairIssues(deviceKind)
  const createRepair = useCreateRepair()

  const deviceForm = useForm(deviceStepSchema)
  const issueForm = useForm(issueStepSchema)
  const pickupForm = useForm(pickupStepSchema)

  const relevantIssues = issues ?? []

  const selected = (issues ?? []).filter((i) => issueIds.includes(i.id))
  const estimate = selected.reduce(
    (acc, i) => ({
      min: acc.min + i.estimatedMin,
      max: acc.max + i.estimatedMax,
      days: Math.max(acc.days, i.estimatedDays),
    }),
    { min: 0, max: 0, days: 0 },
  )

  /**
   * دکمه‌ی «مرحله بعد» دیگر خاموش نمی‌شود؛ کلیک روی آن مرحله را می‌سنجد و
   * اگر ایرادی باشد پیامش را زیر همان فیلد نشان می‌دهد. این‌طور کاربر می‌فهمد
   * چرا نمی‌تواند جلو برود، نه اینکه با دکمه‌ی خاکستری تنها بماند.
   */
  const goNext = () => {
    if (step === 0 && !deviceForm.validate({ deviceBrand, deviceModel })) return
    if (step === 1 && !issueForm.validate({ issueIds, issueDescription })) return
    if (step === 2 && !pickupForm.validate({ pickupMethod, address, preferredDate })) return
    setStep((s) => s + 1)
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {/* نوار مراحل */}
      <div className="flex items-center gap-1 border-b border-border p-4 sm:gap-3 sm:px-6">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-xl text-[12px] font-bold transition-all duration-300',
                i < step
                  ? 'bg-brand-500 text-white'
                  : i === step
                    ? 'bg-brand-500/15 text-brand-600 ring-2 ring-brand-500 dark:text-brand-400'
                    : 'bg-surface-2 text-muted',
              )}
            >
              {i < step ? <Check className="size-4" /> : toFaDigits(i + 1)}
            </span>
            <span className={cn('hidden text-[12.5px] font-medium sm:block', i === step ? '' : 'text-muted')}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1 transition-colors', i < step ? 'bg-brand-500' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      <div className="p-5 sm:p-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-bold">کدام دستگاه شما نیاز به تعمیر دارد؟</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {deviceOptions.map(({ kind, icon }) => {
                      const Icon = getIcon(icon)
                      const active = deviceKind === kind
                      return (
                        <button
                          key={kind}
                          onClick={() => {
                            setDeviceKind(kind)
                            setIssueIds([])
                          }}
                          className={cn(
                            'flex flex-col items-center gap-2.5 rounded-2xl border p-4 transition-all duration-200',
                            active
                              ? 'border-brand-500 bg-brand-500/8 text-brand-700 dark:text-brand-300'
                              : 'border-border text-muted hover:border-brand-400 hover:text-foreground',
                          )}
                        >
                          <Icon className={cn('size-6 transition-transform', active && 'scale-110')} />
                          <span className="text-[12.5px] font-medium">{DEVICE_KIND_LABEL[kind]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="برند" required error={deviceForm.errors.deviceBrand}>
                    <Input
                      value={deviceBrand}
                      onChange={(e) => {
                        setDeviceBrand(e.target.value)
                        deviceForm.revalidate({ deviceBrand: e.target.value, deviceModel })
                      }}
                      invalid={Boolean(deviceForm.errors.deviceBrand)}
                      placeholder="مثلاً: اپل، سامسونگ، سونی"
                    />
                  </Field>
                  <Field
                    label="مدل دقیق"
                    required
                    hint="در صورت اطمینان نداشتن، مدل تقریبی را وارد کنید."
                    error={deviceForm.errors.deviceModel}
                  >
                    <Input
                      value={deviceModel}
                      onChange={(e) => {
                        setDeviceModel(e.target.value)
                        deviceForm.revalidate({ deviceBrand, deviceModel: e.target.value })
                      }}
                      invalid={Boolean(deviceForm.errors.deviceModel)}
                      placeholder="مثلاً: iPhone 13 Pro"
                    />
                  </Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-bold">مشکل دستگاه شما چیست؟</p>
                  <p className="text-[12.5px] text-muted">
                    هر تعداد که لازم است انتخاب کنید. برآورد هزینه بلافاصله نمایش داده می‌شود.
                  </p>

                  {isLoading ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-2xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {relevantIssues.map((issue) => {
                        const Icon = getIcon(issue.icon)
                        const active = issueIds.includes(issue.id)
                        return (
                          <button
                            key={issue.id}
                            onClick={() => {
                              const next = issueIds.includes(issue.id)
                                ? issueIds.filter((id) => id !== issue.id)
                                : [...issueIds, issue.id]
                              setIssueIds(next)
                              issueForm.revalidate({ issueIds: next, issueDescription })
                            }}
                            className={cn(
                              'flex items-start gap-3 rounded-2xl border p-4 text-start transition-all duration-200',
                              active
                                ? 'border-brand-500 bg-brand-500/8'
                                : 'border-border hover:border-brand-400',
                            )}
                          >
                            <span
                              className={cn(
                                'grid size-9 shrink-0 place-items-center rounded-xl transition-colors',
                                active ? 'bg-brand-500 text-white' : 'bg-surface-2 text-muted',
                              )}
                            >
                              <Icon className="size-4.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-bold">{issue.title}</span>
                              <span className="mt-1 block text-[11px] leading-5 text-muted">{issue.hint}</span>
                              <span className="num mt-1.5 block text-[11px] text-brand-600 dark:text-brand-400">
                                {formatPrice(issue.estimatedMin, false)} تا {formatPrice(issue.estimatedMax)}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Field
                  label="توضیح بیشتر"
                  hint="اگر مشکل دستگاه شما در فهرست بالا نبود یا جزئیات مهمی وجود دارد، اینجا بنویسید."
                  error={issueForm.errors.issueDescription}
                >
                  <Textarea
                    value={issueDescription}
                    onChange={(e) => {
                      setIssueDescription(e.target.value)
                      issueForm.revalidate({ issueIds, issueDescription: e.target.value })
                    }}
                    invalid={Boolean(issueForm.errors.issueDescription)}
                    placeholder="مثلاً: دستگاه از دست من افتاد و پس از آن لمس گوشه‌ی بالا کار نمی‌کند."
                  />
                </Field>

                {selected.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-brand-500/30 bg-brand-500/6 p-4"
                  >
                    <p className="text-[13px] font-bold text-brand-700 dark:text-brand-300">برآورد اولیه</p>
                    <p className="num mt-1.5 text-sm">
                      {formatPrice(estimate.min, false)} تا {formatPrice(estimate.max)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      زمان تقریبی: {toFaDigits(estimate.days)} روز کاری — هزینه‌ی قطعی پس از عیب‌یابی رایگان اعلام
                      می‌شود و بدون تأیید شما هیچ اقدامی انجام نمی‌شود.
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-bold">{repair.title}</p>
                  <div
                    className={cn(
                      'grid gap-2.5',
                      pickupOptions.length > 2 ? 'sm:grid-cols-3' : pickupOptions.length === 2 ? 'sm:grid-cols-2' : '',
                    )}
                  >
                    {pickupOptions.map((option) => {
                      const Icon = getIcon(option.icon)
                      const active = pickupMethod === option.id
                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            setPickupMethod(option.id)
                            pickupForm.revalidate({ pickupMethod: option.id, address, preferredDate })
                          }}
                          className={cn(
                            'flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-start transition-all duration-200',
                            active ? 'border-brand-500 bg-brand-500/8' : 'border-border hover:border-brand-400',
                          )}
                        >
                          <Icon className={cn('size-5', active ? 'text-brand-600 dark:text-brand-400' : 'text-muted')} />
                          <span className="text-[12.5px] font-bold">{option.label}</span>
                          {option.hint && <span className="text-[11px] leading-5 text-muted">{option.hint}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {pickupMethod !== 'in_person' && (
                  <div className="space-y-3">
                    {/* آدرس‌های ذخیره‌شده‌ی کاربر؛ نوشتن دوباره‌ی آدرس کار اضافه است */}
                    {savedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[13px] font-medium">از آدرس‌های ذخیره‌شده انتخاب کنید</p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {savedAddresses.map((saved) => {
                            const active = !customAddress.trim() && activeAddressId === saved.id
                            return (
                              <button
                                key={saved.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => {
                                  setAddressId(saved.id)
                                  setCustomAddress('')
                                  pickupForm.revalidate({
                                    pickupMethod,
                                    address: `${saved.province}، ${saved.city}، ${saved.line}`,
                                    preferredDate,
                                  })
                                }}
                                className={cn(
                                  'rounded-2xl border p-4 text-start transition-all duration-200',
                                  active ? 'border-brand-500 bg-brand-500/8' : 'border-border hover:border-brand-400',
                                )}
                              >
                                <span className="flex items-center gap-1.5 text-[12.5px] font-bold">
                                  <MapPin className="size-3.5 text-brand-500" />
                                  {saved.title}
                                  {saved.isDefault && <Star className="size-3 text-brand-500" aria-label="پیش‌فرض" />}
                                </span>
                                <span className="mt-1.5 block text-[11px] leading-6 text-muted">
                                  {saved.province}، {saved.city}، {saved.line}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <Field
                      label={savedAddresses.length ? 'یا آدرس دیگری وارد کنید' : 'آدرس کامل'}
                      required={!savedAddresses.length}
                      hint={savedAddresses.length ? 'در صورت تکمیل، جایگزین آدرس انتخاب‌شده می‌شود.' : undefined}
                      error={pickupForm.errors.address}
                    >
                      <Textarea
                        value={customAddress}
                        onChange={(e) => {
                          setCustomAddress(e.target.value)
                          pickupForm.revalidate({
                            pickupMethod,
                            address: e.target.value.trim() || (selectedAddress
                              ? `${selectedAddress.province}، ${selectedAddress.city}، ${selectedAddress.line}`
                              : ''),
                            preferredDate,
                          })
                        }}
                        invalid={Boolean(pickupForm.errors.address)}
                        placeholder="استان، شهر، خیابان، پلاک و واحد"
                        className="min-h-24"
                      />
                    </Field>
                  </div>
                )}

                {pickupMethod === 'courier' && (
                  // Field به کار نمی‌آید: این گروه دکمه است و داخل label نمی‌نشیند
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium">تاریخ ترجیحی مراجعه پیک</p>
                    <div
                      role="group"
                      aria-label="تاریخ ترجیحی مراجعه پیک"
                      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                    >
                      <button
                        type="button"
                        aria-pressed={preferredDate === ''}
                        onClick={() => {
                          setPreferredDate('')
                          pickupForm.revalidate({ pickupMethod, address, preferredDate: '' })
                        }}
                        className={cn(
                          'shrink-0 rounded-2xl border px-4 text-[12px] transition-all duration-200',
                          preferredDate === ''
                            ? 'border-brand-500 bg-brand-500/8 text-brand-700 dark:text-brand-300'
                            : 'border-border text-muted hover:border-brand-400',
                        )}
                      >
                        بدون ترجیح
                      </button>

                      {courierDays.map((day) => {
                        const active = preferredDate === day.iso
                        return (
                          <button
                            key={day.iso}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setPreferredDate(day.iso)
                              pickupForm.revalidate({ pickupMethod, address, preferredDate: day.iso })
                            }}
                            className={cn(
                              'shrink-0 rounded-2xl border px-3.5 py-2.5 text-center transition-all duration-200',
                              active ? 'border-brand-500 bg-brand-500/8' : 'border-border hover:border-brand-400',
                            )}
                          >
                            <span
                              className={cn(
                                'block text-[11px]',
                                active ? 'text-brand-700 dark:text-brand-300' : 'text-muted',
                              )}
                            >
                              {day.weekday}
                            </span>
                            <span className="num mt-0.5 block whitespace-nowrap text-[12.5px] font-bold">
                              {day.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted">اختیاری — در صورت انتخاب نکردن، با شما تماس می‌گیریم.</p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <p className="text-sm font-bold">بازبینی نهایی</p>

                <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border text-[13px]">
                  {[
                    { label: 'دستگاه', value: `${DEVICE_KIND_LABEL[deviceKind]} — ${deviceBrand} ${deviceModel}` },
                    {
                      label: 'مشکلات',
                      value: selected.length ? selected.map((i) => i.title).join('، ') : 'شرح دستی کاربر',
                    },
                    { label: 'روش تحویل', value: pickupLabel(repair, pickupMethod) },
                    {
                      label: 'آدرس',
                      value: pickupMethod === 'in_person' ? 'تحویل حضوری در شعبه مرکزی' : address,
                    },
                    // فقط وقتی پیک انتخاب شده معنی دارد
                    ...(pickupMethod === 'courier'
                      ? [{
                          label: 'تاریخ پیک',
                          value: preferredDate ? formatDate(preferredDate) : 'بدون ترجیح — تماس می‌گیریم',
                        }]
                      : []),
                  ].map((row) => (
                    <div key={row.label} className="flex gap-4 p-4">
                      <dt className="w-24 shrink-0 text-muted">{row.label}</dt>
                      <dd className="flex-1 leading-7">{row.value || '—'}</dd>
                    </div>
                  ))}
                </dl>

                {issueDescription && (
                  <div className="rounded-2xl bg-surface-2 p-4 text-[12.5px] leading-7 text-muted">
                    «{issueDescription}»
                  </div>
                )}

                <div className="rounded-2xl border border-brand-500/30 bg-brand-500/6 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-bold text-brand-700 dark:text-brand-300">برآورد هزینه</span>
                    <span className="num text-sm font-bold">
                      {estimate.max ? `${formatPrice(estimate.min, false)} تا ${formatPrice(estimate.max)}` : 'پس از عیب‌یابی'}
                    </span>
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-[11px] leading-6 text-muted">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    عیب‌یابی رایگان است. در صورت عدم پذیرش هزینه‌ی نهایی، دستگاه بدون هیچ هزینه‌ای به شما بازگردانده می‌شود.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowRight className="size-4" />
          مرحله قبل
        </Button>

        {step < steps.length - 1 ? (
          <Button onClick={goNext}>
            مرحله بعد
            <ArrowLeft className="size-4" />
          </Button>
        ) : (
          <Button
            loading={createRepair.isPending}
            onClick={() => {
              const device = deviceForm.validate({ deviceBrand, deviceModel })
              const issue = issueForm.validate({ issueIds, issueDescription })
              const pickup = pickupForm.validate({ pickupMethod, address, preferredDate })
              if (!device || !issue || !pickup) {
                // برگرد به اولین مرحله‌ای که ایراد دارد
                setStep(!device ? 0 : !issue ? 1 : 2)
                return
              }
              createRepair.mutate(
                {
                  deviceKind,
                  deviceBrand,
                  deviceModel,
                  issueIds,
                  issueDescription,
                  pickupMethod,
                  addressSummary: pickupMethod === 'in_person' ? 'تحویل حضوری — شعبه مرکزی' : address,
                  preferredDate: preferredDate || null,
                },
                { onSuccess: onDone },
              )
            }}
          >
            <Check className="size-4" />
            ثبت درخواست تعمیر
          </Button>
        )}
      </div>
    </div>
  )
}
