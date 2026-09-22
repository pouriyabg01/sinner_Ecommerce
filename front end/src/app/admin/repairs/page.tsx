'use client'

import { Fragment, Suspense, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { ArrowUpLeft, CalendarDays, ChevronDown, MapPin, Save, Smartphone, Truck, UserRound, Wrench } from 'lucide-react'
import {
  DEVICE_KIND_LABEL,
  PICKUP_METHOD_LABEL,
  REPAIR_STATUS_LABEL,
  type AdminRepairRequest,
  type DeviceKind,
  type PickupMethod,
  type RepairStatus,
} from '@/types/repair'
import { useAdminRepairIssues, useAdminRepairs, useUpdateRepair } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { RepairIssuesEditor } from '@/components/admin/repair-issues-editor'
import { EmptyRows, FilterBar, TableTitle, matches, useTableFilters } from '@/components/admin/filters'
import { Pagination, usePagination } from '@/components/admin/pagination'
import { useSort } from '@/components/admin/sorting'
import { RepairStatusChip } from '@/components/ui/status-chip'
import { RepairTimeline } from '@/components/repair/status-timeline'
import { Button } from '@/components/ui/button'
import { Field, PriceInput, Select, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { amountSchema, optionalText } from '@/lib/validation'
import { formatDate, formatPhone, formatPrice, formatWeekday, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

const REPAIR_STATUS_ORDER = Object.keys(REPAIR_STATUS_LABEL) as RepairStatus[]

const repairSchema = z.object({
  finalCost: amountSchema({ label: 'هزینه نهایی', min: 0, max: 1_000_000_000, required: false }),
  technicianNote: optionalText(500, 'یادداشت تکنسین'),
})

/** useSearchParams باید داخل Suspense باشد وگرنه build صفحه را رد می‌کند */
export default function AdminRepairsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-card" />}>
      <RepairsView />
    </Suspense>
  )
}

function RepairsView() {
  const { data, isLoading } = useAdminRepairs()
  // عنوان مشکل‌ها از همان منبعی می‌آید که در پنل ویرایش می‌شود، نه از seed ثابت
  const { data: allIssues } = useAdminRepairIssues()
  const updateRepair = useUpdateRepair()
  // لینک «پرونده‌ی کاربر ← تعمیر» با ?q=<کد پیگیری> می‌آید
  const focused = useSearchParams().get('q')?.trim() ?? ''
  const filters = useTableFilters(['status', 'device', 'pickup'], focused)
  /** undefined یعنی ادمین هنوز چیزی باز و بسته نکرده؛ آن‌وقت درخواستِ لینک‌شده باز می‌ماند */
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined)

  const all = useMemo(() => data ?? [], [data])
  const items = useMemo(
    () =>
      all.filter(
        (r) =>
          matches(
            filters.term,
            r.code,
            r.deviceBrand,
            r.deviceModel,
            r.issueDescription,
            r.addressSummary,
            r.customer?.fullName,
            r.customer?.phone,
          ) &&
          (filters.pick('status') ?? r.status) === r.status &&
          (filters.pick('device') ?? r.deviceKind) === r.deviceKind &&
          (filters.pick('pickup') ?? r.pickupMethod) === r.pickupMethod,
      ),
    [all, filters],
  )

  const sort = useSort(
    items,
    {
      code: (r) => r.code,
      customer: (r) => r.customer?.fullName ?? '',
      device: (r) => `${DEVICE_KIND_LABEL[r.deviceKind]} ${r.deviceBrand} ${r.deviceModel}`,
      createdAt: { get: (r) => r.createdAt, defaultDirection: 'desc' },
      // هزینه‌ی قطعی اگر اعلام شده، وگرنه سقف برآورد
      cost: { get: (r) => r.finalCost ?? r.estimatedCost.max, defaultDirection: 'desc' },
      // بر اساس ترتیب مراحل تعمیر، نه الفبای برچسب
      status: (r) => REPAIR_STATUS_ORDER.indexOf(r.status),
    },
    { key: 'createdAt' },
  )

  const pagination = usePagination(sort.sorted, 10, `${filters.token}|${sort.token}`)
  const openId = expanded === undefined ? (all.find((r) => r.code === focused)?.id ?? null) : expanded

  return (
    <PermissionGate permission="repair.manage">
      <div className="space-y-5">
        <TableTitle title="سفارش‌های تعمیر" unit="درخواست" total={all.length} shown={items.length} filters={filters} />

        <FilterBar
          filters={filters}
          placeholder="کد پیگیری، دستگاه، شرح مشکل، آدرس یا مشتری…"
          selects={[
            {
              id: 'status',
              label: 'وضعیت',
              options: REPAIR_STATUS_ORDER.map((status) => ({ value: status, label: REPAIR_STATUS_LABEL[status] })),
            },
            {
              id: 'device',
              label: 'نوع دستگاه',
              options: (Object.keys(DEVICE_KIND_LABEL) as DeviceKind[]).map((kind) => ({
                value: kind,
                label: DEVICE_KIND_LABEL[kind],
              })),
            },
            {
              id: 'pickup',
              label: 'تحویل',
              options: (Object.keys(PICKUP_METHOD_LABEL) as PickupMethod[]).map((method) => ({
                value: method,
                label: PICKUP_METHOD_LABEL[method],
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
            <EmptyRows filters={filters} icon={Wrench} title="درخواست تعمیری ثبت نشده" />
          ) : (
            <Table
              sort={sort}
              head={[
                { label: 'کد پیگیری', sortKey: 'code' },
                { label: 'مشتری', sortKey: 'customer' },
                { label: 'دستگاه', sortKey: 'device' },
                { label: 'تاریخ ثبت', sortKey: 'createdAt' },
                { label: 'هزینه', sortKey: 'cost' },
                { label: 'وضعیت', sortKey: 'status' },
                'تغییر وضعیت',
                'جزئیات',
              ]}
            >
              {pagination.pageItems.map((repair) => {
                const open = openId === repair.id
                return (
                  <Fragment key={repair.id}>
                    <tr
                      className={cn(
                        'transition-colors hover:bg-surface-2/40',
                        (repair.code === focused || open) && 'bg-brand-500/[0.07]',
                      )}
                    >
                      <td className="en-code whitespace-nowrap p-3.5 font-bold">{repair.code}</td>
                      <td className="p-3.5">
                        {repair.customer ? (
                          // همان مقصدِ لینکِ مشتری در جزئیات؛ جست‌وجو با شماره چون یکتاست
                          <Link
                            href={`/admin/users?q=${encodeURIComponent(repair.customer.phone)}`}
                            className="group/customer block transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                            title="باز کردن پرونده‌ی این کاربر"
                          >
                            <p className="flex items-center gap-1 whitespace-nowrap font-medium">
                              {repair.customer.fullName}
                              <ArrowUpLeft className="size-3 shrink-0 opacity-0 transition-opacity group-hover/customer:opacity-100" />
                            </p>
                            <p className="num mt-0.5 whitespace-nowrap text-[11px] text-muted" dir="ltr">
                              {formatPhone(repair.customer.phone)}
                            </p>
                          </Link>
                        ) : (
                          <span className="text-muted">حساب حذف شده</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <p className="whitespace-nowrap font-medium">{DEVICE_KIND_LABEL[repair.deviceKind]}</p>
                        <p className="mt-0.5 line-clamp-1 max-w-44 text-[11px] text-muted">
                          {[repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ') || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-3.5 text-muted">{formatDate(repair.createdAt)}</td>
                      <td className="num whitespace-nowrap p-3.5">
                        {repair.finalCost ? (
                          <span className="font-medium">{formatPrice(repair.finalCost, false)}</span>
                        ) : (
                          <>
                            <p className="text-[11px] text-muted">برآورد</p>
                            <p className="text-[12px]">
                              {formatPrice(repair.estimatedCost.min, false)} تا {formatPrice(repair.estimatedCost.max, false)}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3.5">
                        <RepairStatusChip status={repair.status} />
                      </td>
                      <td className="p-3.5">
                        <Select
                          value={repair.status}
                          onChange={(e) =>
                            updateRepair.mutate(
                              { id: repair.id, body: { status: e.target.value as RepairStatus } },
                              { onSuccess: () => toast.success('وضعیت تعمیر به‌روز شد') },
                            )
                          }
                          disabled={repair.allowedNext.length === 0}
                          className="h-9 w-44 text-[12px]"
                        >
                          {/* «در انتظار پرداخت» عمداً اینجا نیست: تأیید خودِ مشتری می‌سازدش */}
                          <option value={repair.status}>{REPAIR_STATUS_LABEL[repair.status]}</option>
                          {repair.allowedNext.map((status) => {
                            // گزینه‌ی مسدود پنهان نمی‌شود؛ با دلیلش می‌ماند تا ادمین بداند چه کم است
                            const blocked = repair.blockedNext[status]
                            return (
                              <option key={status} value={status} disabled={Boolean(blocked)}>
                                {REPAIR_STATUS_LABEL[status]}
                                {blocked ? ' — اول هزینه را وارد کنید' : ''}
                              </option>
                            )
                          })}
                        </Select>
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpanded(open ? null : repair.id)}
                          className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          {open ? 'بستن' : 'مشاهده'}
                          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
                        </button>
                      </td>
                    </tr>

                    {open && (
                      <tr className="bg-surface-2/30">
                        <td colSpan={8} className="p-0">
                          <RepairDetail
                            repair={repair}
                            issues={repair.issueIds
                              .map((id) => allIssues?.find((i) => i.id === id)?.title)
                              .filter((title): title is string => Boolean(title))}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </Table>
          )}
          {!isLoading && <Pagination state={pagination} label="درخواست" />}
        </AdminCard>

        <RepairIssuesEditor />
      </div>
    </PermissionGate>
  )
}

/**
 * جزئیات یک درخواست. فرم هزینه و یادداشت state خودش را دارد، پس تازه شدن
 * فهرست بعد از ذخیره یا تغییر وضعیت چیزی را که ادمین در حال تایپ است پاک نمی‌کند.
 */
function RepairDetail({ repair, issues }: { repair: AdminRepairRequest; issues: string[] }) {
  const updateRepair = useUpdateRepair()
  const savedCost = repair.finalCost ? String(repair.finalCost) : ''
  const [cost, setCost] = useState(savedCost)
  const [note, setNote] = useState(repair.technicianNote ?? '')
  const form = useForm(repairSchema)
  const dirty = cost !== savedCost || note.trim() !== (repair.technicianNote ?? '')
  /**
   * درخواستی که هزینه‌اش ثبت نشده و مرحله‌ی بعدی‌اش به همان هزینه گیر کرده —
   * یعنی همین حالا نوبتِ تعیین قیمت است. سرور هم همین را در `blockedNext` گفته.
   */
  const costRequired = Object.keys(repair.blockedNext).length > 0

  const save = () => {
    const values = form.validate({ finalCost: cost, technicianNote: note })
    if (!values) return
    updateRepair.mutate(
      {
        id: repair.id,
        body: { finalCost: values.finalCost ?? undefined, technicianNote: values.technicianNote },
      },
      {
        onSuccess: () => toast.success('اطلاعات تعمیر ذخیره شد'),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_1.1fr_0.85fr]">
      <div className="space-y-4">
        <p className="flex items-center gap-1.5 text-[12px] font-bold">
          <Smartphone className="size-4 text-brand-500" />
          دستگاه و مشکل
        </p>
        <dl className="space-y-2.5 text-[12.5px]">
          {[
            {
              label: 'دستگاه',
              value: `${DEVICE_KIND_LABEL[repair.deviceKind]} — ${[repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ') || 'مدل نامشخص'}`,
            },
            { label: 'مشکلات', value: issues.length ? issues.join('، ') : '—' },
            { label: 'شرح کاربر', value: repair.issueDescription || '—' },
            {
              label: 'برآورد اولیه',
              value: `${formatPrice(repair.estimatedCost.min, false)} تا ${formatPrice(repair.estimatedCost.max)}`,
            },
            { label: 'گارانتی', value: repair.warrantyDays ? `${toFaDigits(repair.warrantyDays)} روز` : '—' },
          ].map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="w-20 shrink-0 text-muted">{row.label}</dt>
              <dd className="num flex-1 leading-7">{row.value}</dd>
            </div>
          ))}
        </dl>

        {repair.photos.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted">عکس‌های ارسالی</p>
            <div className="flex flex-wrap gap-2">
              {repair.photos.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer" className="block">
                  <Image
                    src={src}
                    alt={`عکس ${toFaDigits(i + 1)}`}
                    width={64}
                    height={64}
                    unoptimized
                    className="size-16 rounded-xl border border-border object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4 text-[12.5px]">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
              <UserRound className="size-3.5" />
              مشتری
            </p>
            {repair.customer ? (
              <Link
                href={`/admin/users?q=${encodeURIComponent(repair.customer.phone)}`}
                className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                title="باز کردن پرونده‌ی این کاربر"
              >
                {repair.customer.fullName}
                <span className="num font-normal text-muted" dir="ltr">
                  {formatPhone(repair.customer.phone)}
                </span>
                <ArrowUpLeft className="size-3.5 shrink-0" />
              </Link>
            ) : (
              <p className="text-muted">حساب کاربر حذف شده</p>
            )}
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
              <Truck className="size-3.5" />
              روش تحویل
            </p>
            <p className="font-medium">{PICKUP_METHOD_LABEL[repair.pickupMethod]}</p>
          </div>

          {repair.pickupMethod !== 'in_person' && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
                <MapPin className="size-3.5" />
                آدرس
              </p>
              <p className="leading-7">{repair.addressSummary || '—'}</p>
            </div>
          )}

          {repair.pickupMethod === 'courier' && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
                <CalendarDays className="size-3.5" />
                زمان مراجعه‌ی پیک
              </p>
              <p className="font-medium">
                {repair.preferredDate
                  ? `${formatWeekday(repair.preferredDate)} ${formatDate(repair.preferredDate)}`
                  : 'بدون ترجیح — با مشتری تماس بگیرید'}
              </p>
            </div>
          )}
        </div>

        <Field
          label="هزینه نهایی (تومان)"
          required={costRequired}
          hint={
            costRequired
              ? 'تا این عدد ثبت نشود، «اعلام هزینه» و مرحله‌های بعدی قابل انتخاب نیستند'
              : 'همین مبلغ است که مشتری تأیید و پرداخت می‌کند'
          }
          error={form.errors.finalCost}
        >
          <PriceInput
            value={cost}
            onChange={(next) => {
              setCost(next)
              form.revalidate({ finalCost: next, technicianNote: note })
            }}
            invalid={Boolean(form.errors.finalCost)}
            className="h-10"
          />
        </Field>

        <Field label="یادداشت تکنسین" hint="حداکثر ۵۰۰ حرف — مشتری در «تعمیرات من» می‌بیند" error={form.errors.technicianNote}>
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              form.revalidate({ finalCost: cost, technicianNote: e.target.value })
            }}
            invalid={Boolean(form.errors.technicianNote)}
            className="min-h-20"
          />
        </Field>

        <Button size="sm" disabled={!dirty} loading={updateRepair.isPending} onClick={save}>
          <Save className="size-4" />
          ذخیره تغییرات
        </Button>
      </div>

      <div>
        <p className="mb-3 text-[12px] font-bold">تاریخچه</p>
        <RepairTimeline timeline={repair.timeline} />
      </div>
    </div>
  )
}
