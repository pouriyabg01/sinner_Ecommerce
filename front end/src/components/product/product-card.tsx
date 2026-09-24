'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'motion/react'
import { GitCompareArrows, ShoppingBag, Sparkles } from 'lucide-react'
import type { Product } from '@/types/catalog'
import { Badge } from '@/components/ui/badge'
import { Rating } from '@/components/ui/rating'
import { Price } from '@/components/ui/price'
import { useCart } from '@/store/cart'
import { useCompareStore } from '@/store/compare'
import { useHydrated } from '@/lib/use-hydrated'
import { toast } from '@/components/ui/toast'
import { WishlistButton } from './wishlist-button'
import { conditionBadge } from '@/lib/product-condition'
import { cn } from '@/lib/utils'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [hovered, setHovered] = useState(false)
  const add = useCart((s) => s.add)
  const compare = useCompareStore()
  // لیست مقایسه در مرورگر ذخیره است؛ پیش از hydrate باید با HTML سرور یکی باشد
  const hydrated = useHydrated()
  const inCompare = hydrated && compare.ids.includes(product.id)
  const outOfStock = product.stock <= 0

  const defaultVariant = product.variants[0]

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index, 7) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift dark:hover:border-brand-700"
    >
      <div className="relative aspect-square overflow-hidden bg-ink-950">
        {/* تصاویر مستقیماً فرزند این کانتینر relative هستند؛ لینک روی آن‌ها overlay می‌شود
            چون <Image fill> والد position:static را نمی‌پذیرد. */}
        <Image
          src={product.images[0]}
          alt={product.title}
          fill
          // چند کارت اول معمولاً LCP صفحه هستند و نباید lazy شوند
          priority={index < 3}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            'object-cover transition-all duration-700 ease-[var(--ease-out-soft)]',
            hovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <Image
          src={product.images[1] ?? product.images[0]}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            'object-cover transition-all duration-700 ease-[var(--ease-out-soft)]',
            hovered ? 'scale-100 opacity-100' : 'scale-110 opacity-0',
          )}
        />
        <Link href={`/product/${product.slug}`} aria-label={product.title} className="absolute inset-0 z-10" />

        <div className="pointer-events-none absolute start-3 top-3 z-20 flex flex-col items-start gap-1.5">
          {product.isNew && (
            <Badge tone="brand" className="glow-brand backdrop-blur-sm">
              <Sparkles className="size-3" /> جدید
            </Badge>
          )}
          {conditionBadge(product.condition) && (
            <Badge tone="ember">{conditionBadge(product.condition)}</Badge>
          )}
          {/* شمار دقیق موجودی نشان داده نمی‌شود؛ فقط بود و نبودش */}
          {outOfStock && <Badge tone="neutral">ناموجود</Badge>}
        </div>

        <button
          onClick={() => {
            if (compare.isFull() && !inCompare) {
              toast.error('حداکثر ۴ محصول را می‌توان مقایسه کرد')
              return
            }
            compare.toggle(product.id)
            toast.info(inCompare ? 'از لیست مقایسه حذف شد' : 'به لیست مقایسه اضافه شد')
          }}
          aria-label="افزودن به مقایسه"
          title="مقایسه"
          className={cn(
            'absolute end-3 top-3 z-20 grid size-9 place-items-center rounded-xl backdrop-blur transition-all duration-300',
            inCompare
              ? 'bg-brand-500 text-white'
              : 'bg-surface/85 text-muted hover:text-brand-600 can-hover:-translate-y-1.5 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100',
          )}
        >
          <GitCompareArrows className="size-4" />
        </button>

        <WishlistButton product={product} />

        {!outOfStock && (
          <button
            onClick={() => {
              add({
                productId: product.id,
                variantId: defaultVariant.id,
                title: product.title,
                variantTitle: defaultVariant.title === 'استاندارد' ? '' : defaultVariant.title,
                image: product.images[0],
                slug: product.slug,
                unitPrice: defaultVariant.price,
                maxStock: defaultVariant.stock,
              })
              toast.success('به سبد خرید اضافه شد')
            }}
            className="absolute inset-x-3 bottom-3 z-20 flex h-10 items-center justify-center gap-2 rounded-xl bg-ink-900/90 text-[13px] font-medium text-white backdrop-blur transition-all duration-300 hover:bg-brand-500 can-hover:translate-y-3 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100"
          >
            <ShoppingBag className="size-4" />
            افزودن به سبد
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 text-sm font-bold leading-7 hover:text-brand-600 dark:hover:text-brand-400">
          {product.title}
        </Link>
        {/*
          توضیح کوتاه فقط در صفحه‌ی خود کالا می‌آید. در کارت، دو خط متن ریز
          بین نام و قیمت می‌نشست و چشم را از آن دو دور می‌کرد.
        */}
        <Rating value={product.rating} count={product.reviewCount} className="mt-auto" />
        <Price value={product.price} compareAt={product.compareAtPrice} />
      </div>
    </motion.article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="skeleton aspect-square" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-4/5 rounded-lg" />
        <div className="skeleton h-3 w-full rounded-lg" />
        <div className="skeleton h-3 w-2/3 rounded-lg" />
        <div className="skeleton h-5 w-1/2 rounded-lg" />
      </div>
    </div>
  )
}
