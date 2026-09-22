'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SPEC_PARAM_PREFIX, type ProductQuery } from '@/types/catalog'
import { parseProductQuery } from '@/lib/product-query'

/** فیلترها در URL زندگی می‌کنند تا لینک اشتراک‌گذاری و دکمه‌ی back درست کار کند */
export function useProductFilters() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const query = useMemo<ProductQuery>(() => parseProductQuery(params), [params])

  const setFilters = useCallback(
    (patch: Partial<ProductQuery>, options?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(params.toString())
      const apply = (key: string, value: unknown) => {
        if (value === undefined || value === null || value === '' || value === false) next.delete(key)
        else if (Array.isArray(value)) (value.length ? next.set(key, value.join(',')) : next.delete(key))
        else next.set(key, String(value))
      }

      // با عوض شدن دسته، کلیدهای مشخصات هم عوض می‌شوند؛ فیلتر دسته‌ی قبلی
      // روی دسته‌ی جدید هیچ کالایی را نمی‌گیرد و لیست را الکی خالی می‌کند
      if ('category' in patch && patch.category !== (params.get('category') ?? undefined)) {
        ;[...next.keys()].filter((k) => k.startsWith(SPEC_PARAM_PREFIX)).forEach((k) => next.delete(k))
      }

      Object.entries(patch).forEach(([key, value]) => {
        // `specs` یک شیء است نه یک پارامتر؛ کل گروه `spec_*` با آن جایگزین می‌شود
        if (key === 'specs') {
          ;[...next.keys()].filter((k) => k.startsWith(SPEC_PARAM_PREFIX)).forEach((k) => next.delete(k))
          Object.entries((value ?? {}) as Record<string, string[]>).forEach(([specKey, values]) =>
            apply(`${SPEC_PARAM_PREFIX}${specKey}`, values),
          )
          return
        }
        apply(key, value)
      })
      if (options?.resetPage !== false && !('page' in patch)) next.delete('page')
      router.push(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  const toggleInArray = useCallback(
    (key: 'brands' | 'tags', value: string) => {
      const current = query[key] ?? []
      setFilters({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] })
    },
    [query, setFilters],
  )

  /** یک مقدار مشخصه را در گروه خودش خاموش/روشن می‌کند */
  const toggleSpec = useCallback(
    (key: string, value: string) => {
      const current = query.specs?.[key] ?? []
      const nextValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      setFilters({ specs: { ...query.specs, [key]: nextValues } })
    },
    [query.specs, setFilters],
  )

  const clearAll = useCallback(() => {
    const next = new URLSearchParams()
    if (query.category) next.set('category', query.category)
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }, [pathname, query.category, router])

  const activeCount =
    (query.brands?.length ?? 0) +
    (query.tags?.length ?? 0) +
    (query.minPrice != null ? 1 : 0) +
    (query.maxPrice != null ? 1 : 0) +
    (query.inStockOnly ? 1 : 0) +
    (query.hasDiscount ? 1 : 0) +
    (query.minRating != null ? 1 : 0) +
    Object.values(query.specs ?? {}).reduce((sum, values) => sum + values.length, 0)

  return { query, setFilters, toggleInArray, toggleSpec, clearAll, activeCount }
}
