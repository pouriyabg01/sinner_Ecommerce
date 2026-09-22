'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  GitCompareArrows,
  Heart,
  LogIn,
  Menu,
  ShoppingBag,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { Logo } from './logo'
import { SearchBox } from './search-box'
import { ThemeToggle } from './theme-toggle'
import { useCart, cartCount } from '@/store/cart'
import { cartButtonRef } from '@/components/cart/cart-anchor'
import { useCompareStore } from '@/store/compare'
import { useSession } from '@/store/session'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useHydrated } from '@/lib/use-hydrated'
import { useCategories, useSiteSettings, useWishlist } from '@/lib/api/queries'
import { toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/** لینک‌های ثابت انتهای منو؛ لینک دسته‌ها از خود دسته‌بندی‌ها ساخته می‌شود */
const staticNav = [
  { href: '/repair', label: 'تعمیرات', highlight: true },
  { href: '/about', label: 'درباره ما', highlight: false },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const lines = useCart((s) => s.lines)
  const { data: categories } = useCategories()
  /*
   * منوی دسته‌ها با ساختن، حذف یا تغییر نام دسته خودش به‌روز می‌شود — مثل ستون فوتر.
   * فقط دسته‌ای می‌آید که کالای قابل نمایش دارد؛ دسته‌ی حذف‌شده یا خالی لینک مرده می‌شد.
   */
  const nav = [
    ...(categories ?? [])
      .filter((c) => c.productCount > 0)
      .map((c) => ({ href: `/products?category=${c.slug}`, label: c.title, highlight: false })),
    ...staticNav,
  ]
  const openCart = useCart((s) => s.open)
  const compareIds = useCompareStore((s) => s.ids)
  // در حالت mock ورودی وجود ندارد، پس همیشه «واردشده» فرض می‌شود. توکن فقط
  // بعد از hydrate خوانده می‌شود تا HTML سرور با اولین رندر مرورگر یکی بماند.
  const hydrated = useHydrated()
  const hasToken = useSession((state) => Boolean(state.token))
  const signedIn = MOCKING_ENABLED || (hydrated && hasToken)
  const { data: wishlist } = useWishlist()
  const wishCount = wishlist?.length ?? 0
  const { data: settings } = useSiteSettings()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMobileOpen(false), [pathname])

  const count = cartCount(lines)

  return (
    <>
      {settings?.announcement?.enabled && (
        <Link
          href={settings.announcement.href}
          className="group block bg-gradient-to-l from-brand-600 via-brand-500 to-brand-600 py-2.5 text-center text-[12.5px] font-medium text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-3.5" />
            {settings.announcement.text}
            <span className="opacity-0 transition-opacity group-hover:opacity-100">←</span>
          </span>
        </Link>
      )}

      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled ? 'glass border-b border-border shadow-soft' : 'bg-background',
        )}
      >
        <div className="container-page">
          <div className="flex h-17 items-center gap-3 py-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="منو"
              className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            {/* زیر ۳۶۰ پیکسل فقط نشان می‌ماند؛ نام کنارش با آیکون‌ها جا نمی‌شد */}
            <Logo textClassName="max-[359px]:hidden" />

            <SearchBox className="mx-2 hidden max-w-xl flex-1 md:block" />

            <div className="ms-auto flex items-center gap-1.5">
              <ThemeToggle className="hidden sm:flex" />

              {/* مهمان فهرستی ندارد؛ آیکون فقط بعد از ورود معنا دارد */}
              {signedIn && (
                <Link
                  href="/profile/wishlist"
                  aria-label="علاقه‌مندی‌ها"
                  className="relative grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <Heart className="size-5" />
                  {wishCount > 0 && (
                    <span className="num absolute -end-0.5 -top-0.5 grid size-4.5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {toFaDigits(wishCount)}
                    </span>
                  )}
                </Link>
              )}

              {/*
               * روی گوشی جا برای همه‌ی آیکون‌ها نیست و ردیف هدر صفحه را اسکرول افقی
               * می‌کرد. مقایسه کم‌کاربردترین است و آنجا از نوار پایین (CompareBar) و
               * لینک فوتر در دسترس است.
               */}
              <Link
                href="/compare"
                aria-label="مقایسه"
                className="relative hidden size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:grid"
              >
                <GitCompareArrows className="size-5" />
                {compareIds.length > 0 && (
                  <span className="num absolute -end-0.5 -top-0.5 grid size-4.5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                    {toFaDigits(compareIds.length)}
                  </span>
                )}
              </Link>

              {signedIn ? (
                <Link
                  href="/profile"
                  aria-label="حساب کاربری"
                  className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <User className="size-5" />
                </Link>
              ) : (
                // بعد از ورود به همین صفحه برمی‌گردد، نه به پروفایل
                <Link
                  href={`/login?next=${encodeURIComponent(pathname)}`}
                  aria-label="ورود یا ثبت‌نام"
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300"
                >
                  <LogIn className="size-4" />
                  <span className="hidden sm:inline">ورود / ثبت‌نام</span>
                </Link>
              )}

              <button
                ref={cartButtonRef}
                onClick={openCart}
                aria-label="سبد خرید"
                className="relative grid size-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 transition-all hover:bg-brand-500/20 dark:text-brand-400"
              >
                <ShoppingBag className="size-5" />
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="num absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-ember-500 text-[10px] font-bold text-white"
                    >
                      {toFaDigits(count)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          <SearchBox className="pb-3 md:hidden" />

          <nav className="hidden items-center gap-1 border-t border-border py-1.5 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                  item.highlight
                    ? 'text-ember-600 hover:bg-ember-500/10 dark:text-ember-400'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {item.highlight && <Wrench className="size-3.5" />}
                  {item.label}
                </span>
                <span className="absolute inset-x-3 -bottom-1.5 h-0.5 scale-x-0 rounded-full bg-brand-500 transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* منوی موبایل */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-100 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-ink-950/55 backdrop-blur-[3px]"
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col bg-surface"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="بستن"
                  className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2"
                >
                  <X className="size-5" />
                </button>
              </div>
              <ul className="flex-1 space-y-1 overflow-y-auto p-3">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                        item.highlight ? 'bg-ember-500/10 text-ember-600 dark:text-ember-400' : 'hover:bg-surface-2',
                      )}
                    >
                      {item.highlight && <Wrench className="size-4" />}
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border p-4">
                <ThemeToggle className="w-fit" />
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
