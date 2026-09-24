'use client'

import { Fragment, useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRightLeft, BadgePercent, ChevronDown, Layers, LayoutDashboard, Mail, Megaphone, MessageSquareText, Package, Palette, Settings, ShieldCheck, ShoppingCart, Smartphone, Tags, Users, Wrench } from 'lucide-react'
import type { Permission } from '@/types/user'
import { useCan } from '@/lib/use-can'
import { useSession } from '@/store/session'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { AccountBox } from '@/components/admin/account-box'
import { useUi } from '@/store/ui'
import { useAccounts } from '@/lib/use-accounts'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MenuItem {
  href: string
  label: string
  icon: typeof Package
  permission: Permission
}

/**
 * منو دسته‌بندی شده تا با زیاد شدن صفحه‌ها فهرست تخت و طولانی نشود.
 * گروه اول عنوان ندارد چون داشبورد نقطه‌ی شروع است، نه یکی از دسته‌ها.
 * عنوان هر گروه با عنوان آیتم‌هایش یکی نیست تا در نگاه اول قاطی نشوند.
 */
const menu: { title?: string; items: MenuItem[] }[] = [
  {
    items: [{ href: '/admin', label: 'داشبورد', icon: LayoutDashboard, permission: 'dashboard.view' }],
  },
  {
    title: 'فروشگاه',
    items: [
      { href: '/admin/products', label: 'محصولات', icon: Package, permission: 'product.manage' },
      { href: '/admin/categories', label: 'دسته‌بندی و برند', icon: Layers, permission: 'category.manage' },
      { href: '/admin/tags', label: 'برچسب‌ها', icon: Tags, permission: 'tag.manage' },
      { href: '/admin/discounts', label: 'تخفیف‌ها', icon: BadgePercent, permission: 'discount.manage' },
    ],
  },
  {
    title: 'عملیات',
    items: [
      { href: '/admin/orders', label: 'سفارش‌ها', icon: ShoppingCart, permission: 'order.manage' },
      { href: '/admin/repairs', label: 'تعمیرات', icon: Wrench, permission: 'repair.manage' },
      { href: '/admin/reviews', label: 'نظرات', icon: MessageSquareText, permission: 'review.moderate' },
      { href: '/admin/newsletter', label: 'خبرنامه', icon: Megaphone, permission: 'newsletter.manage' },
    ],
  },
  {
    title: 'حساب‌ها',
    items: [
      { href: '/admin/users', label: 'کاربران', icon: Users, permission: 'user.manage' },
      { href: '/admin/admins', label: 'ادمین‌ها', icon: ShieldCheck, permission: 'admin.manage' },
    ],
  },
  {
    title: 'پیکربندی',
    items: [
      { href: '/admin/appearance', label: 'طراحی سایت', icon: Palette, permission: 'appearance.manage' },
      { href: '/admin/settings', label: 'تنظیمات', icon: Settings, permission: 'settings.manage' },
      { href: '/admin/sms', label: 'پیامک', icon: Smartphone, permission: 'settings.manage' },
      { href: '/admin/email', label: 'ایمیل', icon: Mail, permission: 'settings.manage' },
    ],
  },
]

/** گارد دسترسی — همان چیزی که README خواسته: دو نوع ادمین با اختیارات متفاوت */
export function PermissionGate({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { role, userId, signInAs } = useSession()
  const can = useCan()
  const accounts = useAccounts()

  if (!can(permission)) {
    // سلکتور نقش داخل خود پیام است، چون سایدبار در عرض‌های کوچک مخفی می‌شود
    // و کاربر بدون آن راهی برای خروج از این حالت ندارد.
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          icon={ArrowRightLeft}
          title="به این بخش دسترسی ندارید"
          description={
            role === 'customer'
              ? 'با حساب مشتری وارد شده‌اید. برای مشاهده‌ی پنل، نقش کاربری را تغییر دهید.'
              : 'این بخش فقط برای «مدیر کل سایت» فعال است.'
          }
          action={
            MOCKING_ENABLED ? (
              // سلکتور نقش داخل خود پیام است، چون سایدبار در عرض‌های کوچک مخفی
              // می‌شود و کاربر بدون آن راهی برای خروج از این حالت ندارد.
              <div className="w-56 space-y-1.5 text-start">
                <span className="block text-[11px] text-muted">ورود به‌عنوان (حالت دمو)</span>
                <Select
                  value={userId}
                  onChange={(e) => {
                    const account = accounts.find((a) => a.id === e.target.value)
                    if (account) signInAs(account)
                  }}
                  className="h-10 text-[12.5px]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <Link href="/login" className={cn(buttonVariants({ variant: 'soft' }))}>
                ورود با حساب دیگر
              </Link>
            )
          }
        />
      </div>
    )
  }
  return <>{children}</>
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { userId, signInAs } = useSession()
  const can = useCan()
  const accounts = useAccounts()

  // گروهی که همه‌ی آیتم‌هایش برای این ادمین قفل است، عنوانش هم نباید بماند
  const groups = menu
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-border bg-surface lg:flex">
        <div className="border-b border-border p-5">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {groups.map((group) => (
            <NavGroup key={group.title ?? 'main'} title={group.title} items={group.items} pathname={pathname} />
          ))}
        </nav>

        <div className="space-y-3 border-t border-border p-4">
          <AccountBox />
          <ThemeToggle />
          <Link href="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm', block: true }))}>
            بازگشت به سایت
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* منوی افقی موبایل */}
        <div className="sticky top-0 z-40 border-b border-border bg-surface lg:hidden">
          <div className="flex items-center justify-between p-3">
            <Logo compact />
            <ThemeToggle />
          </div>
          {/* در نوار افقی جا برای عنوان گروه نیست؛ مرز گروه‌ها را یک خط باریک نشان می‌دهد */}
          <div className="flex items-stretch gap-1 overflow-x-auto px-3 pb-2 no-scrollbar">
            {groups.map((group, index) => (
              <Fragment key={group.title ?? 'main'}>
                {index > 0 && <span aria-hidden className="my-1.5 w-px shrink-0 bg-border" />}
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'shrink-0 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors',
                      pathname === item.href ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'text-muted',
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        <main className="p-5 sm:p-7">{children}</main>
      </div>
    </div>
  )
}

/** لینک‌های یک گروه؛ گروه‌های عنوان‌دار باز و بسته می‌شوند و حالتشان ذخیره می‌ماند */
function NavGroup({
  title,
  items,
  pathname,
}: {
  title?: string
  items: MenuItem[]
  pathname: string
}) {
  const { adminNavCollapsed, toggleAdminNavGroup } = useUi()
  const panelId = useId()

  const collapsed = title ? adminNavCollapsed.includes(title) : false
  const hasActive = items.some((item) => item.href === pathname)

  const links = (
    <div className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200',
              active
                ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                : 'text-muted hover:bg-surface-2 hover:text-foreground',
            )}
          >
            <item.icon className="size-4" />
            {item.label}
            {active && <span className="ms-auto size-1.5 rounded-full bg-brand-500" />}
          </Link>
        )
      })}
    </div>
  )

  if (!title) return links

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => toggleAdminNavGroup(title)}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        className="flex w-full items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[10.5px] font-bold text-muted transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn('size-3 shrink-0 transition-transform duration-200', collapsed && 'rotate-90')} />
        {title}
        {/* وقتی گروه بسته است، صفحه‌ی فعالِ داخلش دیده نمی‌شود؛ این نقطه جایش را نشان می‌دهد */}
        {collapsed && hasActive && <span className="ms-auto size-1.5 rounded-full bg-brand-500" />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pt-1"
          >
            {links}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
