'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Pencil, Plus, Tag, Trash2, Layers } from 'lucide-react'
import type { Brand, Category } from '@/types/catalog'
import type { CategoryDeleteMode, CategoryWithCount } from '@/lib/api/endpoints'
import {
  useAdminBrands,
  useAdminCategories,
  useCreateBrand,
  useCreateCategory,
  useDeleteBrand,
  useDeleteCategory,
  useUpdateBrand,
  useUpdateCategory,
} from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { BulkBar, SelectCell, runBulk, useSelection } from '@/components/admin/selection'
import { BrandDrawer, CategoryDrawer } from '@/components/admin/taxonomy-forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { getIcon } from '@/lib/icons'
import { toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function AdminTaxonomyPage() {
  const categories = useAdminCategories()
  const brands = useAdminBrands()

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const createBrand = useCreateBrand()
  const updateBrand = useUpdateBrand()
  const deleteBrand = useDeleteBrand()

  // null یعنی «ساخت جدید»؛ undefined یعنی کشو بسته است
  const [categoryEdit, setCategoryEdit] = useState<Category | null | undefined>(undefined)
  const [brandEdit, setBrandEdit] = useState<Brand | null | undefined>(undefined)
  const [removing, setRemoving] = useState<CategoryWithCount | null>(null)
  const [bulkCategories, setBulkCategories] = useState<CategoryWithCount[] | null>(null)
  const [brandBulkBusy, setBrandBulkBusy] = useState(false)

  // مادرها به ترتیب، و هر زیرمجموعه بلافاصله زیر مادر خودش
  const categoryRows = orderByTree(categories.data ?? [])
  const categoryIds = categoryRows.map((category) => category.id)
  const categorySelection = useSelection(categoryIds, categoryIds)

  // برندِ دارای کالا اصلاً حذف نمی‌شود؛ پس نه تکش انتخاب می‌شود نه در «انتخاب همه» می‌آید
  const brandRows = brands.data ?? []
  const deletableBrandIds = brandRows.filter((brand) => brand.productCount === 0).map((brand) => brand.id)
  const brandSelection = useSelection(deletableBrandIds, deletableBrandIds)

  const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : 'عملیات ناموفق بود')

  const removeSelectedBrands = async () => {
    const ids = brandSelection.selected
    if (!ids.length) return
    if (!confirm(`آیا ${toFaDigits(ids.length)} برند حذف شوند؟ این کار برگشت‌پذیر نیست.`)) return

    setBrandBulkBusy(true)
    const { done, failed, firstError } = await runBulk(ids, (id) => deleteBrand.mutateAsync(id))
    setBrandBulkBusy(false)
    brandSelection.clear()
    if (done) toast.success(`${toFaDigits(done)} برند حذف شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} برند حذف نشد`)
  }

  return (
    <PermissionGate permission="category.manage">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">دسته‌بندی و برند</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            ساختار کاتالوگ. تغییر اسلاگ به‌صورت خودکار در کالاها و سکشن‌های صفحه‌ی اصلی اعمال می‌شود.
          </p>
        </div>

        <AdminCard
          title="دسته‌بندی‌ها"
          action={
            <Button size="sm" variant="soft" onClick={() => setCategoryEdit(null)}>
              <Plus className="size-4" />
              دسته‌بندی جدید
            </Button>
          }
        >
          {categories.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !categories.data?.length ? (
            <EmptyState icon={Layers} title="دسته‌بندی‌ای ثبت نشده" description="اولین دسته را بسازید تا کالاها جایی برای نشستن داشته باشند." />
          ) : (
            <>
            <BulkBar selection={categorySelection} unit="دسته‌بندی">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setBulkCategories(categoryRows.filter((category) => categorySelection.has(category.id)))}
              >
                <Trash2 className="size-3.5" />
                حذف انتخاب‌شده‌ها
              </Button>
            </BulkBar>
            <Table selection={categorySelection} head={['دسته', 'مادر', 'اسلاگ', 'کلیدهای مشخصات', 'تعداد کالا', '']}>
              {categoryRows.map((category) => {
                const Icon = getIcon(category.icon)
                return (
                  <tr key={category.id} className="transition-colors hover:bg-surface-2/40">
                    <SelectCell selection={categorySelection} id={category.id} label={category.title} />
                    <td className="p-3.5">
                      <div className={cn('flex items-center gap-3', category.parentId && 'ps-6')}>
                        {/* خط کوچک، زیرمجموعه بودن را بدون خواندن ستون مادر نشان می‌دهد */}
                        {category.parentId && <span className="-ms-4 h-px w-3 shrink-0 bg-border" />}
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold">{category.title}</p>
                          <p className="truncate text-[11px] text-muted">{category.description || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-muted">
                      {categoryRows.find((c) => c.id === category.parentId)?.title ?? '—'}
                    </td>
                    <td className="num p-3.5 text-muted" dir="ltr">
                      {category.slug}
                    </td>
                    {/* سلول RTL می‌ماند تا بج‌ها از سمت راست و زیر سرستون شروع شوند */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {category.specKeys.length ? (
                          category.specKeys.map((key) => (
                            <Badge key={key} tone="neutral">
                              {key}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="num p-3.5 font-medium">{toFaDigits(category.productCount)}</td>
                    <td className="p-3.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="ویرایش" onClick={() => setCategoryEdit(category)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="حذف"
                          className="text-muted hover:text-red-500"
                          onClick={() => setRemoving(category)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Table>
            </>
          )}
        </AdminCard>

        <AdminCard
          title="برندها"
          action={
            <Button size="sm" variant="soft" onClick={() => setBrandEdit(null)}>
              <Plus className="size-4" />
              برند جدید
            </Button>
          }
        >
          {brands.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !brands.data?.length ? (
            <EmptyState icon={Tag} title="برندی ثبت نشده" description="برندها در فیلتر محصولات و نوار برندهای صفحه‌ی اصلی استفاده می‌شوند." />
          ) : (
            <>
            <BulkBar selection={brandSelection} unit="برند">
              <Button
                variant="ghost"
                size="sm"
                loading={brandBulkBusy}
                className="text-red-600 hover:text-red-700"
                onClick={() => void removeSelectedBrands()}
              >
                <Trash2 className="size-3.5" />
                حذف انتخاب‌شده‌ها
              </Button>
            </BulkBar>
            <Table selection={brandSelection} head={['برند', 'اسلاگ', 'تعداد کالا', '']}>
              {brands.data.map((brand) => (
                <tr key={brand.id} className="transition-colors hover:bg-surface-2/40">
                  <SelectCell
                    selection={brandSelection}
                    id={brand.id}
                    label={brand.title}
                    disabled={brand.productCount > 0}
                    reason="ابتدا برند کالاهای این برند را عوض کنید"
                  />
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-16 shrink-0 place-items-center rounded-xl bg-surface-2 text-foreground">
                        {brand.logo ? (
                          <Image src={brand.logo} alt="" width={64} height={20} className="h-5 w-auto object-contain" unoptimized />
                        ) : (
                          <Tag className="size-4 text-muted" />
                        )}
                      </span>
                      <p className="font-bold">{brand.title}</p>
                    </div>
                  </td>
                  <td className="num p-3.5 text-muted" dir="ltr">
                    {brand.slug}
                  </td>
                  <td className="num p-3.5 font-medium">{toFaDigits(brand.productCount)}</td>
                  <td className="p-3.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="ویرایش" onClick={() => setBrandEdit(brand)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف"
                        className="text-muted hover:text-red-500"
                        disabled={brand.productCount > 0}
                        title={brand.productCount > 0 ? 'ابتدا برند کالاهای این برند را عوض کنید' : undefined}
                        onClick={() =>
                          deleteBrand.mutate(brand.id, {
                            onSuccess: () => toast.success('برند حذف شد'),
                            onError: fail,
                          })
                        }
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
        </AdminCard>

        <CategoryDrawer
          open={categoryEdit !== undefined}
          editing={categoryEdit ?? null}
          categories={categoryRows}
          saving={createCategory.isPending || updateCategory.isPending}
          onClose={() => setCategoryEdit(undefined)}
          onSubmit={(body, onFieldError) => {
            const done = {
              onSuccess: () => {
                toast.success(categoryEdit ? 'دسته‌بندی به‌روز شد' : 'دسته‌بندی افزوده شد')
                setCategoryEdit(undefined)
              },
              onError: (error: unknown) => {
                onFieldError(error)
                fail(error)
              },
            }
            if (categoryEdit) updateCategory.mutate({ id: categoryEdit.id, body }, done)
            else createCategory.mutate(body, done)
          }}
        />

        {/* کلید تازه یعنی هر بار با گزینه‌ی امن‌تر («بی‌دسته بمانند») باز شود */}
        <DeleteCategoryDrawer key={removing?.id ?? 'closed'} category={removing} onClose={() => setRemoving(null)} />

        <BulkDeleteCategoriesDrawer
          key={bulkCategories?.map((category) => category.id).join(',') ?? 'bulk-closed'}
          categories={bulkCategories}
          onClose={() => setBulkCategories(null)}
          onDone={() => {
            categorySelection.clear()
            setBulkCategories(null)
          }}
        />

        <BrandDrawer
          open={brandEdit !== undefined}
          editing={brandEdit ?? null}
          saving={createBrand.isPending || updateBrand.isPending}
          onClose={() => setBrandEdit(undefined)}
          onSubmit={(body, onFieldError) => {
            const done = {
              onSuccess: () => {
                toast.success(brandEdit ? 'برند به‌روز شد' : 'برند افزوده شد')
                setBrandEdit(undefined)
              },
              onError: (error: unknown) => {
                onFieldError(error)
                fail(error)
              },
            }
            if (brandEdit) updateBrand.mutate({ id: brandEdit.id, body }, done)
            else createBrand.mutate(body, done)
          }}
        />
      </div>
    </PermissionGate>
  )
}

const DELETE_OPTIONS: { mode: CategoryDeleteMode; title: string; text: (count: string) => string; danger?: boolean }[] = [
  {
    mode: 'detach_products',
    title: 'کالاها بدون دسته‌بندی بمانند',
    text: (count) =>
      `${count} کالا در پنل می‌مانند ولی غیرفعال می‌شوند و در فروشگاه نمایش داده نمی‌شوند. هر وقت دسته‌ی تازه گرفتند، می‌توانید دوباره فعالشان کنید.`,
  },
  {
    mode: 'delete_products',
    title: 'کالاها هم حذف شوند',
    text: (count) =>
      `${count} کالا همراه مدل‌ها، نظرها و علاقه‌مندی‌هایشان برای همیشه پاک می‌شوند. سفارش‌های قبلی دست نمی‌خورند.`,
    danger: true,
  },
]

/**
 * تأیید حذف دسته. دسته‌ی بی‌کالا مستقیم حذف می‌شود؛ برای دسته‌ی دارای کالا ادمین
 * باید صریحاً بگوید کالاها چه شوند.
 */
function DeleteCategoryDrawer({ category, onClose }: { category: CategoryWithCount | null; onClose: () => void }) {
  const deleteCategory = useDeleteCategory()
  const [mode, setMode] = useState<CategoryDeleteMode>('detach_products')
  const count = category?.productCount ?? 0
  const countLabel = toFaDigits(count)

  const submit = () => {
    if (!category) return
    deleteCategory.mutate(
      { id: category.id, mode: count ? mode : undefined },
      {
        onSuccess: () => {
          toast.success(
            !count
              ? 'دسته‌بندی حذف شد'
              : mode === 'delete_products'
                ? `دسته‌بندی و ${countLabel} کالای آن حذف شدند`
                : `دسته‌بندی حذف شد؛ ${countLabel} کالا بدون دسته و غیرفعال شدند`,
          )
          onClose()
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : 'حذف ناموفق بود'),
      },
    )
  }

  return (
    <Drawer
      open={Boolean(category)}
      onClose={onClose}
      title={`حذف دسته‌بندی «${category?.title ?? ''}»`}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" block onClick={onClose}>
            انصراف
          </Button>
          <Button variant="danger" block loading={deleteCategory.isPending} onClick={submit}>
            <Trash2 className="size-4" />
            {count && mode === 'delete_products' ? `حذف دسته و ${countLabel} کالا` : 'حذف دسته‌بندی'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-[13px] leading-7">
        {count ? (
          <>
            <p>
              این دسته <span className="num font-bold">{countLabel}</span> کالا دارد. با کالاهایش چه کنیم؟
            </p>
            <div role="radiogroup" aria-label="سرنوشت کالاها" className="space-y-2.5">
              {DELETE_OPTIONS.map((option) => {
                const active = mode === option.mode
                return (
                  <label
                    key={option.mode}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                      active
                        ? option.danger
                          ? 'border-red-500/60 bg-red-500/6'
                          : 'border-brand-500 bg-brand-500/6'
                        : 'border-border hover:border-brand-400',
                    )}
                  >
                    <input
                      type="radio"
                      name="category-delete-mode"
                      checked={active}
                      onChange={() => setMode(option.mode)}
                      className={cn('mt-1.5 size-4', option.danger ? 'accent-red-500' : 'accent-brand-500')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-bold', option.danger && active && 'text-red-600 dark:text-red-400')}>
                        {option.title}
                      </span>
                      <span className="block pt-1 text-xs leading-6 text-muted">{option.text(countLabel)}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        ) : (
          <p>این دسته کالایی ندارد و حذفش روی هیچ کالایی اثر نمی‌گذارد.</p>
        )}
        <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-xs text-muted">
          لینک این دسته از بخش دسته‌بندی‌های صفحه‌ی اصلی و ستون دسته‌بندی‌های فوتر هم خودکار برداشته می‌شود.
        </p>
      </div>
    </Drawer>
  )
}

/**
 * حذف گروهی دسته‌ها.
 *
 * تصمیم درباره‌ی کالاها یک بار برای همه گرفته می‌شود، نه دسته‌به‌دسته: ادمینی که
 * ده دسته را انتخاب کرده، ده بار همین سؤال را نمی‌خواهد. اگر هیچ‌کدام کالا
 * نداشته باشند، سؤال اصلاً نمایش داده نمی‌شود.
 */
function BulkDeleteCategoriesDrawer({
  categories,
  onClose,
  onDone,
}: {
  categories: CategoryWithCount[] | null
  onClose: () => void
  onDone: () => void
}) {
  const deleteCategory = useDeleteCategory()
  const [mode, setMode] = useState<CategoryDeleteMode>('detach_products')
  const [busy, setBusy] = useState(false)

  const rows = categories ?? []
  const products = rows.reduce((sum, category) => sum + category.productCount, 0)
  const countLabel = toFaDigits(rows.length)
  const productLabel = toFaDigits(products)

  const submit = async () => {
    if (!rows.length) return
    setBusy(true)
    const { done, failed, firstError } = await runBulk(
      rows.map((category) => category.id),
      (id) => {
        const row = rows.find((category) => category.id === id)
        return deleteCategory.mutateAsync({ id, mode: row?.productCount ? mode : undefined })
      },
    )
    setBusy(false)
    if (done) toast.success(`${toFaDigits(done)} دسته‌بندی حذف شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} دسته‌بندی حذف نشد`)
    onDone()
  }

  return (
    <Drawer
      open={rows.length > 0}
      onClose={onClose}
      title={`حذف ${countLabel} دسته‌بندی`}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" block onClick={onClose}>
            انصراف
          </Button>
          <Button variant="danger" block loading={busy} onClick={() => void submit()}>
            <Trash2 className="size-4" />
            {products && mode === 'delete_products' ? `حذف ${countLabel} دسته و ${productLabel} کالا` : `حذف ${countLabel} دسته‌بندی`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-[13px] leading-7">
        <ul className="space-y-1.5 rounded-xl bg-surface-2 px-3.5 py-3">
          {rows.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3">
              <span className="truncate font-medium">{category.title}</span>
              <span className="num shrink-0 text-xs text-muted">{toFaDigits(category.productCount)} کالا</span>
            </li>
          ))}
        </ul>

        {products ? (
          <>
            <p>
              روی‌هم <span className="num font-bold">{productLabel}</span> کالا در این دسته‌ها هست. با آن‌ها چه کنیم؟
            </p>
            <div role="radiogroup" aria-label="سرنوشت کالاها" className="space-y-2.5">
              {DELETE_OPTIONS.map((option) => {
                const active = mode === option.mode
                return (
                  <label
                    key={option.mode}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                      active
                        ? option.danger
                          ? 'border-red-500/60 bg-red-500/6'
                          : 'border-brand-500 bg-brand-500/6'
                        : 'border-border hover:border-brand-400',
                    )}
                  >
                    <input
                      type="radio"
                      name="bulk-category-delete-mode"
                      checked={active}
                      onChange={() => setMode(option.mode)}
                      className={cn('mt-1.5 size-4', option.danger ? 'accent-red-500' : 'accent-brand-500')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-bold', option.danger && active && 'text-red-600 dark:text-red-400')}>
                        {option.title}
                      </span>
                      <span className="block pt-1 text-xs leading-6 text-muted">{option.text(productLabel)}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        ) : (
          <p>هیچ‌کدام از این دسته‌ها کالایی ندارند و حذفشان روی کالاها اثری نمی‌گذارد.</p>
        )}
      </div>
    </Drawer>
  )
}

/**
 * مرتب‌سازی درختی: هر مادر، و بلافاصله زیرش بچه‌هایش.
 * دسته‌ای که مادرش در فهرست نیست، خودش در سطح اول می‌آید تا گم نشود.
 */
function orderByTree(categories: CategoryWithCount[]): CategoryWithCount[] {
  const ids = new Set(categories.map((c) => c.id))
  const roots = categories.filter((c) => !c.parentId || !ids.has(c.parentId))

  return roots.flatMap((root) => [root, ...categories.filter((c) => c.parentId === root.id)])
}
