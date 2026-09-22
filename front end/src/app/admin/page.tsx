'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, ArrowUpLeft, MessageSquareText, Package, ShoppingCart, TrendingUp, Wrench } from 'lucide-react'
import { useAdminStats } from '@/lib/api/queries'
import { Select } from '@/components/ui/input'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, StatCard } from '@/components/admin/data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { formatDay, formatDayMonth, formatPrice, toFaDigits } from '@/lib/format'

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useAdminStats()
  /** null یعنی «ماه جاری»؛ کلید ماه‌ها پیش از رسیدن داده معلوم نیست */
  const [monthKey, setMonthKey] = useState<string | null>(null)

  if (isError) return <LoadError onRetry={() => refetch()} />

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  const maxRevenue = Math.max(...data.daily.map((d) => d.revenue))
  const months = data.months
  const month = months.find((m) => m.key === monthKey) ?? months[months.length - 1]
  const monthTotal = month.productRevenue + month.repairRevenue
  /** سهم هر منبع از فروش ماه؛ وقتی هنوز فروشی ثبت نشده نوار نصف-نصف نشان داده نشود */
  const share = (value: number) => (monthTotal > 0 ? (value / monthTotal) * 100 : 0)

  return (
    <PermissionGate permission="dashboard.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">داشبورد</h1>
          <p className="mt-1.5 text-[13px] text-muted">نمای کلی فروش، سفارش‌ها و تعمیرات</p>
        </div>

        {/*
         * سه کارت وسط عمداً «کل» را نشان نمی‌دهند بلکه رسیدگی‌نشده‌ها را؛ عددی که
         * هر روز صفر می‌شود به‌درد داشبورد می‌خورد، عددی که فقط بالا می‌رود نه.
         * مجموع هر کدام زیرش به‌عنوان راهنما می‌آید تا نسبت هم پیدا باشد.
         */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label={`فروش ${month.label}`}
            value={formatPrice(monthTotal, false)}
            hint="تومان — کالا و تعمیرات"
          />
          <StatCard
            icon={ShoppingCart}
            label="سفارش‌های رسیدگی‌نشده"
            value={toFaDigits(data.openOrders)}
            hint={`از ${toFaDigits(data.orderCount)} کل`}
            tone="sky"
          />
          <StatCard
            icon={Wrench}
            label="تعمیرات باز"
            value={toFaDigits(data.openRepairs)}
            hint={`از ${toFaDigits(data.repairCount)} کل`}
            tone="ember"
          />
          <StatCard
            icon={MessageSquareText}
            label="نظرات در انتظار تأیید"
            value={toFaDigits(data.pendingReviews)}
            hint={`از ${toFaDigits(data.reviewCount)} کل`}
            tone="amber"
          />
        </div>

        <AdminCard
          title="فروش ماهانه"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <span className="num text-[11px] text-muted">مجموع {formatPrice(monthTotal)}</span>
              <Select
                value={month.key}
                aria-label="انتخاب ماه"
                onChange={(e) => setMonthKey(e.target.value)}
                className="h-9 w-auto min-w-36 text-[12px]"
              >
                {/* جدیدترین ماه بالا؛ ماه‌های بی‌فروش هم می‌مانند تا نبودشان گیج‌کننده نباشد */}
                {[...months].reverse().map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                    {m.productRevenue + m.repairRevenue === 0 ? ' — بدون فروش' : ''}
                  </option>
                ))}
              </Select>
            </div>
          }
        >
          <div className="space-y-4 p-5">
            {/* یک نوار، دو سهم — نسبت کالا به تعمیرات در یک نگاه */}
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
              <span
                className="bg-brand-500 transition-[width] duration-700"
                style={{ width: `${share(month.productRevenue)}%` }}
              />
              <span
                className="bg-ember-500 transition-[width] duration-700"
                style={{ width: `${share(month.repairRevenue)}%` }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: 'product',
                  dot: 'bg-brand-500',
                  label: 'فروش کالا',
                  value: month.productRevenue,
                  count: `${toFaDigits(month.orderCount)} سفارش`,
                  href: '/admin/orders',
                },
                {
                  key: 'repair',
                  dot: 'bg-ember-500',
                  label: 'درآمد تعمیرات',
                  value: month.repairRevenue,
                  count: `${toFaDigits(month.repairCount)} تعمیر تکمیل‌شده`,
                  href: '/admin/repairs',
                },
              ].map((row) => (
                <Link
                  key={row.key}
                  href={row.href}
                  className="group flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:bg-surface-2/50"
                >
                  <span className={`size-2.5 shrink-0 rounded-full ${row.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] text-muted">{row.label}</span>
                    <span className="num mt-1 block text-[14px] font-bold">{formatPrice(row.value, false)}</span>
                  </span>
                  <span className="num text-[11px] text-muted">{row.count}</span>
                  <span className="num shrink-0 text-[11px] font-medium text-muted">
                    {toFaDigits(Math.round(share(row.value)))}٪
                  </span>
                </Link>
              ))}
            </div>

            <p className="text-[11px] leading-6 text-muted">
              سفارش‌های لغوشده حساب نمی‌شوند و درآمد هر تعمیر به ماهی می‌رود که در آن تکمیل شده، نه ماه ثبت درخواست.
            </p>
          </div>
        </AdminCard>

        {/*
         * فهرست کامل اینجا نبود: با زیاد شدن کالاها کارت بلند می‌شد و نمودار کنارش را
         * هم می‌کشید. یک خط هشدار با لینک به همان فیلتر در فهرست محصولات کافی است.
         * وقتی چیزی رو به اتمام نیست هیچ چیزی نشان داده نمی‌شود — نبودِ هشدار خودش خبر است.
         */}
        {data.lowStock.length > 0 && (
          <Link
            href="/admin/products?stock=low"
            className="group flex flex-wrap items-center gap-3 rounded-card border border-amber-500/30 bg-amber-500/[0.06] px-5 py-4 transition-colors hover:bg-amber-500/10"
          >
            <AlertTriangle className="size-4.5 shrink-0 text-amber-500" />
            <span className="num text-[13px] font-bold">{toFaDigits(data.lowStock.length)} کالا</span>
            <span className="text-[12.5px] text-muted">رو به اتمام است و نیاز به شارژ موجودی دارد</span>
            <span className="ms-auto flex items-center gap-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
              مشاهده در فهرست محصولات
              <ArrowUpLeft className="size-3.5 transition-transform can-hover:group-hover:-translate-x-0.5" />
            </span>
          </Link>
        )}

        <div className="grid gap-5">
          <AdminCard
            title="فروش ۱۴ روز اخیر"
            action={
              data.daily.length > 0 && (
                <span className="num text-[11px] text-muted">
                  {formatDayMonth(data.daily[0].date)} تا {formatDayMonth(data.daily[data.daily.length - 1].date)}
                </span>
              )
            }
          >
            <div className="px-5 pt-11 pb-5">
              <div className="flex h-40 items-end gap-1.5">
                {data.daily.map((day, i) => (
                  <motion.div
                    key={day.date}
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative flex-1 rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 hover:z-10 hover:from-brand-500 hover:to-brand-300"
                  >
                    <span className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2 py-1 text-center text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white dark:text-ink-900">
                      <span className="num block opacity-70">{formatDayMonth(day.date)}</span>
                      <span className="num">{formatPrice(day.revenue)}</span>
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* برچسب محور — همان flex و gap میله‌ها تا هر عدد دقیقاً زیر میله‌ی خودش بیفتد */}
              <div className="mt-2.5 flex gap-1.5 border-t border-border pt-2">
                {data.daily.map((day) => (
                  <span key={day.date} className="num flex-1 text-center text-[10px] text-muted">
                    {formatDay(day.date)}
                  </span>
                ))}
              </div>
            </div>
          </AdminCard>

        </div>

        <AdminCard
          title="پرنظرترین محصولات"
          action={
            <Link href="/admin/products" className="text-[12px] text-brand-600 dark:text-brand-400">
              مدیریت محصولات
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {data.topProducts.map((product, i) => (
              <li key={product.id}>
                <Link
                  href={`/admin/products?q=${encodeURIComponent(product.slug)}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/50"
                >
                  <span className="num w-5 text-[12px] font-bold text-muted">{toFaDigits(i + 1)}</span>
                  <Image
                    src={product.image}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-lg bg-ink-950 object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {product.title}
                  </span>
                  <ArrowUpLeft className="size-3.5 shrink-0 text-muted transition-opacity can-hover:opacity-0 can-hover:group-hover:opacity-100" />
                  <span className="num text-[11px] text-muted">{toFaDigits(product.reviewCount)} نظر</span>
                  <span className="num text-[12.5px] font-bold">{formatPrice(product.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminCard>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { href: '/admin/products', icon: Package, label: 'افزودن محصول جدید' },
            { href: '/admin/repairs', icon: Wrench, label: 'رسیدگی به تعمیرات' },
            { href: '/admin/appearance', icon: ShoppingCart, label: 'تغییر طراحی صفحه اصلی' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft dark:hover:border-brand-800"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 transition-transform group-hover:scale-110 dark:text-brand-400">
                <item.icon className="size-4.5" />
              </span>
              <span className="text-[12.5px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </PermissionGate>
  )
}
