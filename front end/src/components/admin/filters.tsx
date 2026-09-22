'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, FilterX, Search, SearchX, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { toEnDigits, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/** مقدار پیش‌فرض هر سلکتور: بدون محدودیت */
export const ALL = 'all'

export interface FilterState {
  term: string
  setTerm: (value: string) => void
  values: Record<string, string>
  set: (id: string, value: string) => void
  /** مقدار یک سلکتور، یا `undefined` وقتی روی «همه» است — برای شرط‌نویسی راحت‌تر */
  pick: (id: string) => string | undefined
  reset: () => void
  /** آیا اصلاً فیلتری اعمال شده — دکمه‌ی پاک‌کردن و شمارش به این وابسته‌اند */
  active: boolean
  /** کلید ریست صفحه‌بندی؛ با هر تغییر فیلتر کاربر به صفحه‌ی ۱ برمی‌گردد */
  token: string
}

/**
 * وضعیت نوار فیلتر جدول‌های پنل. فیلتر کردن خودِ داده در همان صفحه انجام
 * می‌شود؛ این هوک فقط مقدارها را نگه می‌دارد تا همه‌ی جدول‌ها یک رفتار
 * (پاک‌کردن، ریست صفحه‌بندی، شمارش) داشته باشند.
 *
 * `initialTerm` و `initialValues` فقط مقدار شروع‌اند (برای لینک‌های عمیق مثل
 * ?q=ORD-1042 یا ?stock=low)؛ بعد از آن کنترل دست کاربر است و تغییر URL دیگر
 * فیلترها را عوض نمی‌کند.
 */
export function useTableFilters(
  selectIds: string[],
  initialTerm = '',
  initialValues: Record<string, string> = {},
): FilterState {
  const [term, setTerm] = useState(initialTerm)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(selectIds.map((id) => [id, initialValues[id] ?? ALL])),
  )

  const set = useCallback((id: string, value: string) => setValues((prev) => ({ ...prev, [id]: value })), [])
  const pick = useCallback((id: string) => (values[id] && values[id] !== ALL ? values[id] : undefined), [values])

  const reset = useCallback(() => {
    setTerm('')
    setValues((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, ALL])))
  }, [])

  const token = `${term}|${Object.values(values).join('|')}`
  const active = term.trim() !== '' || Object.values(values).some((v) => v !== ALL)

  return useMemo(
    () => ({ term, setTerm, values, set, pick, reset, active, token }),
    [term, values, set, pick, reset, active, token],
  )
}

/** «همه‌ی متن‌های قابل جست‌وجوی یک ردیف شامل عبارت هست؟» */
export function matches(term: string, ...fields: (string | number | null | undefined)[]) {
  // «SN-۳۱۸۷۲» تایپ‌شده با کیبورد فارسی باید همان «SN-31872» ذخیره‌شده را پیدا کند
  const needle = toEnDigits(term.trim()).toLowerCase()
  if (!needle) return true
  return toEnDigits(fields.filter(Boolean).join(' ')).toLowerCase().includes(needle)
}

export interface FilterSelect {
  id: string
  label: string
  options: { value: string; label: string }[]
}

/**
 * نوار بالای جدول، در یک ردیف فشرده: جست‌وجو، فیلترها به‌شکل قرص‌های کوچک
 * («وضعیت: همه»)، پاک‌کردن با شمارش نتیجه، و دکمه‌ی عملیات صفحه در انتهای ردیف.
 * فیلتر فعال رنگ می‌گیرد تا بدون خواندن همه‌ی قرص‌ها معلوم باشد چه چیزی اعمال شده.
 * سلکتورها فقط وقتی چیزی برای انتخاب دارند رندر می‌شوند (مثلاً برندی ثبت نشده).
 */
export function FilterBar({
  filters,
  selects,
  placeholder = 'جست‌وجو…',
  action,
}: {
  filters: FilterState
  selects: FilterSelect[]
  placeholder?: string
  /** دکمه‌ی اصلی صفحه، مثل «محصول جدید» — ته ردیف فیلترها می‌نشیند */
  action?: React.ReactNode
}) {
  const usable = selects.filter((s) => s.options.length > 0)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={filters.term}
          onChange={(e) => filters.setTerm(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 ps-9 text-[12.5px]"
        />
      </div>

      {usable.map((select) => {
        const value = filters.values[select.id] ?? ALL
        const on = value !== ALL
        return (
          <label
            key={select.id}
            className={cn(
              'relative flex h-9 items-center rounded-xl border ps-3 text-[12px] transition-colors focus-within:ring-2 focus-within:ring-brand-500/25',
              on ? 'border-brand-500/60 bg-brand-500/8' : 'border-border bg-surface hover:border-brand-400',
            )}
          >
            <span className="whitespace-nowrap text-muted">{select.label}:</span>
            <select
              value={value}
              onChange={(e) => filters.set(select.id, e.target.value)}
              aria-label={select.label}
              className={cn(
                'h-full max-w-40 cursor-pointer appearance-none truncate bg-transparent ps-1.5 pe-7 font-medium outline-none',
                '[&>option]:bg-surface [&>option]:text-foreground',
                on ? 'text-brand-700 dark:text-brand-300' : 'text-foreground',
              )}
            >
              <option value={ALL}>همه</option>
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 size-3.5 text-muted" />
          </label>
        )
      })}

      {filters.active && (
        <button
          type="button"
          onClick={filters.reset}
          className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <FilterX className="size-3.5" />
          پاک کردن
        </button>
      )}

      {action && <div className="ms-auto">{action}</div>}
    </div>
  )
}

/**
 * عنوان صفحه‌ی جدول با شمارش کنارش در یک بج — خط دومِ زیر عنوان فقط ارتفاع می‌گرفت.
 * وقتی فیلتری اعمال شده، بج «۵ از ۱۸ کالا» می‌شود و رنگ می‌گیرد تا معلوم باشد
 * جدول کامل نیست.
 */
export function TableTitle({
  title,
  unit,
  total,
  shown,
  filters,
  description,
}: {
  title: string
  /** واحد شمارش: «کالا»، «سفارش»، … */
  unit: string
  total: number
  /** تعداد ردیف‌های بعد از فیلتر */
  shown?: number
  filters?: FilterState
  description?: React.ReactNode
}) {
  const filtered = Boolean(filters?.active) && shown !== undefined

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-xl font-bold">{title}</h1>
        <Badge tone={filtered ? 'brand' : 'neutral'} className="num">
          {filtered ? `${toFaDigits(shown!)} از ${toFaDigits(total)} ${unit}` : `${toFaDigits(total)} ${unit}`}
        </Badge>
      </div>
      {description && <p className="mt-1.5 text-[13px] leading-7 text-muted">{description}</p>}
    </div>
  )
}

/**
 * جدول خالی. اگر فیلتری اعمال شده باشد پیام «نتیجه‌ای نیست» با دکمه‌ی پاک‌کردن
 * می‌آید، وگرنه پیام «هنوز چیزی ثبت نشده» — این دو را نباید قاطی کرد.
 */
export function EmptyRows({
  filters,
  icon,
  title,
  description,
}: {
  filters: FilterState
  icon: LucideIcon
  /** پیام حالتی که اصلاً داده‌ای وجود ندارد */
  title: string
  description?: string
}) {
  if (!filters.active) return <EmptyState icon={icon} title={title} description={description} />

  return (
    <EmptyState
      icon={SearchX}
      title="نتیجه‌ای پیدا نشد"
      description="هیچ ردیفی با این فیلترها همخوانی ندارد. عبارت جست‌وجو یا فیلترها را تغییر دهید."
      action={
        <Button variant="soft" size="sm" onClick={filters.reset}>
          <FilterX className="size-4" />
          پاک کردن فیلترها
        </Button>
      }
    />
  )
}
