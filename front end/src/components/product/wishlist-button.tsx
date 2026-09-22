'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import type { Product } from '@/types/catalog'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useToggleWishlist, useWishlist } from '@/lib/api/queries'
import { useHydrated } from '@/lib/use-hydrated'
import { useSession } from '@/store/session'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const styles = {
  /** گوشه‌ی تصویر کارت، زیر دکمه‌ی مقایسه */
  card: {
    base: 'absolute end-3 top-14 z-20 grid size-9 place-items-center rounded-xl backdrop-blur transition-all duration-300',
    on: 'bg-red-500 text-white',
    // کالای ذخیره‌نشده مثل دکمه‌ی مقایسه فقط با هاور دیده می‌شود؛ ذخیره‌شده همیشه
    off: 'bg-surface/85 text-muted hover:text-red-500 can-hover:-translate-y-1.5 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100',
    icon: 'size-4',
  },
  /** کنار دکمه‌ی افزودن به سبد در صفحه‌ی محصول */
  page: {
    base: 'grid size-13 shrink-0 place-items-center rounded-2xl border transition-colors',
    on: 'border-red-500 bg-red-500/10 text-red-500',
    off: 'border-border text-muted hover:border-red-400 hover:text-red-500',
    icon: 'size-5',
  },
}

/**
 * دکمه‌ی قلب علاقه‌مندی.
 *
 * مهمان فهرستی روی سرور ندارد؛ با زدن قلب به صفحه‌ی ورود می‌رود و بعد از ورود
 * به همین صفحه برمی‌گردد — همان رفتار تکمیل سفارش.
 */
export function WishlistButton({ product, variant = 'card' }: { product: Product; variant?: keyof typeof styles }) {
  const router = useRouter()
  const pathname = usePathname()
  const hydrated = useHydrated()
  const hasToken = useSession((s) => Boolean(s.token))
  const signedIn = MOCKING_ENABLED || (hydrated && hasToken)
  const { data } = useWishlist()
  const toggle = useToggleWishlist()
  const wished = Boolean(data?.some((p) => p.id === product.id))
  const style = styles[variant]

  const onClick = () => {
    if (!signedIn) {
      toast.info('برای ذخیره در علاقه‌مندی‌ها وارد حساب شوید')
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    toggle.mutate(
      { product, wished },
      {
        onSuccess: () => toast.success(wished ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد'),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={wished}
      aria-label={wished ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      title="علاقه‌مندی"
      className={cn(style.base, wished ? style.on : style.off)}
    >
      <Heart className={cn(style.icon, wished && 'fill-current')} />
    </button>
  )
}
