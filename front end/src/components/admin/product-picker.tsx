'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, Search } from 'lucide-react'
import { useAdminProducts } from '@/lib/api/queries'
import { Input } from '@/components/ui/input'
import { PLACEHOLDER_IMAGE } from '@/components/admin/image-field'
import { formatPrice, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * انتخاب چند کالا از فهرست کامل. هم کد تخفیف (محدود کردن کد به چند کالا) و هم
 * کروسل با «انتخاب دستی» از همین استفاده می‌کنند، پس جست‌وجو و ترتیب یکی می‌ماند.
 *
 * انتخاب‌شده‌ها همیشه بالای فهرست می‌آیند؛ وقتی چند کالا از میان ده‌ها کالا
 * انتخاب شده باشد، وگرنه کاربر باید دنبالشان بگردد تا بفهمد چه چیزی زده است.
 */
export function ProductPicker({
  value,
  onChange,
  emptyMeansAll = false,
}: {
  value: string[]
  onChange: (productIds: string[]) => void
  /** برای کد تخفیف: خالی گذاشتن یعنی «همه‌ی کالاها»، نه «هیچ‌کدام» */
  emptyMeansAll?: boolean
}) {
  const { data, isLoading } = useAdminProducts()
  const [term, setTerm] = useState('')

  const items = useMemo(() => {
    const all = data?.items ?? []
    const needle = term.trim().toLowerCase()
    const matched = needle
      ? all.filter((p) => `${p.title} ${p.titleEn} ${p.slug}`.toLowerCase().includes(needle))
      : all
    // انتخاب‌شده‌ها اول
    return [...matched].sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)))
  }, [data?.items, term, value])

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="جست‌وجوی کالا"
          className="h-10 ps-9 text-[13px]"
        />
      </div>

      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-border p-1.5">
        {isLoading ? (
          <li className="p-4 text-center text-xs text-muted">در حال بارگذاری…</li>
        ) : items.length === 0 ? (
          <li className="p-4 text-center text-xs text-muted">کالایی پیدا نشد.</li>
        ) : (
          items.map((product) => {
            const picked = value.includes(product.id)
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  aria-pressed={picked}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl p-1.5 text-start transition-colors',
                    picked ? 'bg-brand-500/10' : 'hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                      picked ? 'border-brand-500 bg-brand-500 text-white' : 'border-border',
                    )}
                  >
                    {picked && <Check className="size-3.5" />}
                  </span>
                  <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <Image
                      src={product.images[0] ?? PLACEHOLDER_IMAGE}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{product.title}</span>
                    <span className="num block text-[11px] text-muted">{formatPrice(product.price)}</span>
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>

      <p className="text-xs text-muted">
        {value.length === 0
          ? emptyMeansAll
            ? 'هیچ کالایی انتخاب نشده — کد روی همه‌ی کالاها کار می‌کند.'
            : 'هنوز کالایی انتخاب نشده است.'
          : `${toFaDigits(value.length)} کالا انتخاب شده.`}
      </p>
    </div>
  )
}
