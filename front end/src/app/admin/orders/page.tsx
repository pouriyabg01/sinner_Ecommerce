'use client'

import { Fragment, Suspense, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpLeft, CalendarDays, ChevronDown, MapPin, Package, Save, ShoppingCart, UserRound } from 'lucide-react'
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type AdminOrder,
  type Order,
  type OrderStatus,
  type PaymentMethodId,
  type PaymentStatus,
} from '@/types/order'
import { useAdminOrders, useUpdateOrder } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { EmptyRows, FilterBar, TableTitle, matches, useTableFilters } from '@/components/admin/filters'
import { Pagination, usePagination } from '@/components/admin/pagination'
import { useSort } from '@/components/admin/sorting'
import { OrderStatusChip, PaymentStatusChip } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import {
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatPhone,
  formatPrice,
  formatWeekday,
  toEnDigits,
  toFaDigits,
} from '@/lib/format'
import { cn } from '@/lib/utils'

const PAYMENT_LABEL: Record<Order['paymentMethod'], string> = {
  online: 'اینترنتی',
  cod: 'در محل',
  installment: 'اقساطی',
}

const STATUS_ORDER = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]

/** useSearchParams باید داخل Suspense باشد وگرنه build صفحه را رد می‌کند */
export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-card" />}>
      <OrdersView />
    </Suspense>
  )
}

function OrdersView() {
  const { data, isLoading } = useAdminOrders()
  const updateOrder = useUpdateOrder()
  // لینک «پرونده‌ی کاربر ← سفارش» با ?q=<شماره سفارش> می‌آید و جست‌وجو را از پیش پر می‌کند
  const focused = useSearchParams().get('q')?.trim() ?? ''
  const filters = useTableFilters(['status', 'method', 'paid'], focused)
  /** undefined یعنی ادمین هنوز چیزی باز و بسته نکرده؛ آن‌وقت سفارشِ لینک‌شده باز می‌ماند */
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined)

  const all = useMemo(() => data ?? [], [data])
  const items = useMemo(
    () =>
      all.filter(
        (o) =>
          matches(
            filters.term,
            o.code,
            o.addressSummary,
            o.customer?.fullName,
            o.customer?.phone,
            ...o.items.map((i) => i.title),
          ) &&
          (filters.pick('status') ?? o.status) === o.status &&
          (filters.pick('method') ?? o.paymentMethod) === o.paymentMethod &&
          (filters.pick('paid') ?? o.paymentStatus) === o.paymentStatus,
      ),
    [all, filters],
  )

  const sort = useSort(
    items,
    {
      code: (o) => o.code,
      customer: (o) => o.customer?.fullName ?? '',
      createdAt: { get: (o) => o.createdAt, defaultDirection: 'desc' },
      // سفارش‌های بدون روز مشخص آخر صف می‌آیند، نه اول
      preferredDeliveryDate: { get: (o) => o.preferredDeliveryDate ?? '9999-12-31', defaultDirection: 'asc' },
      total: { get: (o) => o.total, defaultDirection: 'desc' },
      paymentMethod: (o) => PAYMENT_LABEL[o.paymentMethod],
      // بر اساس ترتیب چرخه‌ی سفارش مرتب می‌شود، نه الفبای برچسب
      status: (o) => STATUS_ORDER.indexOf(o.status),
    },
    { key: 'createdAt' },
  )

  const pagination = usePagination(sort.sorted, 10, `${filters.token}|${sort.token}`)
  const openId = expanded === undefined ? (all.find((o) => o.code === focused)?.id ?? null) : expanded

  return (
    <PermissionGate permission="order.manage">
      <div className="space-y-5">
        <TableTitle title="سفارش‌ها" unit="سفارش" total={all.length} shown={items.length} filters={filters} />

        <FilterBar
          filters={filters}
          placeholder="شماره سفارش، مشتری، آدرس یا نام کالا…"
          selects={[
            {
              id: 'status',
              label: 'وضعیت',
              options: STATUS_ORDER.map((status) => ({ value: status, label: ORDER_STATUS_LABEL[status] })),
            },
            {
              id: 'method',
              label: 'روش پرداخت',
              options: (Object.keys(PAYMENT_LABEL) as PaymentMethodId[]).map((id) => ({
                value: id,
                label: PAYMENT_LABEL[id],
              })),
            },
            {
              id: 'paid',
              label: 'وضعیت پرداخت',
              options: (Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((id) => ({
                value: id,
                label: PAYMENT_STATUS_LABEL[id],
              })),
            },
          ]}
        />

        <AdminCard>
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !items.length ? (
            <EmptyRows filters={filters} icon={ShoppingCart} title="سفارشی ثبت نشده" description="هنوز هیچ سفارشی در فروشگاه ثبت نشده است." />
          ) : (
            <Table
              sort={sort}
              head={[
                { label: 'شماره', sortKey: 'code' },
                { label: 'مشتری', sortKey: 'customer' },
                { label: 'تاریخ ثبت', sortKey: 'createdAt' },
                { label: 'تحویل درخواستی', sortKey: 'preferredDeliveryDate' },
                { label: 'مبلغ', sortKey: 'total' },
                { label: 'پرداخت', sortKey: 'paymentMethod' },
                { label: 'وضعیت', sortKey: 'status' },
                'تغییر وضعیت',
                'جزئیات',
              ]}
            >
              {pagination.pageItems.map((order) => {
                const open = openId === order.id
                return (
                  <Fragment key={order.id}>
                    <tr
                      className={cn(
                        'transition-colors hover:bg-surface-2/40',
                        (order.code === focused || open) && 'bg-brand-500/[0.07]',
                      )}
                    >
                      <td className="en-code whitespace-nowrap p-3.5 font-bold">{order.code}</td>
                      <td className="p-3.5">
                        {order.customer ? (
                          // همان مقصدِ لینکِ مشتری در جزئیات؛ جست‌وجو با شماره چون یکتاست
                          <Link
                            href={`/admin/users?q=${encodeURIComponent(order.customer.phone)}`}
                            className="group/customer block transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                            title="باز کردن پرونده‌ی این کاربر"
                          >
                            <p className="flex items-center gap-1 whitespace-nowrap font-medium">
                              {order.customer.fullName}
                              <ArrowUpLeft className="size-3 shrink-0 opacity-0 transition-opacity group-hover/customer:opacity-100" />
                            </p>
                            <p className="num mt-0.5 whitespace-nowrap text-[11px] text-muted" dir="ltr">
                              {formatPhone(order.customer.phone)}
                            </p>
                          </Link>
                        ) : (
                          <span className="text-muted">حساب حذف شده</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3.5 text-muted">{formatDate(order.createdAt)}</td>
                      <td className="whitespace-nowrap p-3.5">
                        {order.preferredDeliveryDate ? (
                          <>
                            <p className="font-medium">{formatWeekday(order.preferredDeliveryDate)}</p>
                            <p className="num mt-0.5 text-[11px] text-muted">
                              {formatDayMonth(order.preferredDeliveryDate)}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted">زودترین زمان</span>
                        )}
                      </td>
                      <td className="num whitespace-nowrap p-3.5 font-medium">{formatPrice(order.total, false)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap text-muted">{PAYMENT_LABEL[order.paymentMethod]}</span>
                          <PaymentStatusChip status={order.paymentStatus} />
                        </div>
                      </td>
                      <td className="whitespace-nowrap p-3.5">
                        <OrderStatusChip status={order.status} />
                      </td>
                      <td className="p-3.5">
                        <Select
                          value={order.status}
                          onChange={(e) =>
                            updateOrder.mutate(
                              { id: order.id, body: { status: e.target.value as OrderStatus } },
                              { onSuccess: () => toast.success('وضعیت سفارش به‌روز شد') },
                            )
                          }
                          disabled={order.allowedNext.length === 0}
                          className="h-9 w-40 text-[12px]"
                        >
                          {/* وضعیت فعلی می‌ماند تا Select مقدارش را داشته باشد؛ بقیه فقط مرحله‌های مجازند */}
                          <option value={order.status}>{ORDER_STATUS_LABEL[order.status]}</option>
                          {order.allowedNext.map((status) => (
                            <option key={status} value={status}>
                              {ORDER_STATUS_LABEL[status]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpanded(open ? null : order.id)}
                          className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          {open ? 'بستن' : 'مشاهده'}
                          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
                        </button>
                      </td>
                    </tr>

                    {open && (
                      <tr className="bg-surface-2/30">
                        <td colSpan={9} className="p-0">
                          <OrderDetail order={order} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </Table>
          )}
          {!isLoading && <Pagination state={pagination} label="سفارش" />}
        </AdminCard>
      </div>
    </PermissionGate>
  )
}

/** همه‌ی چیزی که برای بسته‌بندی و ارسال لازم است، در یک نگاه */
function OrderDetail({ order }: { order: AdminOrder }) {
  const updateOrder = useUpdateOrder()
  const [tracking, setTracking] = useState(order.trackingCode ?? '')
  // ادمین ممکن است با کیبورد فارسی تایپ کند؛ کد رهگیری همیشه با ارقام انگلیسی ذخیره می‌شود
  const normalizedTracking = toEnDigits(tracking).trim()
  const trackingDirty = normalizedTracking !== (order.trackingCode ?? '')

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1.25fr_1fr_0.85fr]">
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-[12px] font-bold">
          <Package className="size-4 text-brand-500" />
          اقلام سفارش
        </p>
        {order.items.map((item, i) => (
          <div key={`${item.productId}-${item.variantTitle ?? ''}-${i}`} className="flex items-center gap-3">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                width={48}
                height={48}
                unoptimized
                className="size-12 shrink-0 rounded-xl bg-ink-950 object-cover"
              />
            ) : (
              <span className="size-12 shrink-0 rounded-xl bg-surface-2" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium leading-6">{item.title}</p>
              {item.variantTitle && <p className="text-[11px] text-muted">{item.variantTitle}</p>}
              <p className="num mt-0.5 text-[11px] text-muted">
                {toFaDigits(item.quantity)} × {formatPrice(item.unitPrice)}
              </p>
            </div>
            <span className="num whitespace-nowrap text-[12.5px] font-medium">
              {formatPrice(item.unitPrice * item.quantity, false)}
            </span>
          </div>
        ))}

        <dl className="space-y-2 border-t border-border pt-3 text-[12.5px]">
          {[
            { label: 'جمع کالاها', value: formatPrice(order.subtotal) },
            ...(order.discount ? [{ label: 'تخفیف', value: `− ${formatPrice(order.discount)}` }] : []),
            { label: 'هزینه ارسال', value: order.shippingCost ? formatPrice(order.shippingCost) : 'رایگان' },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-muted">
              <dt>{row.label}</dt>
              <dd className="num">{row.value}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 font-bold">
            <dt>مبلغ نهایی</dt>
            <dd className="num">{formatPrice(order.total)}</dd>
          </div>
          <div className="flex items-center justify-between pt-1 text-muted">
            <dt>روش پرداخت</dt>
            <dd className="flex items-center gap-2">
              {PAYMENT_METHOD_LABEL[order.paymentMethod]}
              <PaymentStatusChip status={order.paymentStatus} />
            </dd>
          </div>
          {order.paymentRef && (
            <div className="flex justify-between text-muted">
              <dt>رهگیری پرداخت</dt>
              <dd className="en-code">{order.paymentRef}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-4">
        <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4 text-[12.5px]">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
              <UserRound className="size-3.5" />
              مشتری
            </p>
            {order.customer ? (
              <Link
                href={`/admin/users?q=${encodeURIComponent(order.customer.phone)}`}
                className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                title="باز کردن پرونده‌ی این کاربر"
              >
                {order.customer.fullName}
                <span className="num font-normal text-muted" dir="ltr">
                  {formatPhone(order.customer.phone)}
                </span>
                <ArrowUpLeft className="size-3.5 shrink-0" />
              </Link>
            ) : (
              <p className="text-muted">حساب کاربر حذف شده</p>
            )}
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
              <MapPin className="size-3.5" />
              آدرس تحویل
            </p>
            <p className="leading-7">{order.addressSummary || '—'}</p>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
              <CalendarDays className="size-3.5" />
              زمان تحویل درخواستی
            </p>
            <p className="font-medium">
              {order.preferredDeliveryDate
                ? `${formatWeekday(order.preferredDeliveryDate)} ${formatDate(order.preferredDeliveryDate)}`
                : 'زودترین زمان ممکن'}
            </p>
          </div>
        </div>

        {/* Field به کار نمی‌آید: دکمه‌ی ذخیره نباید داخل label بنشیند */}
        <div className="space-y-1.5">
          <p className="text-[12.5px] font-medium">کد رهگیری مرسوله</p>
          <div className="flex gap-2">
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              aria-label="کد رهگیری مرسوله"
              maxLength={60}
              dir="ltr"
              className="en-code h-10 flex-1 text-start text-[12.5px]"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!trackingDirty}
              loading={updateOrder.isPending}
              onClick={() =>
                updateOrder.mutate(
                  { id: order.id, body: { trackingCode: normalizedTracking || null } },
                  {
                    onSuccess: () => toast.success(normalizedTracking ? 'کد رهگیری ذخیره شد' : 'کد رهگیری حذف شد'),
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            >
              <Save className="size-4" />
              ذخیره
            </Button>
          </div>
          <p className="text-[11px] text-muted">با ارقام انگلیسی ذخیره می‌شود؛ مشتری آن را در «سفارش‌های من» می‌بیند.</p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[12px] font-bold">تاریخچه</p>
        <ol className="relative space-y-3 ps-6">
          <span className="absolute bottom-1.5 start-2 top-1.5 w-px bg-border" />
          {order.timeline.map((step, i) => (
            <li key={i} className="relative">
              <span
                className={cn(
                  'absolute -start-6 top-1 size-4 rounded-full ring-4 ring-surface',
                  i === order.timeline.length - 1 ? 'bg-brand-500' : 'bg-brand-500/30',
                )}
              />
              <p className="text-[12.5px] font-medium">{ORDER_STATUS_LABEL[step.status]}</p>
              <p className="mt-0.5 text-[10.5px] text-muted">{formatDateTime(step.at)}</p>
              {step.note && <p className="mt-1 text-[11px] text-muted">{step.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
