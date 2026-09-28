'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronDown,
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
import type { CategoryWithCount } from '@/lib/api/endpoints'
import { buildCategoryTree, packColumns, type CategoryNode, type MenuGroup } from '@/lib/category-tree'
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
  const nav = buildNav(categories)
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
                  className="group relative grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <Heart className="size-5" />
                  {wishCount > 0 && (
                    <span className="num absolute -end-0.5 -top-0.5 grid size-4.5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {toFaDigits(wishCount)}
                    </span>
                  )}
                  <IconHint>علاقه‌مندی‌ها</IconHint>
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
                className="group relative hidden size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:grid"
              >
                <GitCompareArrows className="size-5" />
                {compareIds.length > 0 && (
                  <span className="num absolute -end-0.5 -top-0.5 grid size-4.5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                    {toFaDigits(compareIds.length)}
                  </span>
                )}
                <IconHint>مقایسه</IconHint>
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

          <DesktopNav items={nav} />
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
              /*
               * رفتن از یک دسته به دسته‌ی دیگر مسیر صفحه را عوض نمی‌کند (هر دو
               * /products اند و فقط پارامترشان فرق دارد)، پس بستنِ خودکار روی
               * تغییر مسیر کافی نبود و منو باز می‌ماند.
               */
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) setMobileOpen(false)
              }}
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
                  <MobileNavItem key={item.href} item={item} />
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

/** سقف سطرهای هر ستون در تابلوی دسته‌ها؛ بیشتر که شد، ستون بعدی ساخته می‌شود */
const COLUMN_LIMIT = 15

/** تو رفتگی زیرمجموعه‌ها، درست زیر عنوانِ مادر (پهنای نشان به‌علاوه‌ی فاصله‌اش) */
const HEAD_INDENT = 14

/** گروهِ ته کار برای دسته‌هایی که خودشان شاخه‌ای ندارند */
const OTHER_KEY = 'other'

/** یک خانه‌ی منو؛ هر خانه خودش می‌تواند زیرمجموعه داشته باشد، در هر عمقی */
interface NavEntry {
  href: string
  label: string
  highlight: boolean
  children: NavEntry[]
}

/** یک لینک داخل ستون، به‌همراه فاصله‌ای که عمقش در درخت می‌خواهد */
interface NavLink {
  entry: NavEntry
  depth: number
}

/**
 * منو از خود دسته‌بندی‌ها ساخته می‌شود تا با ساختن و حذف دسته همگام بماند.
 *
 * فقط ریشه‌ی بی‌کالا می‌افتد؛ شمار هر دسته کلِ شاخه‌اش را می‌شمارد، پس ریشه
 * وقتی صفر است که هیچ‌جای شاخه‌اش کالایی نباشد و چیزی از دست نمی‌رود.
 * زیرمجموعه‌ی خالی اما می‌ماند: ساختار کاتالوگ از همین تابلو فهمیده می‌شود و
 * دسته‌ی تازه‌ساخته باید بلافاصله دیده شود — صفحه‌اش هم لینک مرده نیست،
 * «کالایی پیدا نشد» می‌گوید، مثل نوار فیلتر کالاها.
 */
function buildNav(categories: CategoryWithCount[] | undefined): NavEntry[] {
  const toEntry = (node: CategoryNode<CategoryWithCount>): NavEntry => ({
    href: `/products?category=${node.item.slug}`,
    label: node.item.title,
    highlight: false,
    children: node.children.map(toEntry),
  })

  const entries = buildCategoryTree(categories ?? [])
    .filter((node) => node.item.productCount > 0)
    .map(toEntry)

  return [...entries, ...staticNav.map((item) => ({ ...item, children: [] }))]
}

/** درخت زیر یک ستون، تخت‌شده؛ عمق برای تورفتگی نگه داشته می‌شود */
function flattenEntries(entries: NavEntry[], depth = 0): NavLink[] {
  return entries.flatMap((entry) => [{ entry, depth }, ...flattenEntries(entry.children, depth + 1)])
}

/**
 * نوار دسته‌ها روی دسکتاپ.
 *
 * «کدام تابلو باز است» اینجا نگه داشته می‌شود نه داخل خودِ خانه‌ها، چون تابلو
 * عرض کل نوار را می‌گیرد؛ اگر داخل خانه بود، برای خانه‌های انتهای نوار از لبه‌ی
 * صفحه بیرون می‌زد. تابلو هم فرزند همین نوار است، پس بردن ماوس از عنوان به
 * داخل تابلو آن را نمی‌بندد.
 */
function DesktopNav({ items }: { items: NavEntry[] }) {
  const [openHref, setOpenHref] = useState<string | null>(null)
  const open = items.find((item) => item.href === openHref && item.children.length > 0)

  return (
    <nav
      className="relative hidden items-center gap-1 border-t border-border py-1.5 lg:flex"
      onMouseLeave={() => setOpenHref(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenHref(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpenHref(null)
      }}
    >
      {items.map((item) => (
        <NavItem key={item.href} item={item} open={open?.href === item.href} onEnter={() => setOpenHref(item.href)} />
      ))}

      <AnimatePresence>
        {open && <MegaPanel item={open} onNavigate={() => setOpenHref(null)} />}
      </AnimatePresence>
    </nav>
  )
}

/** عنوان یک دسته در نوار؛ رفتن ماوس یا فوکوس روی آن تابلو را عوض می‌کند */
function NavItem({ item, open, onEnter }: { item: NavEntry; open: boolean; onEnter: () => void }) {
  const hasChildren = item.children.length > 0

  return (
    <Link
      href={item.href}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      aria-expanded={hasChildren ? open : undefined}
      className={cn(
        'group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
        item.highlight ? 'text-ember-600 hover:bg-ember-500/10 dark:text-ember-400' : 'text-muted hover:text-foreground',
        open && !item.highlight && 'text-foreground',
      )}
    >
      {item.highlight && <Wrench className="size-3.5" />}
      {item.label}
      {hasChildren && <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />}
      <span
        className={cn(
          'absolute inset-x-3 -bottom-1.5 h-0.5 rounded-full bg-brand-500 transition-transform duration-300',
          open ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
        )}
      />
    </Link>
  )
}

/**
 * تابلوی بازشونده‌ی یک دسته‌ی اصلی.
 *
 * هر زیرمجموعه سرِ یک گروه است و شاخه‌ی زیرش — در هر عمقی — لینک‌های همان
 * گروه. گروه‌ها پشت سر هم در ستون‌ها می‌نشینند و هیچ ستونی از COLUMN_LIMIT سطر
 * بلندتر نمی‌شود.
 */
function MegaPanel({ item, onNavigate }: { item: NavEntry; onNavigate: () => void }) {
  /*
   * هر گروه یک مادر است و زیرش شاخه‌اش. دسته‌های بی‌شاخه گروه نمی‌سازند —
   * وگرنه سرِ ستون‌ها یک لینک تنها می‌افتاد — و همه با هم در «سایر» ته کار
   * جمع می‌شوند، بعد از مادرها.
   */
  const groups: MenuGroup<NavLink>[] = item.children
    .filter((child) => child.children.length > 0)
    .map((child) => ({
      key: child.href,
      head: { entry: child, depth: 0 },
      continued: false,
      items: flattenEntries(child.children),
    }))

  const loose = item.children.filter((child) => child.children.length === 0)
  if (loose.length) {
    groups.push({
      key: OTHER_KEY,
      head: { entry: { href: '', label: 'سایر', highlight: false, children: [] }, depth: 0 },
      continued: false,
      items: loose.map((entry) => ({ entry, depth: 0 })),
    })
  }

  const columns = packColumns(groups, COLUMN_LIMIT)

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      /*
       * بالشتک بالا جزو خود تابلو است تا ماوس در فاصله‌ی بین نوار و تابلو نیفتد.
       * عرض به اندازه‌ی ستون‌هاست نه تمام نوار — کاتالوگ کوچک تابلوی نیمه‌خالی
       * نمی‌سازد — ولی از لبه‌ی نوار جلوتر نمی‌رود و ستون‌های بیشتر می‌شکنند.
       */
      className="absolute start-0 top-full z-50 w-max max-w-full pt-1.5"
    >
      <div className="max-h-[75vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-lift">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
          <span className="text-[13px] font-bold">{item.label}</span>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="text-[12.5px] font-medium text-brand-600 transition-opacity hover:opacity-75 dark:text-brand-400"
          >
            همه‌ی {item.label} ←
          </Link>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-6">
          {columns.map((column, index) => (
            /* خط جداکننده ته هر گروه، مرز شاخه‌ها را بدون خواندن عنوان‌ها نشان می‌دهد */
            <div key={column[0]?.key ?? index} className="w-48 shrink-0 divide-y divide-border">
              {column.map((group) => {
                const head = group.head.entry
                const title = (
                  <>
                    <BranchMark on />
                    <span className="truncate">{head.label}</span>
                    {/* گروهی که بین دو ستون شکسته، عنوانش را دوباره می‌گیرد تا معلوم باشد زیرِ چیست */}
                    {group.continued && <span className="shrink-0 text-[11px] font-normal text-muted">ادامه</span>}
                  </>
                )

                return (
                  <div key={group.continued ? `${group.key}-more` : group.key} className="py-3 first:pt-0 last:pb-0">
                    {/* «سایر» دسته‌ی واقعی نیست، پس لینک نمی‌شود */}
                    {head.href ? (
                      <Link
                        href={head.href}
                        onClick={onNavigate}
                        className="flex items-center gap-1.5 rounded-lg text-[13px] font-bold text-foreground transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        {title}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">{title}</span>
                    )}

                    {group.items.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {group.items.map((link) => (
                          <li key={link.entry.href}>
                            <Link
                              href={link.entry.href}
                              onClick={onNavigate}
                              /* هر پله تو رفتگی می‌گیرد تا زیرمجموعه زیرِ مادر خودش دیده شود */
                              style={{ paddingInlineStart: HEAD_INDENT + link.depth * 12 }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-lg py-0.5 text-[12.5px] transition-colors hover:text-brand-600 dark:hover:text-brand-400',
                                link.entry.children.length ? 'font-semibold text-foreground' : 'text-muted',
                              )}
                            >
                              <BranchMark on={link.entry.children.length > 0} />
                              <span className="truncate">{link.entry.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * نشانِ «این دسته خودش شاخه دارد»: یک خط تیره‌ی آبی پیش از عنوان.
 *
 * برای دسته‌ی ته‌خط هم جای همان خط خالی می‌ماند، وگرنه عنوان‌های یک ستون
 * نسبت به هم جابه‌جا می‌شدند.
 */
function BranchMark({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="w-2 shrink-0 text-center text-blue-500 dark:text-blue-400">
      {on ? '—' : ''}
    </span>
  )
}

/**
 * خانه‌ی منوی گوشی؛ زیرمجموعه‌ها با زدن فلش باز می‌شوند، نه با رفتن به صفحه.
 *
 * خودش را برای شاخه‌های پایین‌تر دوباره صدا می‌زند، پس درخت هر چقدر هم عمیق
 * باشد روی گوشی کامل باز می‌شود.
 */
function MobileNavItem({ item, depth = 0 }: { item: NavEntry; depth?: number }) {
  const [open, setOpen] = useState(false)
  const hasChildren = item.children.length > 0

  return (
    <li>
      <div className="flex items-center gap-1">
        <Link
          href={item.href}
          className={cn(
            'flex flex-1 items-center gap-2 rounded-xl px-3 transition-colors',
            depth === 0 ? 'py-3 text-sm font-medium' : 'py-2.5 text-[13px] hover:text-foreground',
            // سرِ شاخه پررنگ‌تر از ته خط، همان‌طور که در تابلوی دسکتاپ
            depth > 0 && (hasChildren ? 'font-semibold text-foreground' : 'text-muted'),
            item.highlight ? 'bg-ember-500/10 text-ember-600 dark:text-ember-400' : 'hover:bg-surface-2',
          )}
        >
          {item.highlight && <Wrench className="size-4" />}
          {depth > 0 && <BranchMark on={item.children.length > 0} />}
          {item.label}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`زیرمجموعه‌های ${item.label}`}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5 space-y-0.5 border-e-2 border-border pe-3 ms-3">
          {item.children.map((child) => (
            <MobileNavItem key={child.href} item={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * برچسب کوچکِ زیر آیکون‌های هدر، فقط هنگام رفتن ماوس روی آن یا فوکوس با صفحه‌کلید.
 *
 * روی لمسی نمایش داده نمی‌شود (hover واقعی وجود ندارد) و چون خود لینک
 * aria-label دارد، از دید صفحه‌خوان پنهان می‌ماند تا اسم دوباره خوانده نشود.
 */
function IconHint({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-soft transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
    >
      {children}
    </span>
  )
}
