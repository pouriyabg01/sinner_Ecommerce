'use client'

import { useAdmins } from '@/lib/api/queries'
import { MOCK_ACCOUNTS, toAccount, type MockAccount } from '@/store/session'

/**
 * فهرست سلکتور «ورود به‌عنوان» در پنل: حساب‌های اولیه به‌علاوه‌ی هر ادمینی که
 * مدیر کل ساخته — تا بشود بلافاصله بعد از ساخت، دسترسی‌هایش را همان‌جا تست کرد.
 */
export function useAccounts(): MockAccount[] {
  const { data } = useAdmins()
  if (!data) return MOCK_ACCOUNTS

  const seedIds = new Set(MOCK_ACCOUNTS.map((a) => a.id))
  return [...MOCK_ACCOUNTS, ...data.filter((u) => !seedIds.has(u.id)).map(toAccount)]
}
