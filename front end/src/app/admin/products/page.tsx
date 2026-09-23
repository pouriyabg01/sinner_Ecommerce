'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { z } from 'zod'
import Image from 'next/image'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Product, ProductCondition, ProductStatus } from '@/types/catalog'
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_OPTIONS } from '@/types/catalog'
import {
  useAdminProducts,
  useBrands,
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from '@/lib/api/queries'
import { CONDITION_HINT, CONDITION_OPTIONS } from '@/lib/product-condition'
import { ApiError } from '@/lib/api/client'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { EmptyRows, FilterBar, TableTitle, matches, useTableFilters } from '@/components/admin/filters'
import { Pagination, usePagination } from '@/components/admin/pagination'
import { useSort } from '@/components/admin/sorting'
import { BulkBar, SelectCell, runBulk, useSelection } from '@/components/admin/selection'
import { ImageField, PLACEHOLDER_IMAGE } from '@/components/admin/image-field'
import { SpecsField, fromSpecDrafts, toSpecDrafts, type SpecDraft } from '@/components/admin/specs-field'
import {
  VariantsField,
  derivePricing,
  emptyVariant,
  fromVariantDrafts,
  toVariantDrafts,
  type VariantDraft,
} from '@/components/admin/variants-field'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChipPicker } from '@/components/ui/chip-picker'
import { Drawer } from '@/components/ui/drawer'
import { Field, Input, PriceInput, Select, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import {
  amountSchema,
  optionalText,
  productSpecsSchema,
  productVariantsSchema,
  requiredText,
  slugSchema,
} from '@/lib/validation'
import { formatPrice, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'


type Draft = {
  id?: string
  title: string
  titleEn: string
  slug: string
  categorySlug: Product['categorySlug']
  brandSlug: string
  compareAtPrice: string
  shortDescription: string
  description: string
  tags: string
  images: string[]
  specs: SpecDraft[]
  variants: VariantDraft[]
  status: ProductStatus
  condition: ProductCondition
  variantLabel: string
}

/** نامک از نام انگلیسی؛ «iPhone 16 Pro!» → «iphone-16-pro». خالی بماند، سرور خودش می‌سازد */
const toSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** خطای فیلد بیرون از دید کشو می‌ماند و دکمه‌ی ذخیره بی‌اثر به نظر می‌رسید */
const scrollToFirstError = () =>
  requestAnimationFrame(() => document.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))

/** مقدار فیلتر «بدون دسته‌بندی» — کالاهایی که دسته‌شان حذف شده و در فروشگاه دیده نمی‌شوند */
const NO_CATEGORY = '__none'

const emptyDraft: Draft = {
  title: '',
  titleEn: '',
  slug: '',
  // دسته‌ی ثابت پیش‌فرض ممکن است حذف شده باشد؛ ادمین خودش انتخاب می‌کند
  categorySlug: '',
  brandSlug: 'apple',
  compareAtPrice: '',
  shortDescription: '',
  description: '',
  tags: '',
  images: [],
  specs: [],
  variants: [emptyVariant()],
  status: 'active',
  condition: 'new',
  variantLabel: '',
}

function toDraft(product: Product): Draft {
  return {
    id: product.id,
    title: product.title,
    titleEn: product.titleEn,
    slug: product.slug,
    categorySlug: product.categorySlug,
    brandSlug: product.brandSlug,
    compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
    shortDescription: product.shortDescription,
    description: product.description,
    tags: product.tags.join('، '),
    images: [...product.images],
    specs: toSpecDrafts(product.specs),
    variants: product.variants.length ? toVariantDrafts(product.variants) : [emptyVariant()],
    status: product.status,
    condition: product.condition ?? 'new',
    variantLabel: product.variantLabel ?? '',
  }
}

const productSchema = z
  .object({
    title: requiredText('نام فارسی'),
    titleEn: optionalText(80, 'نام انگلیسی'),
    slug: slugSchema,
    categorySlug: z.string().refine((v) => v !== '', { message: 'دسته‌بندی را انتخاب کنید — کالای بی‌دسته در فروشگاه دیده نمی‌شود' }),
    brandSlug: z.string(),
    compareAtPrice: amountSchema({ label: 'قیمت پیش از تخفیف', min: 1_000, required: false }),
    shortDescription: optionalText(200, 'توضیح کوتاه'),
    description: optionalText(4000, 'توضیح کامل'),
    tags: z.string(),
    images: z.array(z.string()),
    specs: productSpecsSchema,
    variants: productVariantsSchema,
  })
  // قیمت پیش از تخفیف باید از ارزان‌ترین مدل بیشتر باشد، وگرنه «تخفیف» منفی می‌شود
  .refine(
    (v) => {
      if (v.compareAtPrice === null) return true
      const { price } = derivePricing(fromVariantDrafts(v.variants))
      return price === 0 || v.compareAtPrice > price
    },
    {
      message: 'قیمت پیش از تخفیف باید بیشتر از قیمت ارزان‌ترین مدل باشد',
      path: ['compareAtPrice'],
    },
  )

/** useSearchParams باید داخل Suspense باشد وگرنه build صفحه را رد می‌کند */
export default function AdminProductsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-card" />}>
      <ProductsView />
    </Suspense>
  )
}

function ProductsView() {
  const { data, isLoading } = useAdminProducts()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  // دسته و برند از همان منبعی می‌آیند که در پنل ویرایش می‌شوند، نه از seed ثابت
  const { data: categoryList } = useCategories()
  const { data: brandList } = useBrands()
  const categories = useMemo(() => categoryList ?? [], [categoryList])
  const brands = useMemo(() => brandList ?? [], [brandList])

  // لینک‌های داشبورد: ?q=<اسلاگ> برای یک کالا، ?stock=low برای فهرست رو به اتمام
  const params = useSearchParams()
  const focused = params.get('q')?.trim() ?? ''
  const presetStock = params.get('stock')
  const presetCategory = params.get('category')
  const filters = useTableFilters(['category', 'brand', 'stock', 'status'], focused, {
    ...(presetStock ? { stock: presetStock } : {}),
    ...(presetCategory ? { category: presetCategory } : {}),
  })
  const [draft, setDraft] = useState<Draft | null>(null)
  const form = useForm(productSchema)

  /** هر تغییری در فرم، بعد از اولین تلاش برای ثبت، خطاها را دوباره حساب می‌کند */
  const update = (patch: Partial<Draft>) => {
    if (!draft) return
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  const openDraft = (value: Draft) => {
    form.reset()
    setDraft(value)
  }

  const all = useMemo(() => data?.items ?? [], [data?.items])
  const pickedCategory = filters.pick('category')

  const items = useMemo(
    () =>
      all.filter((p) => {
        const stock = filters.pick('stock')
        return (
          matches(filters.term, p.title, p.titleEn, p.slug) &&
          (pickedCategory === undefined ||
            (pickedCategory === NO_CATEGORY ? !p.categorySlug : p.categorySlug === pickedCategory)) &&
          (filters.pick('brand') ?? p.brandSlug) === p.brandSlug &&
          (filters.pick('status') ?? p.status) === p.status &&
          (stock === undefined ||
            (stock === 'out' ? p.stock === 0 : stock === 'low' ? p.stock > 0 && p.stock <= 5 : p.stock > 5))
        )
      }),
    [all, filters],
  )

  const sort = useSort(items, {
    title: (p) => p.title,
    category: (p) => categories.find((c) => c.slug === p.categorySlug)?.title,
    brand: (p) => brands.find((b) => b.slug === p.brandSlug)?.title,
    price: { get: (p) => p.price, defaultDirection: 'desc' },
    stock: { get: (p) => p.stock, defaultDirection: 'desc' },
    status: (p) => PRODUCT_STATUS_LABEL[p.status],
  })

  const pagination = usePagination(sort.sorted, 10, `${filters.token}|${sort.token}`)
  const selection = useSelection(
    pagination.pageItems.map((p) => p.id),
    sort.sorted.map((p) => p.id),
  )
  const [bulkBusy, setBulkBusy] = useState(false)

  const removeSelected = async () => {
    const ids = selection.selected
    if (!ids.length) return
    if (!confirm(`آیا ${toFaDigits(ids.length)} کالا حذف شوند؟ این کار برگشت‌پذیر نیست.`)) return

    setBulkBusy(true)
    const { done, failed, firstError } = await runBulk(ids, (id) => deleteProduct.mutateAsync(id))
    setBulkBusy(false)
    selection.clear()
    if (done) toast.success(`${toFaDigits(done)} کالا حذف شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} کالا حذف نشد`)
  }

  const save = () => {
    if (!draft) return
    const values = form.validate(draft)
    if (!values) {
      toast.error('چند فیلد نیاز به اصلاح دارد')
      scrollToFirstError()
      return
    }

    const variants = fromVariantDrafts(values.variants)

    const payload: Partial<Product> = {
      title: values.title,
      titleEn: values.titleEn,
      slug: values.slug || toSlug(values.titleEn) || undefined,
      categorySlug: values.categorySlug as Product['categorySlug'],
      brandSlug: values.brandSlug,
      compareAtPrice: values.compareAtPrice,
      // قیمت و موجودی فرستاده نمی‌شوند؛ سرور از روی مدل‌ها حسابشان می‌کند
      variants,
      shortDescription: values.shortDescription,
      description: values.description,
      tags: values.tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean),
      images: values.images.length > 0 ? values.images : [PLACEHOLDER_IMAGE],
      specs: fromSpecDrafts(values.specs),
      status: draft.status,
      condition: draft.condition,
      variantLabel: draft.variantLabel.trim(),
    }

    /**
     * بدون این، ردِ سرور (مثلاً نامک تکراری) هیچ نشانه‌ای نداشت و فرم انگار کار نمی‌کرد.
     * کلیدهای خطای لاراول همان مسیرهای فرم‌اند (slug، variants.0.price)، پس زیر همان فیلد می‌نشینند.
     */
    const onError = (error: Error) => {
      const errors = error instanceof ApiError ? (error.payload as { errors?: Record<string, string[]> })?.errors : undefined
      Object.entries(errors ?? {}).forEach(([field, messages]) => form.setError(field, messages[0]))
      toast.error(error.message)
      scrollToFirstError()
    }

    if (draft.id) {
      updateProduct.mutate(
        { id: draft.id, body: payload },
        {
          onSuccess: () => {
            toast.success('محصول به‌روزرسانی شد')
            setDraft(null)
          },
          onError,
        },
      )
    } else {
      createProduct.mutate(
        {
          ...payload,
          rating: 0,
          reviewCount: 0,
          isNew: true,
          isFeatured: false,
        },
        {
          onSuccess: () => {
            toast.success('محصول جدید ثبت شد')
            setDraft(null)
          },
          onError,
        },
      )
    }
  }

  return (
    <PermissionGate permission="product.manage">
      <div className="space-y-5">
        <TableTitle title="مدیریت محصولات" unit="کالا" total={all.length} shown={items.length} filters={filters} />

        <FilterBar
          filters={filters}
          placeholder="نام کالا، نام انگلیسی یا اسلاگ…"
          action={
            <Button onClick={() => openDraft(emptyDraft)}>
              <Plus className="size-4" />
              محصول جدید
            </Button>
          }
          selects={[
            {
              id: 'category',
              label: 'دسته',
              options: [
                ...categories.map((c) => ({ value: c.slug, label: c.title })),
                // فقط وقتی کالای بی‌دسته‌ای هست، گزینه‌اش معنا دارد
                ...(all.some((p) => !p.categorySlug) ? [{ value: NO_CATEGORY, label: 'بدون دسته‌بندی' }] : []),
              ],
            },
            { id: 'brand', label: 'برند', options: brands.map((b) => ({ value: b.slug, label: b.title })) },
            {
              id: 'stock',
              label: 'موجودی',
              options: [
                { value: 'in', label: 'موجود' },
                { value: 'low', label: 'رو به اتمام' },
                { value: 'out', label: 'ناموجود' },
              ],
            },
            {
              id: 'status',
              label: 'وضعیت',
              options: PRODUCT_STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
            },
          ]}
        />

        <AdminCard>
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !items.length ? (
            <EmptyRows filters={filters} icon={Package} title="کالایی ثبت نشده" description="اولین کالا را با دکمه‌ی «محصول جدید» اضافه کنید." />
          ) : (
            <>
            <BulkBar selection={selection} unit="کالا">
              <Button
                variant="ghost"
                size="sm"
                loading={bulkBusy}
                className="text-red-600 hover:text-red-700"
                onClick={() => void removeSelected()}
              >
                <Trash2 className="size-3.5" />
                حذف انتخاب‌شده‌ها
              </Button>
            </BulkBar>
            <Table
              selection={selection}
              sort={sort}
              head={[
                { label: 'محصول', sortKey: 'title' },
                { label: 'دسته', sortKey: 'category' },
                { label: 'برند', sortKey: 'brand' },
                { label: 'قیمت', sortKey: 'price' },
                { label: 'موجودی', sortKey: 'stock' },
                { label: 'وضعیت', sortKey: 'status' },
                '',
              ]}
            >
              {pagination.pageItems.map((product) => (
                <tr
                  key={product.id}
                  className={cn(
                    'transition-colors hover:bg-surface-2/40',
                    product.slug === focused && 'bg-brand-500/[0.07]',
                  )}
                >
                  <SelectCell selection={selection} id={product.id} label={product.title} />
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <Image
                        src={product.images[0] ?? PLACEHOLDER_IMAGE}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-lg bg-ink-950 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.title}</p>
                        <p className="num truncate text-[10.5px] text-muted" dir="ltr">
                          {product.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-muted">
                    {product.categorySlug ? (
                      categories.find((c) => c.slug === product.categorySlug)?.title
                    ) : (
                      <Badge tone="warning" title="برای فعال شدن و نمایش در فروشگاه، اول یک دسته انتخاب کنید">
                        بدون دسته‌بندی
                      </Badge>
                    )}
                  </td>
                  <td className="p-3.5 text-muted">{brands.find((b) => b.slug === product.brandSlug)?.title}</td>
                  <td className="num whitespace-nowrap p-3.5 font-medium">{formatPrice(product.price, false)}</td>
                  <td className="num p-3.5">{toFaDigits(product.stock)}</td>
                  <td className="p-3.5">
                    <ChipPicker
                      label={`تغییر وضعیت ${product.title}`}
                      value={product.status}
                      options={PRODUCT_STATUS_OPTIONS}
                      disabled={updateProduct.isPending}
                      onChange={(status: ProductStatus) =>
                        updateProduct.mutate(
                          { id: product.id, body: { status } },
                          {
                            onSuccess: () =>
                              toast.success(`«${product.title}» ${PRODUCT_STATUS_LABEL[status]} شد`),
                            onError: (error: Error) => toast.error(error.message),
                          },
                        )
                      }
                      className="flex-nowrap"
                    />
                  </td>
                  <td className="p-3.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="ویرایش" onClick={() => openDraft(toDraft(product))}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف"
                        className="text-muted hover:text-red-500"
                        onClick={() => {
                          if (confirm(`آیا «${product.title}» حذف شود؟`))
                            deleteProduct.mutate(product.id, { onSuccess: () => toast.success('محصول حذف شد') })
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            </>
          )}
          {!isLoading && <Pagination state={pagination} label="کالا" />}
        </AdminCard>

        <Drawer
          open={draft !== null}
          onClose={() => setDraft(null)}
          title={draft?.id ? 'ویرایش محصول' : 'محصول جدید'}
          widthClass="w-full max-w-lg"
          footer={
            <div className="flex gap-2">
              <Button block loading={createProduct.isPending || updateProduct.isPending} onClick={save}>
                ذخیره
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                انصراف
              </Button>
            </div>
          }
        >
          {draft && (
            <div className="space-y-4">
              <Field label="نام فارسی" required error={form.errors.title}>
                <Input
                  value={draft.title}
                  onChange={(e) => update({ title: e.target.value })}
                  invalid={Boolean(form.errors.title)}
                />
              </Field>
              <Field label="نام انگلیسی" error={form.errors.titleEn}>
                <Input
                  value={draft.titleEn}
                  onChange={(e) => update({ titleEn: e.target.value })}
                  invalid={Boolean(form.errors.titleEn)}
                  dir="ltr"
                />
              </Field>
              <Field label="اسلاگ (آدرس)" hint="در صورت خالی گذاشتن، به‌صورت خودکار ساخته می‌شود." error={form.errors.slug}>
                <Input
                  value={draft.slug}
                  onChange={(e) => update({ slug: e.target.value })}
                  invalid={Boolean(form.errors.slug)}
                  dir="ltr"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="دسته‌بندی" required error={form.errors.categorySlug}>
                  <Select
                    value={draft.categorySlug}
                    onChange={(e) => update({ categorySlug: e.target.value as Product['categorySlug'] })}
                    invalid={Boolean(form.errors.categorySlug)}
                  >
                    {!draft.categorySlug && <option value="">انتخاب کنید…</option>}
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="برند">
                  <Select value={draft.brandSlug} onChange={(e) => update({ brandSlug: e.target.value })}>
                    {brands.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.title}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <VariantsField
                variantLabel={draft.variantLabel}
                onVariantLabelChange={(variantLabel) => update({ variantLabel })}
                value={draft.variants}
                onChange={(variants) => update({ variants })}
                error={form.errors.variants}
              />

              <Field
                label="قیمت پیش از تخفیف"
                hint="اگر پر شود، روی کارت کالا خط‌خورده کنار قیمت می‌نشیند."
                error={form.errors.compareAtPrice}
              >
                <PriceInput
                  value={draft.compareAtPrice}
                  onChange={(compareAtPrice) => update({ compareAtPrice })}
                  invalid={Boolean(form.errors.compareAtPrice)}
                />
              </Field>

              <div className="space-y-2">
                <p className="text-[13px] font-medium">وضعیت کالا</p>
                <ChipPicker
                  label="نو، استوک یا کارکرده"
                  value={draft.condition}
                  options={CONDITION_OPTIONS.map(({ value, label }) => ({ value, label }))}
                  onChange={(condition: ProductCondition) => update({ condition })}
                />
                <p className="text-xs leading-6 text-muted">{CONDITION_HINT[draft.condition]}</p>
              </div>

              {/* Field اینجا به کار نمی‌آید: fieldset داخل label قرار نمی‌گیرد */}
              <div className="space-y-2">
                <p className="text-[13px] font-medium">وضعیت انتشار</p>
                <ChipPicker
                  label="وضعیت انتشار محصول"
                  value={draft.status}
                  options={PRODUCT_STATUS_OPTIONS}
                  onChange={(status: ProductStatus) => update({ status })}
                />
                <p className="text-xs leading-6 text-muted">
                  {draft.status === 'active'
                    ? 'در فروشگاه دیده می‌شود و قابل خرید است.'
                    : 'از فروشگاه برداشته می‌شود — نه در لیست، نه در جست‌وجو، نه با لینک مستقیم. سفارش‌های قبلی دست‌نخورده می‌مانند.'}
                </p>
              </div>

              <ImageField value={draft.images} onChange={(images) => update({ images })} />

              <SpecsField
                categorySlug={draft.categorySlug}
                value={draft.specs}
                onChange={(specs) => update({ specs })}
                error={form.errors.specs}
              />

              <Field label="توضیح کوتاه" hint="حداکثر ۲۰۰ حرف" error={form.errors.shortDescription}>
                <Textarea
                  value={draft.shortDescription}
                  onChange={(e) => update({ shortDescription: e.target.value })}
                  invalid={Boolean(form.errors.shortDescription)}
                  className="min-h-20"
                />
              </Field>

              <Field label="توضیح کامل" error={form.errors.description}>
                <Textarea
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  invalid={Boolean(form.errors.description)}
                />
              </Field>

              <Field label="برچسب‌ها" hint="برچسب‌ها را با ویرگول از هم جدا کنید.">
                <Input value={draft.tags} onChange={(e) => update({ tags: e.target.value })} />
              </Field>
            </div>
          )}
        </Drawer>
      </div>
    </PermissionGate>
  )
}
