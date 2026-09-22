import type { FacetBucket, Paginated, Product, ProductFacets, ProductQuery, SpecFacet } from '@/types/catalog'
import { SPEC_PARAM_PREFIX } from '@/types/catalog'
import { discountPercent } from '@/lib/format'
import { brands as allBrands, specLabel } from './data/taxonomy'

export function filterProducts(all: Product[], q: ProductQuery): Product[] {
  let list = [...all]

  if (q.q) {
    const needle = q.q.trim().toLowerCase()
    list = list.filter((p) =>
      [p.title, p.titleEn, p.shortDescription, ...p.tags].join(' ').toLowerCase().includes(needle),
    )
  }
  if (q.ids?.length) list = list.filter((p) => q.ids!.includes(p.id))
  if (q.category) list = list.filter((p) => p.categorySlug === q.category)
  if (q.brands?.length) list = list.filter((p) => q.brands!.includes(p.brandSlug))
  if (q.minPrice != null) list = list.filter((p) => p.price >= q.minPrice!)
  if (q.maxPrice != null) list = list.filter((p) => p.price <= q.maxPrice!)
  if (q.inStockOnly) list = list.filter((p) => p.stock > 0)
  if (q.hasDiscount) list = list.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
  if (q.minRating != null) list = list.filter((p) => p.rating >= q.minRating!)
  if (q.tags?.length) list = list.filter((p) => q.tags!.some((t) => p.tags.includes(t)))

  // درون هر کلید «یا»، بین کلیدها «و» — رفتار معمول فیلتر مشخصات در فروشگاه‌ها
  for (const [key, values] of Object.entries(q.specs ?? {})) {
    if (!values.length) continue
    list = list.filter((p) => p.specs.some((spec) => spec.key === key && values.includes(spec.value)))
  }

  switch (q.sort) {
    case 'cheapest':
      list.sort((a, b) => a.price - b.price)
      break
    case 'expensive':
      list.sort((a, b) => b.price - a.price)
      break
    case 'popular':
      list.sort((a, b) => b.reviewCount * b.rating - a.reviewCount * a.rating)
      break
    case 'discount':
      list.sort(
        (a, b) =>
          (discountPercent(b.price, b.compareAtPrice) ?? 0) - (discountPercent(a.price, a.compareAtPrice) ?? 0),
      )
      break
    case 'newest':
    default:
      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }

  return list
}

export function paginate<T>(items: T[], page = 1, perPage = 12): Paginated<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    page: safePage,
    perPage,
    total,
    totalPages,
  }
}

/**
 * گروه‌های فیلتر مشخصات برای دسته‌ی انتخاب‌شده.
 * `specKeys` از خود دسته می‌آید، پس هر دسته فیلترهای مخصوص خودش را می‌گیرد.
 * گروهی که فقط یک مقدار دارد نمایش داده نمی‌شود مگر کاربر همان را انتخاب کرده
 * باشد: انتخابش هیچ کالایی را کنار نمی‌گذارد و فقط ستون فیلترها را شلوغ می‌کند.
 */
function buildSpecFacets(all: Product[], q: ProductQuery, specKeys: string[]): SpecFacet[] {
  return specKeys.flatMap((key) => {
    // خودِ این کلید از دامنه حذف می‌شود تا بشود چند مقدار را با هم انتخاب کرد
    const { [key]: _omitted, ...others } = q.specs ?? {}
    const scope = filterProducts(all, { ...q, specs: others, page: undefined })

    const counts = new Map<string, number>()
    let label = ''
    scope.forEach((p) => {
      const spec = p.specs.find((s) => s.key === key)
      if (!spec) return
      label ||= spec.label
      counts.set(spec.value, (counts.get(spec.value) ?? 0) + 1)
    })

    const selected = q.specs?.[key] ?? []
    if (counts.size < 2 && !selected.length) return []

    const options: FacetBucket[] = [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fa'))

    return [{ key, label: label || specLabel(key), options }]
  })
}

/** فست‌ها روی نتیجه‌ی فیلترشده‌ی بدون درنظرگرفتن خود آن فیلد محاسبه می‌شوند */
export function buildFacets(all: Product[], q: ProductQuery, specKeys: string[] = []): ProductFacets {
  const scopeForBrands = filterProducts(all, { ...q, brands: undefined, page: undefined })
  const scopeForTags = filterProducts(all, { ...q, tags: undefined, page: undefined })
  const priced = filterProducts(all, { ...q, minPrice: undefined, maxPrice: undefined, page: undefined })

  const brandCounts = new Map<string, number>()
  scopeForBrands.forEach((p) => brandCounts.set(p.brandSlug, (brandCounts.get(p.brandSlug) ?? 0) + 1))

  const tagCounts = new Map<string, number>()
  scopeForTags.forEach((p) => p.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)))

  const brandBuckets: FacetBucket[] = [...brandCounts.entries()]
    .map(([value, count]) => ({
      value,
      label: allBrands.find((b) => b.slug === value)?.title ?? value,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const tagBuckets: FacetBucket[] = [...tagCounts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count)

  const prices = priced.map((p) => p.price)
  return {
    brands: brandBuckets,
    tags: tagBuckets,
    specs: buildSpecFacets(all, q, specKeys),
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
  }
}

export function parseProductQuery(url: URL): ProductQuery {
  const p = url.searchParams
  const num = (key: string) => (p.get(key) ? Number(p.get(key)) : undefined)
  const list = (key: string) => p.getAll(key).flatMap((v) => v.split(',')).filter(Boolean)
  const specs: Record<string, string[]> = {}
  for (const [key, value] of p.entries()) {
    if (!key.startsWith(SPEC_PARAM_PREFIX)) continue
    const values = value.split(',').filter(Boolean)
    if (values.length) specs[key.slice(SPEC_PARAM_PREFIX.length)] = values
  }

  return {
    q: p.get('q') ?? undefined,
    ids: list('ids'),
    category: (p.get('category') as ProductQuery['category']) ?? undefined,
    brands: list('brands'),
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    inStockOnly: p.get('inStockOnly') === 'true',
    hasDiscount: p.get('hasDiscount') === 'true',
    minRating: num('minRating'),
    tags: list('tags'),
    specs,
    sort: (p.get('sort') as ProductQuery['sort']) ?? 'newest',
    page: num('page') ?? 1,
    perPage: num('perPage') ?? 12,
  }
}
