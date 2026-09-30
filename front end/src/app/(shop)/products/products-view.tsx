'use client'

import { Fragment, Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, PackageSearch, SlidersHorizontal } from 'lucide-react'
import { useProducts, useCategories } from '@/lib/api/queries'
import { useProductFilters } from '@/lib/use-product-filters'
import { buildCategoryTree } from '@/lib/category-tree'
import { FiltersPanel } from '@/components/product/filters-panel'
import { ProductCard, ProductCardSkeleton } from '@/components/product/product-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useUi } from '@/store/ui'
import { toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

const sortOptions = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'cheapest', label: 'ارزان‌ترین' },
  { value: 'expensive', label: 'گران‌ترین' },
  { value: 'popular', label: 'محبوب‌ترین' },
  { value: 'discount', label: 'بیشترین تخفیف' },
]

function ProductsView() {
  const { query, setFilters, activeCount } = useProductFilters()
  const { data, isLoading, isFetching } = useProducts(query)
  const { data: categories } = useCategories()
  const { filtersOpen, setFiltersOpen } = useUi()

  const category = categories?.find((c) => c.slug === query.category)

  const all = categories ?? []
  const roots = buildCategoryTree(all).map((node) => node.item)
  const byId = new Map(all.map((c) => [c.id, c]))

  /*
   * زنجیره‌ی دسته از ریشه تا خودش. درخت سقف سطح ندارد، پس «مادرِ مستقیم» برای
   * روشن نگه داشتن ریشه کافی نیست و باید تا بالا رفت. `seen` جلوی حلقه را
   * می‌گیرد تا یک ردیف خراب صفحه را قفل نکند.
   */
  const trail: typeof all = []
  const seen = new Set<string>()
  for (let step = category; step && !seen.has(step.id); step = step.parentId ? byId.get(step.parentId) : undefined) {
    seen.add(step.id)
    trail.unshift(step)
  }

  /*
   * ردیف دوم، یک پله پایین‌تر از دسته‌ی انتخاب‌شده را نشان می‌دهد تا بشود در
   * درخت جلو رفت؛ دسته‌ای که خودش ته شاخه است هم‌ردیف‌هایش را نشان می‌دهد تا
   * جابه‌جایی بین آن‌ها ممکن بماند.
   */
  const children = category ? all.filter((c) => c.parentId === category.id) : []
  const cousins = category?.parentId ? all.filter((c) => c.parentId === category.parentId) : []
  // ته شاخه هم‌ردیف‌هایش را نشان می‌دهد، مگر تنها فرزند باشد که ردیف یک دکمه‌ی همیشه‌روشن می‌شد
  const siblings = children.length ? children : cousins.length > 1 ? cousins : []
  const items = data?.items ?? []

  return (
    <div className="container-page py-8">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-brand-600">
          خانه
        </Link>
        {trail.length === 0 && (
          <>
            <span>/</span>
            <span className="text-foreground">همه محصولات</span>
          </>
        )}
        {/* هر پله‌ی مسیر جز آخری، خودش راهِ برگشت یک سطح بالاتر است */}
        {trail.map((step, index) => (
          <Fragment key={step.id}>
            <span>/</span>
            {index === trail.length - 1 ? (
              <span className="text-foreground">{step.title}</span>
            ) : (
              <button onClick={() => setFilters({ category: step.slug })} className="hover:text-brand-600">
                {step.title}
              </button>
            )}
          </Fragment>
        ))}
      </nav>

      <div className="mb-7 space-y-2">
        <h1 className="text-2xl font-bold">
          {query.q ? `نتایج جست‌وجو برای «${query.q}»` : (category?.title ?? 'همه محصولات')}
        </h1>
        {category && <p className="text-sm text-muted">{category.description}</p>}
      </div>

      {/* لینک سریع دسته‌ها */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilters({ category: undefined })}
          className={cn(
            'shrink-0 rounded-full border px-4 py-2 text-[13px] transition-all',
            !query.category ? 'border-brand-500 bg-brand-500 text-white' : 'border-border text-muted hover:border-brand-400',
          )}
        >
          همه
        </button>
        {roots.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilters({ category: c.slug })}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-[13px] transition-all',
              trail.some((step) => step.id === c.id)
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-border text-muted hover:border-brand-400',
            )}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/*
       * ردیف دوم فقط وقتی می‌آید که چیزی برای رفتن باشد؛ نشان دادن همیشگی
       * همه‌ی زیردسته‌ها این نوار را غیرقابل استفاده می‌کرد.
       */}
      {siblings.length > 0 && (
        <div className="mb-6 -mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {siblings.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilters({ category: c.slug })}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-all',
                query.category === c.slug
                  ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                  : 'border-border text-muted hover:border-brand-400',
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block">
          {/*
           * با فیلترهای مشخصات این ستون بلند می‌شود؛ ارتفاعش به پنجره محدود
           * می‌شود تا خودش بلغزد و کاربر برای رسیدن به لیست کالاها مجبور به
           * اسکرول کل صفحه نشود.
           */}
          <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto rounded-card border border-border bg-surface p-5">
            <FiltersPanel facets={data?.facets} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="size-4" />
              فیلترها
              {activeCount > 0 && (
                <span className="num rounded-full bg-brand-500 px-1.5 text-[10px] text-white">
                  {toFaDigits(activeCount)}
                </span>
              )}
            </Button>

            <span className="num text-[13px] text-muted">
              {isLoading ? '—' : `${toFaDigits(data?.total ?? 0)} کالا`}
            </span>

            <Select
              value={query.sort}
              onChange={(e) => setFilters({ sort: e.target.value as typeof query.sort })}
              className="ms-auto h-10 w-44 text-[13px]"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-card border border-border bg-surface">
              <EmptyState
                icon={PackageSearch}
                title="کالایی با این مشخصات یافت نشد"
                description="لطفاً فیلترها را تغییر دهید یا عبارت دیگری را جست‌وجو کنید."
                action={
                  <Button variant="soft" onClick={() => setFilters({ brands: [], tags: [], specs: {}, minPrice: undefined, maxPrice: undefined, hasDiscount: false, minRating: undefined })}>
                    حذف فیلترها
                  </Button>
                }
              />
            </div>
          ) : (
            <div className={cn('grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3', isFetching && 'opacity-60')}>
              {items.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-1.5">
              <button
                onClick={() => setFilters({ page: query.page! - 1 })}
                disabled={query.page === 1}
                aria-label="صفحه قبل"
                className="grid size-10 place-items-center rounded-xl border border-border transition-colors hover:border-brand-400 disabled:opacity-35"
              >
                <ChevronRight className="size-4" />
              </button>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilters({ page: p })}
                  className={cn(
                    'num grid size-10 place-items-center rounded-xl border text-[13px] font-medium transition-all',
                    p === data.page
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-border text-muted hover:border-brand-400',
                  )}
                >
                  {toFaDigits(p)}
                </button>
              ))}
              <button
                onClick={() => setFilters({ page: query.page! + 1 })}
                disabled={query.page === data.totalPages}
                aria-label="صفحه بعد"
                className="grid size-10 place-items-center rounded-xl border border-border transition-colors hover:border-brand-400 disabled:opacity-35"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="فیلترها" side="bottom">
        <FiltersPanel facets={data?.facets} onDone={() => setFiltersOpen(false)} />
      </Drawer>
    </div>
  )
}

export function ProductsPageClient() {
  return (
    <Suspense fallback={<div className="container-page py-8"><Skeleton className="h-96 rounded-card" /></div>}>
      <ProductsView />
    </Suspense>
  )
}
