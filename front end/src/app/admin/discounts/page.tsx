'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Plus, Ticket, Trash2 } from 'lucide-react'
import type { Discount } from '@/types/catalog'
import { useAdminCategories, useAdminDiscounts, useCreateDiscount, useDeleteDiscount, useUpdateDiscount } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { ProductPicker } from '@/components/admin/product-picker'
import { CategoryPicker } from '@/components/admin/category-picker'
import { UserPicker } from '@/components/admin/user-picker'
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker'
import { AdminCard, Table } from '@/components/admin/data-table'
import { EmptyRows, FilterBar, TableTitle, matches, useTableFilters } from '@/components/admin/filters'
import { Pagination, usePagination } from '@/components/admin/pagination'
import { useSort } from '@/components/admin/sorting'
import { BulkBar, SelectCell, runBulk, useSelection } from '@/components/admin/selection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field, Input, PriceInput, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { amountSchema, discountCodeSchema } from '@/lib/validation'
import { formatDateTime, formatPrice, toFaDigits, toLocalDateTime } from '@/lib/format'

/** مقدار تخفیف بسته به نوعش قاعده‌ی متفاوتی دارد: درصد حداکثر ۱۰۰، مبلغ ثابت سقف ندارد */
const discountSchema = z
  .object({
    code: discountCodeSchema,
    type: z.enum(['percent', 'amount']),
    value: amountSchema({ label: 'مقدار تخفیف', min: 1 }),
    usageLimit: amountSchema({ label: 'سقف استفاده', min: 1, max: 1_000_000 }),
    startsAt: z.string().min(1, 'زمان شروع را وارد کنید'),
    endsAt: z.string().min(1, 'زمان پایان را وارد کنید'),
  })
  // مقدارها «YYYY-MM-DDTHH:mm» به وقت محلی‌اند و new Date همان‌طور می‌خواندشان
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'پایان باید بعد از شروع باشد',
    path: ['endsAt'],
  })
  .refine((v) => !v.endsAt || new Date(v.endsAt) > new Date(), {
    message: 'این زمان گذشته است؛ کد هیچ‌وقت فعال نمی‌شد',
    path: ['endsAt'],
  })
  .refine((v) => v.type !== 'percent' || (v.value !== null && v.value <= 100), {
    message: 'درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد',
    path: ['value'],
  })
  .refine((v) => v.type !== 'amount' || (v.value !== null && v.value >= 1_000), {
    message: 'مبلغ تخفیف نباید کمتر از ۱,۰۰۰ تومان باشد',
    path: ['value'],
  })

/** خلاصه‌ی محدوده‌ی کد برای جدول: روی چه کالاهایی و برای چه کسانی. نام دسته‌ها تا دو تا، بیشتر فقط تعداد */
function scopeLabel(discount: Discount, categoryTitle: (id: string) => string | undefined) {
  const parts: string[] = []
  if (discount.categoryIds.length) {
    const titles = discount.categoryIds.map(categoryTitle).filter(Boolean)
    parts.push(
      titles.length && titles.length <= 2 ? titles.join('، ') : `${toFaDigits(discount.categoryIds.length)} دسته`,
    )
  }
  if (discount.productIds.length) parts.push(`${toFaDigits(discount.productIds.length)} کالا`)
  const what = parts.length ? parts.join(' + ') : 'همه‌ی کالاها'
  return discount.userIds.length ? `${what} · ${toFaDigits(discount.userIds.length)} نفر` : what
}

/**
 * «منقضی» و «زمان‌بندی‌شده» جدا از خاموش/روشن‌اند: کدِ روشن بیرون از بازه‌اش هم
 * کار نمی‌کند، و ادمین باید ببیند چرا.
 */
function discountState(discount: Discount, now = new Date()) {
  if (new Date(discount.endsAt) < now) return 'expired'
  if (!discount.active) return 'inactive'
  if (new Date(discount.startsAt) > now) return 'scheduled'
  return 'active'
}

const STATE_BADGE = {
  active: { label: 'فعال', tone: 'success' },
  scheduled: { label: 'زمان‌بندی‌شده', tone: 'warning' },
  expired: { label: 'منقضی', tone: 'neutral' },
  inactive: { label: 'غیرفعال', tone: 'neutral' },
} as const

export default function AdminDiscountsPage() {
  const { data, isLoading } = useAdminDiscounts()
  const createDiscount = useCreateDiscount()
  const updateDiscount = useUpdateDiscount()
  const deleteDiscount = useDeleteDiscount()
  const { data: categories } = useAdminCategories()
  const categoryTitle = (id: string) => categories?.find((c) => c.id === id)?.title
  const filters = useTableFilters(['type', 'state'])

  const all = useMemo(() => data ?? [], [data])
  const items = useMemo(
    () =>
      all.filter((d) => {
        const state = discountState(d)
        return (
          matches(filters.term, d.code) &&
          (filters.pick('type') ?? d.type) === d.type &&
          (filters.pick('state') ?? state) === state
        )
      }),
    [all, filters],
  )

  const sort = useSort(items, {
    code: (d) => d.code,
    type: (d) => (d.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'),
    value: { get: (d) => d.value, defaultDirection: 'desc' },
    used: { get: (d) => d.usedCount, defaultDirection: 'desc' },
    endsAt: { get: (d) => d.endsAt, defaultDirection: 'desc' },
    active: { get: (d) => d.active, defaultDirection: 'desc' },
  })

  const pagination = usePagination(sort.sorted, 10, `${filters.token}|${sort.token}`)
  const selection = useSelection(
    pagination.pageItems.map((d) => d.id),
    sort.sorted.map((d) => d.id),
  )
  const [bulkBusy, setBulkBusy] = useState(false)

  const removeSelected = async () => {
    const ids = selection.selected
    if (!ids.length) return
    if (!confirm(`آیا ${toFaDigits(ids.length)} کد تخفیف حذف شوند؟`)) return

    setBulkBusy(true)
    const { done, failed, firstError } = await runBulk(ids, (id) => deleteDiscount.mutateAsync(id))
    setBulkBusy(false)
    selection.clear()
    if (done) toast.success(`${toFaDigits(done)} کد حذف شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} کد حذف نشد`)
  }

  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [type, setType] = useState<Discount['type']>('percent')
  const [value, setValue] = useState('')
  const [limit, setLimit] = useState('100')
  // پیش‌فرض: از همین حالا تا سی روز بعد، به وقت محلی (مقدار انتخابگر تاریخ منطقه‌ی زمانی ندارد)
  const [startsAt, setStartsAt] = useState(() => toLocalDateTime(new Date()))
  const [endsAt, setEndsAt] = useState(() => toLocalDateTime(new Date(Date.now() + 30 * 86_400_000)))
  const [productIds, setProductIds] = useState<string[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const form = useForm(discountSchema)

  const values = { code, type, value, usageLimit: limit, startsAt, endsAt }
  /** بعد از اولین تلاش برای ثبت، هر تغییری خطاها را زنده به‌روز می‌کند */
  const revalidate = (patch: Partial<typeof values>) => form.revalidate({ ...values, ...patch })

  const create = () => {
    const parsed = form.validate(values)
    if (!parsed) return

    createDiscount.mutate(
      {
        code: parsed.code,
        type: parsed.type,
        value: parsed.value!,
        productIds,
        categoryIds,
        userIds,
        startsAt: new Date(parsed.startsAt).toISOString(),
        endsAt: new Date(parsed.endsAt).toISOString(),
        usageLimit: parsed.usageLimit!,
        usedCount: 0,
        active: true,
      },
      {
        onSuccess: () => {
          toast.success('کد تخفیف ساخته شد')
          setOpen(false)
          setCode('')
          setValue('')
          setProductIds([])
          setCategoryIds([])
          setUserIds([])
          setStartsAt(toLocalDateTime(new Date()))
          setEndsAt(toLocalDateTime(new Date(Date.now() + 30 * 86_400_000)))
          form.reset()
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }

  return (
    <PermissionGate permission="discount.manage">
      <div className="space-y-5">
        <TableTitle title="کدهای تخفیف" unit="کد" total={all.length} shown={items.length} filters={filters} />

        <FilterBar
          filters={filters}
          placeholder="جست‌وجوی کد تخفیف…"
          action={
            <Button
              onClick={() => {
                form.reset()
                setOpen(true)
              }}
            >
              <Plus className="size-4" />
              کد جدید
            </Button>
          }
          selects={[
            {
              id: 'type',
              label: 'نوع',
              options: [
                { value: 'percent', label: 'درصدی' },
                { value: 'amount', label: 'مبلغ ثابت' },
              ],
            },
            {
              id: 'state',
              label: 'وضعیت',
              options: [
                { value: 'active', label: 'فعال' },
                { value: 'scheduled', label: 'زمان‌بندی‌شده' },
                { value: 'inactive', label: 'غیرفعال' },
                { value: 'expired', label: 'منقضی' },
              ],
            },
          ]}
        />

        <AdminCard>
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !items.length ? (
            <EmptyRows filters={filters} icon={Ticket} title="کد تخفیفی ساخته نشده" />
          ) : (
            <>
            <BulkBar selection={selection} unit="کد">
              <Button
                variant="ghost"
                size="sm"
                loading={bulkBusy}
                className="text-red-600 hover:text-red-700"
                onClick={() => void removeSelected()}
              >
                <Trash2 className="size-3.5" />
                حذف انتخاب‌شده‌ها
              </Button>
            </BulkBar>
            <Table
              selection={selection}
              sort={sort}
              head={[
                { label: 'کد', sortKey: 'code' },
                { label: 'نوع', sortKey: 'type' },
                { label: 'مقدار', sortKey: 'value' },
                'محدوده',
                { label: 'مصرف', sortKey: 'used' },
                { label: 'بازه‌ی زمانی', sortKey: 'endsAt' },
                { label: 'وضعیت', sortKey: 'active' },
                '',
              ]}
            >
              {pagination.pageItems.map((discount) => (
                <tr key={discount.id} className="transition-colors hover:bg-surface-2/40">
                  <SelectCell selection={selection} id={discount.id} label={discount.code} />
                  <td className="en-code p-3.5 font-bold" dir="ltr">
                    {discount.code}
                  </td>
                  <td className="p-3.5 text-muted">{discount.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
                  <td className="num p-3.5 font-medium">
                    {discount.type === 'percent'
                      ? `${toFaDigits(discount.value)}٪`
                      : formatPrice(discount.value, false)}
                  </td>
                  <td className="p-3.5 text-[12.5px] text-muted">{scopeLabel(discount, categoryTitle)}</td>
                  <td className="num p-3.5 text-muted">
                    {toFaDigits(discount.usedCount)} / {toFaDigits(discount.usageLimit)}
                  </td>
                  <td className="p-3.5 text-[12px] leading-6 text-muted">
                    <span className="block whitespace-nowrap">از {formatDateTime(discount.startsAt)}</span>
                    <span className="block whitespace-nowrap">تا {formatDateTime(discount.endsAt)}</span>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() =>
                        updateDiscount.mutate(
                          { id: discount.id, body: { active: !discount.active } },
                          { onSuccess: () => toast.success('وضعیت کد تغییر کرد') },
                        )
                      }
                    >
                      <Badge tone={STATE_BADGE[discountState(discount)].tone}>
                        {STATE_BADGE[discountState(discount)].label}
                      </Badge>
                    </button>
                  </td>
                  <td className="p-3.5 text-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="حذف"
                      className="text-muted hover:text-red-500"
                      onClick={() =>
                        deleteDiscount.mutate(discount.id, { onSuccess: () => toast.success('کد حذف شد') })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            </>
          )}
          {!isLoading && <Pagination state={pagination} label="کد" />}
        </AdminCard>

        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="کد تخفیف جدید"
          footer={
            <Button block loading={createDiscount.isPending} onClick={create}>
              ساخت کد
            </Button>
          }
        >
          <div className="space-y-4">
            <Field label="کد" required hint="حروف انگلیسی و عدد، ۳ تا ۲۰ حرف" error={form.errors.code}>
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  revalidate({ code: e.target.value })
                }}
                invalid={Boolean(form.errors.code)}
                dir="ltr"
                maxLength={20}
                placeholder="SUMMER20"
                  className="en-code"
                />
            </Field>
            <Field label="نوع تخفیف">
              <Select
                value={type}
                onChange={(e) => {
                  const next = e.target.value as Discount['type']
                  setType(next)
                  revalidate({ type: next })
                }}
              >
                <option value="percent">درصدی</option>
                <option value="amount">مبلغ ثابت</option>
              </Select>
            </Field>
            <Field
              label={type === 'percent' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'}
              required
              hint={type === 'percent' ? 'عددی بین ۱ تا ۱۰۰' : 'حداقل ۱,۰۰۰ تومان'}
              error={form.errors.value}
            >
              <PriceInput
                value={value}
                onChange={(next) => {
                  setValue(next)
                  revalidate({ value: next })
                }}
                invalid={Boolean(form.errors.value)}
              />
            </Field>
            <Field label="سقف استفاده" error={form.errors.usageLimit}>
              <Input
                value={limit}
                onChange={(e) => {
                  setLimit(e.target.value)
                  revalidate({ usageLimit: e.target.value })
                }}
                invalid={Boolean(form.errors.usageLimit)}
                inputMode="numeric"
                className="num"
              />
            </Field>
            <JalaliDatePicker
              label="شروع"
              required
              value={startsAt}
              onChange={(next) => {
                setStartsAt(next)
                revalidate({ startsAt: next })
              }}
              error={form.errors.startsAt}
            />
            <JalaliDatePicker
              label="پایان"
              required
              value={endsAt}
              // روزهای پیش از شروع معنایی ندارند
              min={startsAt}
              onChange={(next) => {
                setEndsAt(next)
                revalidate({ endsAt: next })
              }}
              error={form.errors.endsAt}
            />

            {/* Field به کار نمی‌آید: انتخابگر خودش چند دکمه دارد و داخل label نمی‌نشیند */}
            <div className="space-y-2">
              <p className="text-[13px] font-medium">محدود به دسته‌ها</p>
              <CategoryPicker value={categoryIds} onChange={setCategoryIds} />
              <p className="text-xs text-muted">
                {categoryIds.length
                  ? `${toFaDigits(categoryIds.length)} دسته انتخاب شده — کد روی همه‌ی کالاهای این دسته‌ها کار می‌کند، به‌علاوه‌ی کالاهایی که پایین‌تر انتخاب کنید.`
                  : 'هیچ دسته‌ای انتخاب نشده است.'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium">محدود به کالاها</p>
              {/* با دسته‌ی انتخاب‌شده، نبودن کالا دیگر یعنی «همه‌ی کالاها» نیست */}
              <ProductPicker value={productIds} onChange={setProductIds} emptyMeansAll={!categoryIds.length} />
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium">محدود به افراد</p>
              <UserPicker value={userIds} onChange={setUserIds} />
            </div>
          </div>
        </Drawer>
      </div>
    </PermissionGate>
  )
}
