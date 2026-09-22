'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Heart, MapPin, LayoutDashboard, Package, Settings, Wrench, LogOut, ShieldCheck, User, UserCog } from 'lucide-react'
import { useMe } from '@/lib/api/queries'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useSession, MOCK_ACCOUNTS } from '@/store/session'
import { Select } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { SignInRequired } from '@/components/auth/sign-in-required'
import { useCan } from '@/lib/use-can'
import { useLogout } from '@/lib/use-logout'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'

const links = [
  { href: '/profile', label: 'پیشخوان', icon: LayoutDashboard },
  { href: '/profile/orders', label: 'سفارش‌های من', icon: Package },
  { href: '/profile/repairs', label: 'تعمیرات من', icon: Wrench },
  { href: '/profile/wishlist', label: 'علاقه‌مندی‌ها', icon: Heart },
  { href: '/profile/alerts', label: 'خبرم کن', icon: Bell },
  { href: '/profile/addresses', label: 'آدرس‌ها', icon: MapPin },
  { href: '/profile/account', label: 'اطلاعات حساب', icon: UserCog },
]

export function ProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <SignInRequired
      title="وارد حساب نشده‌اید"
      description="برای دیدن سفارش‌ها، پیگیری تعمیرات و مدیریت آدرس‌ها وارد حساب خود شوید."
    >
      <SignedInShell>{children}</SignedInShell>
    </SignInRequired>
  )
}

function SignedInShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { userId, signInAs } = useSession()
  const can = useCan()
  const { data: user } = useMe(userId)
  const logout = useLogout()

  return (
    <div className="container-page py-8">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-4">
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/12 text-brand-600 dark:text-brand-400">
                <User className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user?.fullName ?? '—'}</p>
                <p className="num truncate text-[11px] text-muted" dir="ltr">
                  {user ? formatPhone(user.phone) : ''}
                </p>
              </div>
            </div>

            {/* در حالت mock ورودی وجود ندارد؛ سوییچ نقش فقط برای تست گاردهاست */}
            {MOCKING_ENABLED && (
              <div className="mt-4 space-y-1.5 border-t border-border pt-4">
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Settings className="size-3" />
                  ورود به‌عنوان (حالت دمو)
                </span>
                <Select
                  value={userId}
                  onChange={(e) => {
                    const account = MOCK_ACCOUNTS.find((a) => a.id === e.target.value)
                    if (account) signInAs(account)
                  }}
                  className="h-9 text-[12px]"
                >
                  {MOCK_ACCOUNTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <nav className="space-y-1 rounded-card border border-border bg-surface p-2.5">
            {links.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200',
                    active
                      ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                      : 'text-muted hover:bg-surface-2 hover:text-foreground',
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              )
            })}

            {can('dashboard.view') && (
              <Link
                href="/admin"
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-ember-600 transition-colors hover:bg-ember-500/10 dark:text-ember-400"
              >
                <ShieldCheck className="size-4" />
                پنل مدیریت
              </Link>
            )}

            {/* در حالت mock حسابی برای خروج وجود ندارد */}
            {!MOCKING_ENABLED && (
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-red-500/8 hover:text-red-500"
              >
                <LogOut className="size-4" />
                خروج
              </button>
            )}
          </nav>

          <Link href="/repair" className={cn(buttonVariants({ variant: 'soft', block: true }))}>
            <Wrench className="size-4" />
            ثبت درخواست تعمیر
          </Link>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
