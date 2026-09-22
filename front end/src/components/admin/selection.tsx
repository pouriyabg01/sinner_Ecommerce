'use client'

import { useCallback, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * انتخاب چندتایی ردیف‌های جدول‌های پنل.
 *
 * تیک سرستون فقط ردیف‌های همین صفحه را می‌گیرد — با فهرست‌های چندصدتایی،
 * «همه» یعنی چیزی که کاربر نمی‌بیند. اگر بیرون از این صفحه هم ردیفی باشد،
 * نوار پایین دکمه‌ی «انتخاب همه‌ی فیلترشده‌ها» را نشان می‌دهد.
 *
 * شناسه‌هایی که با تغییر فیلتر یا حذف ردیف از فهرست بیرون می‌روند خودبه‌خود از
 * انتخاب می‌افتند، وگرنه عملیات گروهی روی چیزی اجرا می‌شد که دیگر دیده نمی‌شود.
 */
export interface SelectionControl {
  /** فقط شناسه‌های هنوز موجود در فهرست فیلترشده */
  selected: string[]
  count: number
  has: (id: string) => boolean
  toggle: (id: string) => void
  togglePage: () => void
  selectAll: () => void
  clear: () => void
  pageAllSelected: boolean
  pageSomeSelected: boolean
  /** کل ردیف‌های فیلترشده — پایه‌ی دکمه‌ی «انتخاب همه» */
  total: number
}

export function useSelection(pageIds: string[], allIds: string[]): SelectionControl {
  const [raw, setRaw] = useState<ReadonlySet<string>>(() => new Set())

  const selected = useMemo(() => allIds.filter((id) => raw.has(id)), [allIds, raw])

  const has = useCallback((id: string) => raw.has(id), [raw])

  const toggle = useCallback((id: string) => {
    setRaw((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => raw.has(id))
  const pageSomeSelected = pageIds.some((id) => raw.has(id))

  const togglePage = useCallback(() => {
    setRaw((prev) => {
      const next = new Set(prev)
      const allOn = pageIds.length > 0 && pageIds.every((id) => next.has(id))
      pageIds.forEach((id) => (allOn ? next.delete(id) : next.add(id)))
      return next
    })
  }, [pageIds])

  const selectAll = useCallback(() => setRaw(new Set(allIds)), [allIds])
  const clear = useCallback(() => setRaw(new Set()), [])

  return {
    selected,
    count: selected.length,
    has,
    toggle,
    togglePage,
    selectAll,
    clear,
    pageAllSelected,
    pageSomeSelected,
    total: allIds.length,
  }
}

const boxClass = 'size-4 shrink-0 cursor-pointer accent-[var(--color-brand-500)]'

/** تیک سرستون — در Table خودکار رندر می‌شود */
export function SelectAllBox({ selection }: { selection: SelectionControl }) {
  return (
    <input
      type="checkbox"
      className={boxClass}
      checked={selection.pageAllSelected}
      // حالت میانی: بعضی ردیف‌های این صفحه انتخاب شده‌اند
      ref={(el) => {
        if (el) el.indeterminate = !selection.pageAllSelected && selection.pageSomeSelected
      }}
      onChange={selection.togglePage}
      aria-label="انتخاب همه‌ی ردیف‌های این صفحه"
    />
  )
}

/** خانه‌ی تیک هر ردیف؛ اولین ستون جدول */
export function SelectCell({
  selection,
  id,
  label,
  disabled,
  reason,
}: {
  selection: SelectionControl
  id: string
  /** برای صفحه‌خوان: «انتخاب سارا محمدی» */
  label: string
  disabled?: boolean
  /** چرا این ردیف انتخاب نمی‌شود */
  reason?: string
}) {
  return (
    <td className="w-12 px-3.5 align-middle">
      <input
        type="checkbox"
        data-row-select
        className={cn(boxClass, disabled && 'cursor-not-allowed opacity-40')}
        checked={selection.has(id)}
        disabled={disabled}
        title={disabled ? reason : undefined}
        onChange={() => selection.toggle(id)}
        aria-label={`انتخاب ${label}`}
      />
    </td>
  )
}

/**
 * نوار عملیات گروهی؛ وقتی چیزی انتخاب نشده چیزی نشان نمی‌دهد.
 * دکمه‌ها را خود صفحه می‌دهد، چون هر جدول کار خودش را دارد.
 */
export function BulkBar({
  selection,
  unit,
  children,
}: {
  selection: SelectionControl
  /** واحد شمارش، مثلاً «کاربر» */
  unit: string
  children?: React.ReactNode
}) {
  if (selection.count === 0) return null

  return (
    /*
      شمارش در یک سمت و دکمه‌ها در سمت دیگر، با wrap تمیز: در عرض گوشی این نوار
      پیش‌تر سه‌تکه می‌شد و دکمه‌ها وسط و کنار پخش می‌شدند.
    */
    <div className="flex flex-col gap-2 border-b border-border bg-brand-500/[0.06] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="num text-[12.5px] font-medium">
        {toFaDigits(selection.count)} {unit} انتخاب شده
        {selection.count < selection.total && (
          <button
            type="button"
            onClick={selection.selectAll}
            className="ms-2 font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
          >
            انتخاب هر {toFaDigits(selection.total)}
          </button>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button variant="ghost" size="sm" onClick={selection.clear}>
          <X className="size-3.5" />
          لغو انتخاب
        </Button>
      </div>
    </div>
  )
}

/**
 * اجرای یک کار روی همه‌ی ردیف‌های انتخاب‌شده، یکی‌یکی.
 *
 * پشت سر هم و نه موازی، چون ده‌ها درخواست هم‌زمان هم سرور را شلوغ می‌کند و هم
 * ترتیب پیام‌های خطا را به‌هم می‌ریزد. شکستِ یک ردیف بقیه را متوقف نمی‌کند و
 * گزارش پایانی می‌گوید چند تا انجام شد و چند تا نه.
 */
export async function runBulk(
  ids: string[],
  run: (id: string) => Promise<unknown>,
): Promise<{ done: number; failed: number; firstError?: string }> {
  let done = 0
  let failed = 0
  let firstError: string | undefined

  for (const id of ids) {
    try {
      await run(id)
      done++
    } catch (error) {
      failed++
      firstError ??= error instanceof Error ? error.message : undefined
    }
  }

  return { done, failed, firstError }
}
