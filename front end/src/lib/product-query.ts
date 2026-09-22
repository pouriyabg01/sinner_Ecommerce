import { SPEC_PARAM_PREFIX, type ProductQuery } from '@/types/catalog'

type ParamSource = { get(key: string): string | null; entries(): IterableIterator<[string, string]> }

/**
 * پارامترهای آدرس صفحه‌ی فهرست کالا → کوئری API. هم هوک مرورگر و هم صفحه‌ی سرور از
 * همین می‌سازند؛ اگر دو کوئری حتی یک فیلد فرق داشته باشند، کلید کش فرق می‌کند و داده‌ای
 * که سرور از پیش آورده دور ریخته می‌شود.
 */
export function parseProductQuery(params: ParamSource): ProductQuery {
  const num = (key: string) => (params.get(key) ? Number(params.get(key)) : undefined)
  const list = (key: string) => params.get(key)?.split(',').filter(Boolean) ?? []

  // هر پارامتر `spec_*` یک گروه فیلتر مشخصات است
  const specs: Record<string, string[]> = {}
  for (const [key, value] of params.entries()) {
    if (!key.startsWith(SPEC_PARAM_PREFIX)) continue
    const values = value.split(',').filter(Boolean)
    if (values.length) specs[key.slice(SPEC_PARAM_PREFIX.length)] = values
  }

  return {
    q: params.get('q') ?? undefined,
    category: (params.get('category') as ProductQuery['category']) ?? undefined,
    brands: list('brands'),
    tags: list('tags'),
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    inStockOnly: params.get('inStockOnly') === 'true',
    hasDiscount: params.get('hasDiscount') === 'true',
    minRating: num('minRating'),
    specs,
    sort: (params.get('sort') as ProductQuery['sort']) ?? 'newest',
    page: num('page') ?? 1,
    perPage: 12,
  }
}
