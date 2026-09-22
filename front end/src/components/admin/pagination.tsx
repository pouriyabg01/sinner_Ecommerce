'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toFaDigits } from '@/lib/format'
import { usePagination, type PaginationState } from '@/lib/use-pagination'

// جدول‌های پنل هوک را از همین ماژول می‌گیرند؛ مسیر ایمپورتشان دست‌نخورده می‌ماند
export { usePagination, type PaginationState }

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const

/** لیست شماره‌ی صفحه‌ها با «…» برای فاصله‌های بزرگ */
function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1])
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p))

  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap' as const, p] : [p]))
}

const pageButton =
  'num grid size-9 place-items-center rounded-xl border text-[12.5px] font-medium transition-all disabled:opacity-35 disabled:pointer-events-none'

export function Pagination<T>({
  state,
  label = 'مورد',
  perPageOptions = PER_PAGE_OPTIONS,
  className,
}: {
  state: PaginationState<T>
  /** واحد شمارش، مثلاً «سفارش» یا «کالا» */
  label?: string
  perPageOptions?: readonly number[]
  className?: string
}) {
  const { page, perPage, setPage, setPerPage, total, totalPages, from, to } = state

  if (total === 0) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5',
        className,
      )}
    >
      <p className="num text-[11.5px] text-muted">
        نمایش {toFaDigits(from)} تا {toFaDigits(to)} از {toFaDigits(total)} {label}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[11.5px] text-muted">
          <span>در هر صفحه</span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            aria-label="تعداد در هر صفحه"
            className="num h-9 cursor-pointer appearance-none rounded-xl border border-border bg-surface px-3 text-[12.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-brand-400 focus:shadow-[0_0_0_4px_rgba(0,179,146,0.14)]"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {toFaDigits(option)}
              </option>
            ))}
          </select>
        </label>

        {totalPages > 1 && (
          <nav className="flex items-center gap-1.5" aria-label="صفحه‌بندی">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              aria-label="صفحه قبل"
              className={cn(pageButton, 'border-border text-muted hover:border-brand-400')}
            >
              <ChevronRight className="size-4" />
            </button>

            {pageWindow(page, totalPages).map((item, i) =>
              item === 'gap' ? (
                <span key={`gap-${i}`} className="grid size-9 place-items-center text-[12.5px] text-muted">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  aria-current={item === page ? 'page' : undefined}
                  className={cn(
                    pageButton,
                    item === page
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-border text-muted hover:border-brand-400',
                  )}
                >
                  {toFaDigits(item)}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              aria-label="صفحه بعد"
              className={cn(pageButton, 'border-border text-muted hover:border-brand-400')}
            >
              <ChevronLeft className="size-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
