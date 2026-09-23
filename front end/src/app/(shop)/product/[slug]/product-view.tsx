'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BadgeCheck,
  GitCompareArrows,
  Minus,
  PackageX,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Wrench,
} from 'lucide-react'
import { useProduct } from '@/lib/api/queries'
import { usePageTitle } from '@/lib/use-page-title'
import { Gallery } from '@/components/product/gallery'
import { ReviewsBlock } from '@/components/product/reviews-block'
import { ProductCard } from '@/components/product/product-card'
import { WishlistButton } from '@/components/product/wishlist-button'
import { StockAlertButton } from '@/components/product/stock-alert-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Rating } from '@/components/ui/rating'
import { Price } from '@/components/ui/price'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeading } from '@/components/ui/section-heading'
import { toast } from '@/components/ui/toast'
import { useCart } from '@/store/cart'
import { useCompareStore } from '@/store/compare'
import { useHydrated } from '@/lib/use-hydrated'
import { CONDITION_HINT, conditionBadge } from '@/lib/product-condition'
import { toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'specs', label: 'مشخصات فنی' },
  { id: 'description', label: 'توضیحات' },
  { id: 'reviews', label: 'نظرات کاربران' },
] as const

const guarantees = [
  { icon: ShieldCheck, text: 'ضمانت اصالت و سلامت کالا' },
  { icon: Truck, text: 'ارسال سریع؛ تهران زیر ۴ ساعت' },
  { icon: RotateCcw, text: '۷ روز مهلت تعویض' },
  { icon: Wrench, text: 'خدمات پس از فروش در تعمیرگاه خودمان' },
]

/** بخش تعاملی صفحه‌ی کالا؛ داده‌اش را صفحه‌ی سرور از پیش آورده است */
export function ProductView({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useProduct(slug)
  const [variantIndex, setVariantIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('specs')
  const add = useCart((s) => s.add)
  const compare = useCompareStore()
  // لیست مقایسه در مرورگر ذخیره است؛ روی سرور خالی است و پیش از hydrate نباید فرق کند
  const hydrated = useHydrated()

  usePageTitle(data?.product.title)

  if (isLoading) {
    return (
      <div className="container-page grid gap-8 py-8 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-card" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-12 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={PackageX}
          title="این کالا یافت نشد"
          description="ممکن است این کالا حذف شده باشد یا آدرس صفحه نادرست باشد."
          action={
            <Link href="/products">
              <Button variant="soft">بازگشت به فروشگاه</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const { product, related } = data
  const variant = product.variants[variantIndex]
  const inCompare = hydrated && compare.ids.includes(product.id)
  const outOfStock = variant.stock <= 0

  return (
    <div className="pb-10">
      <div className="container-page py-6">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-brand-600">خانه</Link>
          <span>/</span>
          <Link href={`/products?category=${product.categorySlug}`} className="hover:text-brand-600">
            {product.categorySlug === 'mobile' ? 'گوشی موبایل' : product.categorySlug === 'laptop' ? 'لپ‌تاپ' : product.categorySlug === 'console' ? 'کنسول' : product.categorySlug === 'game' ? 'بازی' : 'لوازم جانبی'}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.1fr_1fr]">
          <Gallery images={product.images} alt={product.title} />

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {product.isNew && <Badge tone="brand" className="glow-brand">جدید</Badge>}
                {conditionBadge(product.condition) && (
                  <Badge tone="ember" title={CONDITION_HINT[product.condition ?? 'new']}>
                    {conditionBadge(product.condition)}
                  </Badge>
                )}
                {product.tags.map((t) => (
                  <Badge key={t} tone="neutral">{t}</Badge>
                ))}
              </div>
              <h1 className="text-xl font-bold leading-9 sm:text-2xl">{product.title}</h1>
              <p className="num text-xs text-muted" dir="ltr">{product.titleEn}</p>
              <Rating value={product.rating} count={product.reviewCount} />
              <p className="text-[13px] leading-8 text-muted">{product.shortDescription}</p>
            </div>

            {product.variants.length > 1 && (
              <div className="space-y-2.5">
                {/* عنوان بخش، نام ویژگی‌ای که کالا با آن مدل‌بندی شده — مثلاً «حافظه» */}
                <span className="text-[13px] font-bold">
                  {product.variantLabel?.trim() ? `انتخاب ${product.variantLabel.trim()}` : 'انتخاب مدل'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVariantIndex(i)
                        setQuantity(1)
                      }}
                      disabled={v.stock <= 0}
                      className={cn(
                        'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-[12.5px] transition-all duration-200 disabled:opacity-40',
                        variantIndex === i
                          ? 'border-brand-500 bg-brand-500/8 text-brand-700 dark:text-brand-300'
                          : 'border-border text-muted hover:border-brand-400',
                      )}
                    >
                      {v.color && (
                        <span
                          className="size-4 rounded-full ring-1 ring-border"
                          style={{ backgroundColor: v.color.hex }}
                        />
                      )}
                      {v.title}
                      {/* مقدار ویژگی فقط وقتی جدا نوشته می‌شود که در عنوان مدل نیامده باشد */}
                      {v.option && !v.title.includes(v.option) && (
                        <span className="text-[11px] text-muted">{v.option}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-card border border-border bg-surface p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <Price value={variant.price} compareAt={product.compareAtPrice} size="lg" />
                {outOfStock ? (
                  <Badge tone="danger">ناموجود</Badge>
                ) : variant.stock <= 3 ? (
                  <Badge tone="warning">تنها {toFaDigits(variant.stock)} عدد باقی مانده</Badge>
                ) : (
                  <Badge tone="success">
                    <BadgeCheck className="size-3" /> موجود در انبار
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <div className="flex items-center gap-1 rounded-2xl border border-border p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.min(q + 1, variant.stock))}
                    disabled={outOfStock || quantity >= variant.stock}
                    aria-label="افزایش"
                    className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-brand-600 disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                  <span className="num w-8 text-center text-sm font-bold">{toFaDigits(quantity)}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="کاهش"
                    className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                </div>

                {outOfStock ? (
                  // مدل ناموجود به‌جای دکمه‌ی خرید غیرفعال، «خبرم کن» دارد
                  <StockAlertButton productId={product.id} variantTitle={variant.title} />
                ) : (
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      add(
                        {
                          productId: product.id,
                          variantId: variant.id,
                          title: product.title,
                          variantTitle: variant.title === 'استاندارد' ? '' : variant.title,
                          image: product.images[0],
                          slug: product.slug,
                          unitPrice: variant.price,
                          maxStock: variant.stock,
                        },
                        quantity,
                      )
                      toast.success('به سبد خرید اضافه شد')
                    }}
                  >
                    <ShoppingBag className="size-4.5" />
                    افزودن به سبد خرید
                  </Button>
                )}

                <Button
                  variant={inCompare ? 'primary' : 'outline'}
                  size="icon"
                  className="size-13 rounded-2xl"
                  aria-label="مقایسه"
                  onClick={() => {
                    if (compare.isFull() && !inCompare) return toast.error('حداکثر ۴ محصول')
                    compare.toggle(product.id)
                    toast.info(inCompare ? 'از مقایسه حذف شد' : 'به مقایسه اضافه شد')
                  }}
                >
                  <GitCompareArrows className="size-5" />
                </Button>

                <WishlistButton product={product} variant="page" />
              </div>
            </div>

            <ul className="grid gap-2.5 sm:grid-cols-2">
              {guarantees.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[12.5px] text-muted">
                  <Icon className="size-4 shrink-0 text-brand-500" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="container-page mt-10">
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative shrink-0 px-5 py-3.5 text-[13.5px] font-medium transition-colors',
                tab === t.id ? 'text-brand-600 dark:text-brand-400' : 'text-muted hover:text-foreground',
              )}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>

        {tab === 'specs' && (
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <table className="w-full text-[13px]">
              <tbody>
                {product.specs.map((spec, i) => (
                  <tr key={spec.key} className={cn(i % 2 === 1 && 'bg-surface-2/50')}>
                    <th className="w-44 border-b border-border p-4 text-start font-medium text-muted">{spec.label}</th>
                    <td className="border-b border-border p-4 leading-7">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'description' && (
          <div className="rounded-card border border-border bg-surface p-6">
            <p className="max-w-3xl text-[13.5px] leading-9 text-muted">{product.description}</p>
          </div>
        )}

        {tab === 'reviews' && <ReviewsBlock slug={product.slug} />}
      </div>

      {related.length > 0 && (
        <div className="container-page mt-14">
          <SectionHeading title="محصولات مشابه" href={`/products?category=${product.categorySlug}`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
