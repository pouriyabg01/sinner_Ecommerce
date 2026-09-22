'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { BadgePercent, CalendarDays, CheckCircle2, Copy, CreditCard, RotateCcw, ShoppingBag, Truck, UserPlus, Wallet, XCircle } from 'lucide-react'
import type { Order, PaymentMethodId } from '@/types/order'
import type { PaymentOutcome } from '@/lib/api/endpoints'
import { cartSubtotal, useCart } from '@/store/cart'
import { useSession } from '@/store/session'
import {
  useCreateOrder,
  useMe,
  usePayOrder,
  useSaveAddress,
  useSiteSettings,
  useStartPayment,
  useValidateDiscount,
} from '@/lib/api/queries'
import { useShipping } from '@/lib/use-shipping'
import { DemoGateway } from '@/components/checkout/demo-gateway'
import { redirectToGateway } from '@/lib/gateway-redirect'
import { SignInRequired } from '@/components/auth/sign-in-required'
import { CART_SYNC_KEY } from '@/components/cart/cart-sync'
import {
  AddressFields,
  addressFieldsSchema,
  emptyAddressFields,
  formatAddressSummary,
  type AddressFieldValues,
} from '@/components/profile/address-form'
import { availableMethods, DEFAULT_PAYMENT_SETTINGS } from '@/lib/payment'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { discountCodeSchema, requiredText } from '@/lib/validation'
import { formatDayMonth, formatPrice, formatWeekday, toFaDigits, toLocalIso } from '@/lib/format'
import { cn } from '@/lib/utils'

/** برچسب و توضیح روش‌ها از تنظیمات پنل می‌آید؛ فقط آیکون اینجا ثابت است */
const METHOD_ICON: Record<PaymentMethodId, typeof CreditCard> = {
  online: CreditCard,
  cod: Wallet,
  installment: BadgePercent,
}

/** عنوان فقط وقتی لازم است که آدرس در دفترچه ذخیره شود */
const oneOffAddressSchema = addressFieldsSchema.extend({ title: z.string().transform((v) => v.trim()) })
const bookAddressSchema = addressFieldsSchema.extend({ title: requiredText('عنوان آدرس', 2) })
const codeSchema = z.object({ code: discountCodeSchema })

/**
 * ثبت سفارش فقط برای کاربر واردشده است؛ مهمان پیش از پر کردن آدرس وارد
 * می‌شود و سبدش (که در مرورگر ذخیره است) دست‌نخورده می‌ماند.
 */
export default function CheckoutPage() {
  return (
    <SignInRequired
      title="برای تکمیل خرید وارد شوید"
      description="سبد خرید شما حفظ می‌شود و بعد از ورود، دقیقاً از همین مرحله ادامه می‌دهید."
    >
      <CheckoutView />
    </SignInRequired>
  )
}

function CheckoutView() {
  const router = useRouter()
  const { lines, clear } = useCart()
  const userId = useSession((s) => s.userId)
  const { data: user } = useMe(userId)
  const createOrder = useCreateOrder()
  const queryClient = useQueryClient()
  const saveAddress = useSaveAddress()
  const payOrder = usePayOrder()
  const startPayment = useStartPayment()
  const validateDiscount = useValidateDiscount()
  const { freeThreshold, cost: shippingCost } = useShipping()
  const { data: settings } = useSiteSettings()
  const paymentSettings = settings?.payment ?? DEFAULT_PAYMENT_SETTINGS

  const [addressId, setAddressId] = useState<string | null>(null)
  /** کاربری که آدرس ذخیره‌شده دارد، می‌تواند برای نشانی یا شخص دیگری سفارش دهد */
  const [otherAddress, setOtherAddress] = useState(false)
  // تا کاربر چیزی ننوشته، مقدارها از حساب ساخته می‌شوند (null یعنی دست‌نخورده)
  const [draft, setDraft] = useState<AddressFieldValues | null>(null)
  const [saveToBook, setSaveToBook] = useState<boolean | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  /** خالی یعنی «زودترین زمان ممکن» */
  const [deliveryDate, setDeliveryDate] = useState('')
  const [payment, setPayment] = useState<PaymentMethodId>('online')
  const [code, setCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  /** کدِ اعمال‌شده همراه سفارش می‌رود تا سرور دوباره خودش بسنجدش */
  const [appliedCode, setAppliedCode] = useState('')
  const [placed, setPlaced] = useState<Order | null>(null)
  /** سفارش ثبت‌شده‌ای که منتظر نتیجه‌ی درگاه است */
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [failure, setFailure] = useState<{ order: Order; outcome: 'failed' | 'cancelled' } | null>(null)
  const codeForm = useForm(codeSchema)

  const hasSaved = Boolean(user?.addresses.length)
  const usingNew = Boolean(user) && (!hasSaved || otherAddress)
  // اولین آدرس معمولاً مال خود کاربر است؛ «شخص دیگر» با فرم خالی شروع می‌شود
  const newValues =
    draft ?? emptyAddressFields(hasSaved ? {} : { receiver: user?.fullName, phone: user?.phone })
  const saveNew = saveToBook ?? !hasSaved
  const titleValue = title ?? (hasSaved ? '' : 'خانه')
  const addressForm = useForm(saveNew ? bookAddressSchema : oneOffAddressSchema)

  const updateNew = (patch: Partial<AddressFieldValues>) => {
    const next = { ...newValues, ...patch }
    setDraft(next)
    addressForm.revalidate({ ...next, title: titleValue })
  }

  const resetNew = () => {
    setDraft(null)
    setSaveToBook(null)
    setTitle(null)
    addressForm.reset()
  }

  /** از فردا تا ده روز بعد؛ سفارشِ امروز حداقل یک روز آماده‌سازی لازم دارد */
  const deliveryDays = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 10 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() + i + 1)
      const iso = toLocalIso(date)
      return { iso, weekday: i === 0 ? 'فردا' : formatWeekday(iso), label: formatDayMonth(iso) }
    })
  }, [])

  const subtotal = cartSubtotal(lines)
  const shipping = subtotal >= freeThreshold ? 0 : lines.length ? shippingCost : 0
  const total = Math.max(0, subtotal - discountAmount + shipping)

  // بدون useMemo آرایه هر رندر تازه می‌شود و افکتِ انتخاب خودکار بیهوده اجرا می‌شود
  const methods = useMemo(() => availableMethods(paymentSettings, total), [paymentSettings, total])
  const selectedMethod = methods.find((m) => m.id === payment)
  // روش انتخاب‌شده ممکن است با تغییر مبلغ سبد از دسترس خارج شود
  const paymentBlocked = !selectedMethod || Boolean(selectedMethod.blockedReason)
  const gatewayLabel = paymentSettings.gateway.label

  /**
   * روش انتخاب‌شده ممکن است با تغییر مبلغ سبد یا خاموش شدن آن در پنل از دسترس
   * خارج شود؛ در آن صورت اولین روش قابل انتخاب جایش را می‌گیرد.
   */
  useEffect(() => {
    if (methods.some((m) => m.id === payment && !m.blockedReason)) return
    const fallback = methods.find((m) => !m.blockedReason)
    if (fallback) setPayment(fallback.id)
  }, [methods, payment])

  /**
   * شروع پرداخت. اینکه به درگاه ساختگی برویم یا به بانک واقعی، تصمیمِ سرور
   * است نه مرورگر — تا خاموش کردن دمو در پنل بلافاصله همه‌جا اثر کند.
   */
  const beginPayment = (order: Order) =>
    startPayment.mutate(order.code, {
      onSuccess: (result) => {
        if (result.mode === 'demo') {
          setPayingOrder(order)
          return
        }
        // از اینجا به بعد صفحه عوض می‌شود؛ نتیجه از مسیر بازگشت بانک می‌آید
        redirectToGateway(result)
      },
      onError: (error) => {
        // سفارش ثبت شده و در «سفارش‌های من» منتظر پرداخت می‌ماند
        toast.error(error.message)
        setFailure({ order, outcome: 'failed' })
      },
    })

  const settle = (order: Order, outcome: PaymentOutcome) =>
    payOrder.mutate(
      { id: order.id, outcome },
      {
        onSuccess: (updated) => {
          setPayingOrder(null)
          if (outcome === 'success') setPlaced(updated)
          else setFailure({ order: updated, outcome })
        },
        onError: (error) => {
          setPayingOrder(null)
          toast.error(error.message)
        },
      },
    )

  const selectedAddress =
    user?.addresses.find((a) => a.id === addressId) ?? user?.addresses.find((a) => a.isDefault)

  const placeOrder = (addressSummary: string) =>
    createOrder.mutate(
      {
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        paymentMethod: payment,
        addressSummary,
        preferredDeliveryDate: deliveryDate || null,
        discountCode: appliedCode || undefined,
      },
      {
        onSuccess: (order) => {
          clear()
          router.refresh()
          // سفارش ثبت شد؛ پرداخت اینترنتی هنوز باید از درگاه رد شود
          if (order.paymentMethod === 'online') beginPayment(order)
          else setPlaced(order)
        },
        onError: (error) => {
          toast.error(error.message)
          // ردِ سفارش معمولاً یعنی کالایی ناموجود یا حذف شده؛ سبد همین حالا با سرور هماهنگ می‌شود
          void queryClient.invalidateQueries({ queryKey: [CART_SYNC_KEY] })
        },
      },
    )

  const submit = () => {
    if (!user) return
    if (!usingNew) {
      if (selectedAddress) placeOrder(formatAddressSummary(selectedAddress))
      return
    }

    const parsed = addressForm.validate({ ...newValues, title: titleValue })
    if (!parsed) {
      toast.error('آدرس تحویل کامل نیست — پیام‌های قرمز را بررسی کنید')
      return
    }
    const summary = formatAddressSummary(parsed)
    if (!saveNew) return placeOrder(summary)

    const known = new Set(user.addresses.map((a) => a.id))
    saveAddress.mutate(
      { body: parsed },
      {
        onSuccess: (account) => {
          // آدرس ذخیره‌شده از این به بعد انتخاب می‌شود تا اگر ثبت سفارش خطا داد،
          // تلاش دوباره همان آدرس را دوباره در دفترچه نسازد
          const created = account.addresses.find((a) => !known.has(a.id))
          if (created) {
            setAddressId(created.id)
            setOtherAddress(false)
            resetNew()
          }
          placeOrder(summary)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  if (payingOrder) {
    return (
      <DemoGateway
        order={payingOrder}
        gatewayLabel={gatewayLabel}
        merchantName={settings?.siteName ?? 'سینر'}
        outcome={paymentSettings.demo.outcome}
        delayMs={paymentSettings.demo.delayMs}
        pending={payOrder.isPending}
        onResolve={(outcome) => settle(payingOrder, outcome)}
      />
    )
  }

  if (failure) {
    return (
      <div className="container-page py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-lg space-y-6 rounded-card border border-red-500/30 bg-surface p-8 text-center"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-red-500/12 text-red-500">
            <XCircle className="size-8" />
          </span>
          <div className="space-y-2">
            <h1 className="text-lg font-bold">
              {failure.outcome === 'cancelled' ? 'پرداخت لغو شد' : 'پرداخت ناموفق بود'}
            </h1>
            <p className="text-[13px] leading-7 text-muted">
              سفارش شما ثبت شده و در وضعیت «در انتظار پرداخت» است — کالاها رزرو مانده‌اند. می‌توانید دوباره تلاش
              کنید یا بعداً از پنل کاربری پرداخت را کامل کنید.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-xs text-muted">شماره سفارش:</span>
            <span className="en-code text-sm font-bold">{failure.order.code}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              disabled={startPayment.isPending}
              onClick={() => {
                // تلاش دوباره هم باید از سرور بپرسد؛ ممکن است دمو در این فاصله خاموش شده باشد
                const order = failure.order
                setFailure(null)
                beginPayment(order)
              }}
            >
              <RotateCcw className="size-4" />
              {startPayment.isPending ? 'در حال اتصال…' : 'تلاش دوباره'}
            </Button>
            <Link href="/profile/orders" className={buttonVariants({ variant: 'ghost' })}>
              سفارش‌های من
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (placed) {
    return (
      <div className="container-page py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-lg space-y-6 rounded-card border border-brand-500/30 bg-surface p-8 text-center"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-500/12 text-brand-600 dark:text-brand-400">
            <CheckCircle2 className="size-8" />
          </span>
          <div className="space-y-2">
            <h1 className="text-lg font-bold">سفارش شما ثبت شد</h1>
            <p className="text-[13px] leading-7 text-muted">
              جزئیات سفارش برای شما پیامک شد. وضعیت سفارش را می‌توانید از پنل کاربری پیگیری کنید.
            </p>
          </div>
          {placed.paymentRef && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-3 text-brand-700 dark:text-brand-300">
              <span className="text-xs opacity-80">کد رهگیری پرداخت:</span>
              <span className="en-code text-sm font-bold">{placed.paymentRef}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-xs text-muted">شماره سفارش:</span>
            <span className="en-code text-sm font-bold">{placed.code}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(placed.code)
                toast.success('شماره سفارش کپی شد')
              }}
              aria-label="کپی"
              className="text-muted hover:text-brand-600"
            >
              <Copy className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/profile/orders" className={buttonVariants({ variant: 'soft' })}>
              پیگیری سفارش
            </Link>
            <Link href="/products" className={buttonVariants({ variant: 'ghost' })}>
              ادامه‌ی خرید
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-20">
        <EmptyState
          as="h1"
          icon={ShoppingBag}
          title="سبد خرید شما خالی است"
          description="ابتدا کالاهای مورد نظرتان را انتخاب کنید و سپس به این صفحه بازگردید."
          action={
            <Link href="/products" className={buttonVariants({ variant: 'soft' })}>
              رفتن به فروشگاه
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-7 text-2xl font-bold">تکمیل سفارش</h1>

      {/* ستون‌ها حداقلِ صفر دارند؛ وگرنه نوار افقی روزهای تحویل به‌جای اسکرول خوردن
          در جای خودش، کل ستون و در نتیجه صفحه را پهن می‌کرد */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Truck className="size-4 text-brand-500" />
              آدرس تحویل
            </h2>

            {!user ? (
              <Skeleton className="h-28 rounded-2xl" />
            ) : (
              <>
                {hasSaved && (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {user.addresses.map((address) => {
                      const active = !otherAddress && selectedAddress?.id === address.id
                      return (
                        <button
                          key={address.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setAddressId(address.id)
                            setOtherAddress(false)
                            addressForm.reset()
                          }}
                          className={cn(
                            'rounded-2xl border p-4 text-start transition-all duration-200',
                            active ? 'border-brand-500 bg-brand-500/6' : 'border-border hover:border-brand-400',
                          )}
                        >
                          <span className="flex items-center gap-2 text-[13px] font-bold">
                            {address.title}
                            {address.isDefault && <Badge tone="brand">پیش‌فرض</Badge>}
                          </span>
                          <span className="mt-1.5 block text-[11.5px] leading-6 text-muted">
                            {address.province}، {address.city}، {address.line}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted">گیرنده: {address.receiver}</span>
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      aria-pressed={otherAddress}
                      onClick={() => {
                        if (otherAddress) return
                        setOtherAddress(true)
                        resetNew()
                      }}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border border-dashed p-4 text-start transition-all duration-200',
                        otherAddress ? 'border-brand-500 bg-brand-500/6' : 'border-border hover:border-brand-400',
                      )}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <UserPlus className="size-5" />
                      </span>
                      <span>
                        <span className="block text-[13px] font-bold">ارسال به آدرس یا شخص دیگر</span>
                        <span className="mt-1 block text-[11.5px] leading-6 text-muted">
                          برای هدیه یا تحویل به فرد دیگری
                        </span>
                      </span>
                    </button>
                  </div>
                )}

                {usingNew && (
                  <div className={cn('space-y-4', hasSaved && 'mt-5 border-t border-border pt-5')}>
                    <p className="text-[12.5px] leading-6 text-muted">
                      {hasSaved
                        ? 'مشخصات گیرنده و نشانی تحویل را وارد کنید.'
                        : 'هنوز آدرسی ثبت نکرده‌اید؛ نشانی تحویل را وارد کنید.'}
                    </p>

                    <AddressFields values={newValues} errors={addressForm.errors} onChange={updateNew} />

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
                      <input
                        type="checkbox"
                        checked={saveNew}
                        onChange={(e) => {
                          setSaveToBook(e.target.checked)
                          if (!e.target.checked) addressForm.clearError('title')
                        }}
                        className="mt-1 size-4 accent-brand-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium">ذخیره در آدرس‌های من</span>
                        <span className="block pt-1 text-xs leading-6 text-muted">
                          {hasSaved
                            ? 'اگر باز هم به همین نشانی می‌فرستید، ذخیره‌اش کنید.'
                            : 'در خرید بعدی لازم نیست دوباره واردش کنید.'}
                        </span>
                      </span>
                    </label>

                    {saveNew && (
                      <Field label="عنوان آدرس" required hint="مثلاً خانه، محل کار یا منزل مادر" error={addressForm.errors.title}>
                        <Input
                          value={titleValue}
                          onChange={(e) => {
                            setTitle(e.target.value)
                            addressForm.revalidate({ ...newValues, title: e.target.value })
                          }}
                          invalid={Boolean(addressForm.errors.title)}
                          maxLength={40}
                        />
                      </Field>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="mb-1.5 flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="size-4 text-brand-500" />
              زمان تحویل
            </h2>
            <p className="mb-4 text-[12px] text-muted">روزی را که می‌خواهید سفارش به دستتان برسد انتخاب کنید.</p>
            {/* Field به کار نمی‌آید: این گروه دکمه است و داخل label نمی‌نشیند */}
            <div role="group" aria-label="روز تحویل" className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                aria-pressed={deliveryDate === ''}
                onClick={() => setDeliveryDate('')}
                className={cn(
                  'shrink-0 rounded-2xl border px-4 text-[12px] transition-all duration-200',
                  deliveryDate === ''
                    ? 'border-brand-500 bg-brand-500/8 text-brand-700 dark:text-brand-300'
                    : 'border-border text-muted hover:border-brand-400',
                )}
              >
                زودترین زمان ممکن
              </button>
              {deliveryDays.map((day) => {
                const active = deliveryDate === day.iso
                return (
                  <button
                    key={day.iso}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDeliveryDate(day.iso)}
                    className={cn(
                      'shrink-0 rounded-2xl border px-3.5 py-2.5 text-center transition-all duration-200',
                      active ? 'border-brand-500 bg-brand-500/8' : 'border-border hover:border-brand-400',
                    )}
                  >
                    <span className={cn('block text-[11px]', active ? 'text-brand-700 dark:text-brand-300' : 'text-muted')}>
                      {day.weekday}
                    </span>
                    <span className="num mt-0.5 block whitespace-nowrap text-[12.5px] font-bold">{day.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <CreditCard className="size-4 text-brand-500" />
              روش پرداخت
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {methods.map((method) => {
                const active = payment === method.id
                const Icon = METHOD_ICON[method.id]
                const blocked = Boolean(method.blockedReason)
                return (
                  <button
                    key={method.id}
                    disabled={blocked}
                    onClick={() => setPayment(method.id)}
                    title={method.blockedReason ?? undefined}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-2xl border p-4 text-start transition-all duration-200',
                      blocked
                        ? 'cursor-not-allowed border-dashed border-border opacity-55'
                        : active
                          ? 'border-brand-500 bg-brand-500/6'
                          : 'border-border hover:border-brand-400',
                    )}
                  >
                    <Icon className={cn('size-5', active && !blocked ? 'text-brand-600 dark:text-brand-400' : 'text-muted')} />
                    <span className="text-[12.5px] font-bold">{method.label}</span>
                    <span className="text-[11px] text-muted">{method.blockedReason ?? method.hint}</span>
                  </button>
                )
              })}
            </div>

            {payment === 'online' && paymentSettings.demo.enabled && (
              <p className="mt-3 rounded-xl bg-ember-500/10 px-3 py-2 text-[11.5px] text-ember-700 dark:text-ember-300">
                درگاه در حالت آزمایشی است — پرداخت واقعی انجام نمی‌شود.
              </p>
            )}
          </section>

          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="mb-4 text-sm font-bold">کالاهای سبد ({toFaDigits(lines.length)})</h2>
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.variantId} className="flex items-center gap-3">
                  <Image
                    src={line.image}
                    alt={line.title}
                    width={52}
                    height={52}
                    className="size-13 rounded-xl bg-ink-950 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{line.title}</p>
                    {line.variantTitle && <p className="text-[11px] text-muted">{line.variantTitle}</p>}
                  </div>
                  <span className="num text-[11px] text-muted">×{toFaDigits(line.quantity)}</span>
                  <span className="num text-[13px] font-bold">{formatPrice(line.unitPrice * line.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-40 lg:h-fit">
          <div className="space-y-4 rounded-card border border-border bg-surface p-6">
            <h2 className="text-sm font-bold">خلاصه سفارش</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const parsed = codeForm.validate({ code })
                if (!parsed) return
                validateDiscount.mutate(
                  {
                    code: parsed.code,
                    lines: lines.map((l) => ({
                      productId: l.productId,
                      lineTotal: l.unitPrice * l.quantity,
                    })),
                  },
                  {
                    // مبلغ را سرور حساب می‌کند؛ اینجا فقط نمایش داده می‌شود
                    onSuccess: ({ amount }) => {
                      setDiscountAmount(amount)
                      setAppliedCode(parsed.code)
                      toast.success(`کد تخفیف اعمال شد: ${formatPrice(amount)}`)
                    },
                    onError: (error) => toast.error(error.message),
                  },
                )
              }}
              className="space-y-1.5"
            >
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    codeForm.revalidate({ code: e.target.value })
                  }}
                  invalid={Boolean(codeForm.errors.code)}
                  placeholder="کد تخفیف"
                  className="en-code h-10 flex-1 text-[13px]"
                  dir="ltr"
                />
                <Button type="submit" size="sm" variant="outline" loading={validateDiscount.isPending}>
                  اعمال
                </Button>
              </div>
              {codeForm.errors.code && (
                <p role="alert" className="text-[11px] text-red-500">
                  {codeForm.errors.code}
                </p>
              )}
            </form>
            <p className="text-[10.5px] text-muted">
              کد را با حروف و اعداد انگلیسی وارد کنید. کدهای فعال نمونه: <span className="en-code">WELCOME10</span> و{' '}
              <span className="en-code">GAMER500</span>
            </p>

            <dl className="space-y-2.5 border-t border-border pt-4 text-[13px]">
              <div className="flex justify-between text-muted">
                <dt>جمع کالاها</dt>
                <dd className="num">{formatPrice(subtotal)}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-brand-600 dark:text-brand-400">
                  <dt>تخفیف</dt>
                  <dd className="num">− {formatPrice(discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <dt>هزینه ارسال</dt>
                <dd className="num">{shipping ? formatPrice(shipping) : 'رایگان'}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>مبلغ قابل پرداخت</dt>
                <dd className="num">{formatPrice(total)}</dd>
              </div>
            </dl>

            <Button
              block
              size="lg"
              loading={createOrder.isPending || saveAddress.isPending}
              disabled={paymentBlocked || !user}
              onClick={submit}
            >
              ثبت نهایی سفارش
            </Button>

            {usingNew && Object.keys(addressForm.errors).length > 0 ? (
              <p role="alert" className="text-center text-[11px] text-red-500">
                آدرس تحویل کامل نیست — پیام‌های قرمز را بررسی کنید.
              </p>
            ) : (
              paymentBlocked && (
                <p className="text-center text-[11px] text-ember-500">
                  {methods.length
                    ? 'روش پرداخت انتخاب‌شده برای این مبلغ در دسترس نیست.'
                    : 'در حال حاضر هیچ روش پرداختی فعال نیست.'}
                </p>
              )
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
