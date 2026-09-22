'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useAccounts } from '@/lib/use-accounts'
import { useLogout } from '@/lib/use-logout'
import { useSession } from '@/store/session'
import { Select } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { ROLE_LABEL } from '@/types/user'
import { cn } from '@/lib/utils'

/**
 * جعبه‌ی حساب در پای سایدبار پنل.
 *
 * در حالت mock هیچ ورودی وجود ندارد، پس سلکتور «نقش فعلی» می‌ماند تا بشود
 * گاردهای دسترسی را تست کرد. با بک‌اند واقعی، همان جا حسابِ واردشده و دکمه‌ی
 * خروج می‌نشیند.
 */
export function AccountBox() {
  const { userId, fullName, role, token, signInAs } = useSession()
  const accounts = useAccounts()
  const logout = useLogout('/login')

  if (MOCKING_ENABLED) {
    return (
      <div className="space-y-1.5">
        <span className="text-[11px] text-muted">نقش فعلی (حالت دمو)</span>
        <Select
          value={userId}
          onChange={(e) => {
            const account = accounts.find((a) => a.id === e.target.value)
            if (account) signInAs(account)
          }}
          className="h-9 text-[12px]"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
    )
  }

  if (!token) {
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: 'soft', size: 'sm', block: true }))}>
        ورود به حساب
      </Link>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-surface-2 px-3 py-2.5">
        <span className="block truncate text-[12.5px] font-medium">{fullName}</span>
        <span className="block pt-0.5 text-[11px] text-muted">{ROLE_LABEL[role]}</span>
      </div>
      <Button variant="ghost" size="sm" block onClick={() => void logout()} className="text-muted">
        <LogOut className="size-4" />
        خروج
      </Button>
    </div>
  )
}
