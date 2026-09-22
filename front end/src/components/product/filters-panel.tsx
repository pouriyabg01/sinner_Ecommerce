'use client'

import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import type { ProductFacets } from '@/types/catalog'
import { useProductFilters } from '@/lib/use-product-filters'
import { Button } from '@/components/ui/button'
import { formatPrice, groupDigits, toEnDigits, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-5 last:border-0">
      <h3 className="mb-3 text-[13px] font-bold">{title}</h3>
      {children}
    </div>
  )
}

function Check({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean
  onChange: () => void
  label: string
  count?: number
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-1.5">
      <span
        className={cn(
          'grid size-4.5 shrink-0 place-items-center rounded-md border transition-all duration-200',
          checked ? 'border-brand-500 bg-brand-500' : 'border-border group-hover:border-brand-400',
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 text-[13px] text-muted transition-colors group-hover:text-foreground">{label}</span>
      {count != null && <span className="num text-[11px] text-muted/70">{toFaDigits(count)}</span>}
    </label>
  )
}

export function FiltersPanel({ facets, onDone }: { facets?: ProductFacets; onDone?: () => void }) {
  const { query, setFilters, toggleInArray, toggleSpec, clearAll, activeCount } = useProductFilters()
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')

  useEffect(() => {
    setMinInput(query.minPrice ? groupDigits(query.minPrice) : '')
    setMaxInput(query.maxPrice ? groupDigits(query.maxPrice) : '')
  }, [query.minPrice, query.maxPrice])

  const [priceError, setPriceError] = useState<string>()

  const applyPrice = () => {
    const min = toEnDigits(minInput).replace(/\D/g, '')
    const max = toEnDigits(maxInput).replace(/\D/g, '')

    // «از» بزرگ‌تر از «تا» همیشه صفر نتیجه می‌دهد؛ بهتر است همین‌جا بگوییم
    if (min && max && Number(min) > Number(max)) {
      setPriceError('مقدار «از» نباید بزرگ‌تر از «تا» باشد')
      return
    }

    setPriceError(undefined)
    setFilters({ minPrice: min ? Number(min) : undefined, maxPrice: max ? Number(max) : undefined })
    onDone?.()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">
          فیلترها
          {activeCount > 0 && (
            <span className="num ms-2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] text-white">
              {toFaDigits(activeCount)}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button
            onClick={() => {
              clearAll()
              onDone?.()
            }}
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-red-500"
          >
            <X className="size-3.5" />
            حذف همه
          </button>
        )}
      </div>

      <Group title="وضعیت">
        <Check
          checked={Boolean(query.inStockOnly)}
          onChange={() => setFilters({ inStockOnly: !query.inStockOnly })}
          label="فقط کالاهای موجود"
        />
        <Check
          checked={Boolean(query.hasDiscount)}
          onChange={() => setFilters({ hasDiscount: !query.hasDiscount })}
          label="فقط تخفیف‌دارها"
        />
      </Group>

      <Group title="محدوده قیمت">
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={minInput}
              onChange={(e) => {
                setMinInput(groupDigits(e.target.value))
                setPriceError(undefined)
              }}
              aria-label="حداقل قیمت"
              aria-invalid={Boolean(priceError) || undefined}
              placeholder="از"
              inputMode="numeric"
              className={cn(
                'num h-10 rounded-xl border bg-background px-3 text-center text-xs outline-none',
                priceError ? 'border-red-500' : 'border-border focus:border-brand-400',
              )}
            />
            <input
              value={maxInput}
              onChange={(e) => {
                setMaxInput(groupDigits(e.target.value))
                setPriceError(undefined)
              }}
              aria-label="حداکثر قیمت"
              aria-invalid={Boolean(priceError) || undefined}
              placeholder="تا"
              inputMode="numeric"
              className={cn(
                'num h-10 rounded-xl border bg-background px-3 text-center text-xs outline-none',
                priceError ? 'border-red-500' : 'border-border focus:border-brand-400',
              )}
            />
          </div>
          {priceError && (
            <p role="alert" className="text-[11px] text-red-500">
              {priceError}
            </p>
          )}
          {facets && (
            <p className="text-[11px] text-muted">
              از {formatPrice(facets.priceRange.min, false)} تا {formatPrice(facets.priceRange.max)}
            </p>
          )}
          <Button size="sm" variant="soft" block onClick={applyPrice}>
            اعمال قیمت
          </Button>
        </div>
      </Group>

      {facets && facets.brands.length > 0 && (
        <Group title="برند">
          <div className="max-h-56 overflow-y-auto pe-1">
            {facets.brands.map((b) => (
              <Check
                key={b.value}
                checked={query.brands?.includes(b.value) ?? false}
                onChange={() => toggleInArray('brands', b.value)}
                label={b.label}
                count={b.count}
              />
            ))}
          </div>
        </Group>
      )}

      {/*
       * فیلترهای مخصوص دسته. کلیدها از `Category.specKeys` می‌آیند، پس با عوض
       * شدن دسته این گروه‌ها هم عوض می‌شوند؛ بدون دسته اصلاً چیزی نمی‌آید.
       */}
      {facets?.specs.map((facet) => (
        <Group key={facet.key} title={facet.label}>
          <div className="max-h-56 overflow-y-auto pe-1">
            {facet.options.map((option) => (
              <Check
                key={option.value}
                checked={query.specs?.[facet.key]?.includes(option.value) ?? false}
                onChange={() => toggleSpec(facet.key, option.value)}
                label={option.label}
                count={option.count}
              />
            ))}
          </div>
        </Group>
      ))}

      {facets && facets.tags.length > 0 && (
        <Group title="برچسب‌ها">
          <div className="flex flex-wrap gap-1.5">
            {facets.tags.map((t) => {
              const active = query.tags?.includes(t.value) ?? false
              return (
                <button
                  key={t.value}
                  onClick={() => toggleInArray('tags', t.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11px] transition-all duration-200',
                    active
                      ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                      : 'border-border text-muted hover:border-brand-400 hover:text-foreground',
                  )}
                >
                  {t.label}
                  <span className="num ms-1 opacity-60">{toFaDigits(t.count)}</span>
                </button>
              )
            })}
          </div>
        </Group>
      )}

      <Group title="حداقل امتیاز">
        <div className="flex flex-wrap gap-1.5">
          {[4, 3, 2].map((star) => {
            const active = query.minRating === star
            return (
              <button
                key={star}
                onClick={() => setFilters({ minRating: active ? undefined : star })}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] transition-all',
                  active
                    ? 'border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400'
                    : 'border-border text-muted hover:border-amber-300',
                )}
              >
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {toFaDigits(star)} به بالا
              </button>
            )
          })}
        </div>
      </Group>
    </div>
  )
}
