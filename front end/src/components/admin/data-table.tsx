'use client'

import { cn } from '@/lib/utils'
import { SortButton, type SortControl } from './sorting'
import { SelectAllBox, type SelectionControl } from './selection'

export function AdminCard({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-card border border-border bg-surface', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          {title && <h2 className="text-sm font-bold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/**
 * سرستون جدول: یا فقط یک برچسب، یا برچسبی که با `sortKey` قابل مرتب‌سازی می‌شود.
 * ستون‌های بدون برچسب (مثل ستون دکمه‌ها) با رشته‌ی خالی داده می‌شوند.
 */
export type TableHeadCell = string | { label: string; sortKey?: string }

export function Table({
  head,
  sort,
  selection,
  children,
}: {
  head: TableHeadCell[]
  /** خروجی useSort؛ بدون آن سرستون‌ها ساده رندر می‌شوند */
  sort?: SortControl
  /** خروجی useSelection؛ با دادنش ستون تیک خودکار اضافه می‌شود و ردیف‌ها باید SelectCell داشته باشند */
  selection?: SelectionControl
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl text-[12.5px]">
        <thead>
          <tr className="border-b border-border bg-surface-2/50">
            {selection && (
              <th className="w-12 px-3.5 align-middle">
                <SelectAllBox selection={selection} />
              </th>
            )}
            {head.map((cell, i) => {
              const { label, sortKey } = typeof cell === 'string' ? { label: cell, sortKey: undefined } : cell
              const sortable = Boolean(sort && sortKey)

              return (
                <th
                  key={sortKey ?? label ?? i}
                  aria-sort={
                    sortable && sort!.key === sortKey
                      ? sort!.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className="whitespace-nowrap p-3.5 text-start font-medium text-muted"
                >
                  {sortable ? <SortButton label={label} sortKey={sortKey!} sort={sort!} /> : label}
                </th>
              )
            })}
          </tr>
        </thead>
        {/* ردیف تیک‌خورده پس‌زمینه می‌گیرد تا انتخاب در نگاه اول معلوم باشد */}
        <tbody className="divide-y divide-border [&_tr:has(input[data-row-select]:checked)]:bg-brand-500/[0.06]">{children}</tbody>
      </table>
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}: {
  icon: React.ElementType
  label: string
  value: string
  hint?: string
  tone?: 'brand' | 'ember' | 'amber' | 'sky'
}) {
  const tones = {
    brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
    ember: 'bg-ember-500/12 text-ember-600 dark:text-ember-400',
    amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    sky: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  }
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <span className={cn('mb-3.5 grid size-10 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-4.5" />
      </span>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="num mt-1 text-lg font-bold">{value}</p>
      {hint && <p className="mt-1 text-[10.5px] text-muted">{hint}</p>}
    </div>
  )
}
