'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

/** مقداری که ستون بر اساس آن مرتب می‌شود */
export type SortValue = string | number | boolean | null | undefined

export type SortAccessor<T> =
  | ((item: T) => SortValue)
  | {
      get: (item: T) => SortValue
      /** جهت اولین کلیک روی این ستون؛ برای تاریخ و مبلغ معمولاً نزولی طبیعی‌تر است */
      defaultDirection?: SortDirection
    }

export type SortAccessors<T> = Record<string, SortAccessor<T>>

/** همان چیزی که <Table> برای رندر سرستون‌های کلیک‌پذیر لازم دارد */
export interface SortControl {
  key: string | null
  direction: SortDirection
  toggle: (key: string) => void
}

export interface SortState<T> extends SortControl {
  /** آرایه‌ی مرتب‌شده (کپی؛ ورودی دست‌نخورده می‌ماند) */
  sorted: T[]
  /** کلید یکتای وضعیت فعلی — برای برگرداندن صفحه‌بندی به صفحه‌ی ۱ */
  token: string
}

const toGetter = <T,>(accessor: SortAccessor<T>) =>
  typeof accessor === 'function' ? accessor : accessor.get

const toDefaultDirection = <T,>(accessor: SortAccessor<T>): SortDirection =>
  typeof accessor === 'function' ? 'asc' : (accessor.defaultDirection ?? 'asc')

const isEmpty = (value: SortValue) => value === null || value === undefined || value === ''

/** متن با ترتیب الفبای فارسی و عدد/بولین عددی مقایسه می‌شود */
function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'fa')
  return Number(a) - Number(b)
}

/**
 * مرتب‌سازی سمت کلاینت روی آرایه‌ای که کامل در اختیار داریم.
 * کلیک روی یک ستون جدید آن را با جهت پیش‌فرضش مرتب می‌کند و کلیک دوباره جهت را برعکس.
 */
export function useSort<T>(
  items: T[],
  accessors: SortAccessors<T>,
  initial?: { key: string; direction?: SortDirection },
): SortState<T> {
  const [key, setKey] = useState<string | null>(initial?.key ?? null)
  const [direction, setDirection] = useState<SortDirection>(
    initial?.direction ?? (initial ? toDefaultDirection(accessors[initial.key]) : 'asc'),
  )

  const sorted = useMemo(() => {
    const accessor = key ? accessors[key] : undefined
    if (!accessor) return items

    const get = toGetter(accessor)
    const sign = direction === 'asc' ? 1 : -1

    return [...items].sort((a, b) => {
      const left = get(a)
      const right = get(b)
      // خالی‌ها در هر دو جهت ته لیست می‌مانند، پس بیرون از ضرب در جهت حساب می‌شوند
      if (isEmpty(left) || isEmpty(right)) {
        if (isEmpty(left) && isEmpty(right)) return 0
        return isEmpty(left) ? 1 : -1
      }
      return sign * compareValues(left, right)
    })
    // accessors هر رندر ساخته می‌شود؛ وابستگی به key/direction/items کافی است
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, key, direction])

  const toggle = (next: string) => {
    if (next === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setKey(next)
    setDirection(toDefaultDirection(accessors[next]))
  }

  return { key, direction, sorted, toggle, token: `${key ?? ''}:${direction}` }
}

/** سرستون کلیک‌پذیر؛ داخل <Table> استفاده می‌شود و معمولاً مستقیم صدا زده نمی‌شود. */
export function SortButton({
  label,
  sortKey,
  sort,
}: {
  label: string
  sortKey: string
  sort: SortControl
}) {
  const active = sort.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <button
      type="button"
      onClick={() => sort.toggle(sortKey)}
      className={cn(
        'group -mx-1.5 flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:text-foreground',
        active && 'text-foreground',
      )}
      title={`مرتب‌سازی بر اساس ${label}`}
    >
      {label}
      <Icon
        className={cn(
          'size-3.5 shrink-0 transition-opacity',
          active ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
        )}
      />
    </button>
  )
}

/** نسخه‌ی کشویی برای لیست‌های کارتی که سرستون ندارند */
export function SortSelect({
  sort,
  options,
  className,
}: {
  sort: SortControl
  options: { key: string; label: string }[]
  className?: string
}) {
  const current = sort.key ?? options[0]?.key

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="flex items-center gap-2 text-[11.5px] text-muted">
        <span>مرتب‌سازی</span>
        <select
          value={current}
          onChange={(e) => sort.toggle(e.target.value)}
          aria-label="مرتب‌سازی بر اساس"
          className="h-9 cursor-pointer appearance-none rounded-xl border border-border bg-surface px-3 text-[12.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-brand-400 focus:shadow-[0_0_0_4px_rgba(0,179,146,0.14)]"
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => current && sort.toggle(current)}
        aria-label={sort.direction === 'asc' ? 'ترتیب صعودی — برای نزولی کلیک کنید' : 'ترتیب نزولی — برای صعودی کلیک کنید'}
        title={sort.direction === 'asc' ? 'صعودی' : 'نزولی'}
        className="grid size-9 place-items-center rounded-xl border border-border text-muted transition-colors hover:border-brand-400 hover:text-foreground"
      >
        {sort.direction === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
      </button>
    </div>
  )
}
