'use client'

import { Check } from 'lucide-react'
import { useAdminCategories } from '@/lib/api/queries'
import { toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * انتخاب چند دسته، برای محدود کردن کد تخفیف. دسته‌ها چند تا بیشتر نیستند، پس
 * برخلاف ProductPicker جست‌وجو لازم ندارد و همه یکجا دیده می‌شوند.
 */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (categoryIds: string[]) => void
}) {
  const { data, isLoading } = useAdminCategories()

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  if (isLoading) return <p className="text-xs text-muted">در حال بارگذاری…</p>
  if (!data?.length) return <p className="text-xs text-muted">هنوز دسته‌ای ساخته نشده است.</p>

  // زیرمجموعه بلافاصله بعد از مادرش، تا انتخاب کردن با ترتیبِ پنل یکی باشد
  const ids = new Set(data.map((c) => c.id))
  const ordered = data
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .flatMap((root) => [root, ...data.filter((c) => c.parentId === root.id)])

  return (
    <div className="flex flex-wrap gap-2">
      {ordered.map((category) => {
        const picked = value.includes(category.id)
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={picked}
            onClick={() => toggle(category.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] transition-colors',
              picked
                ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                : 'border-border text-muted hover:border-brand-400',
            )}
          >
            <span
              className={cn(
                'grid size-4 shrink-0 place-items-center rounded border transition-colors',
                picked ? 'border-brand-500 bg-brand-500 text-white' : 'border-border',
              )}
            >
              {picked && <Check className="size-3" />}
            </span>
            {category.parentId && <span className="text-[11px] opacity-60">↳</span>}
            {category.title}
            <span className="num text-[11px] opacity-70">({toFaDigits(category.productCount)})</span>
          </button>
        )
      })}
    </div>
  )
}
