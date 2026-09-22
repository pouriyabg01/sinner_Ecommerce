'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Permission, User, UserRole } from '@/types/user'
import { ADMIN_PRESETS } from '@/types/user'
import { MOCKING_ENABLED } from '@/lib/api/config'

/**
 * حساب‌های آماده‌ی حالت دمو.
 *
 * فقط وقتی لایه‌ی mock روشن است به کار می‌آیند؛ آنجا اصلاً ورودی وجود ندارد و
 * برای تست گاردهای دسترسی باید بشود بین نقش‌ها سوییچ کرد. با بک‌اند واقعی،
 * ورود از صفحه‌ی `/login` انجام می‌شود و این‌ها استفاده نمی‌شوند.
 */
export interface MockAccount {
  id: string
  name: string
  role: UserRole
  permissions?: Permission[]
}

const catalogPermissions = ADMIN_PRESETS.find((p) => p.id === 'catalog')!.permissions

export const MOCK_ACCOUNTS: MockAccount[] = [
  { id: 'usr_001', name: 'سارا محمدی (مشتری)', role: 'customer' },
  { id: 'usr_100', name: 'مدیر کل سایت', role: 'admin_super' },
  { id: 'usr_101', name: 'ادمین کاتالوگ', role: 'admin', permissions: catalogPermissions },
]

/** کاربر پایگاه‌داده را به حسابی که سلکتور «ورود به‌عنوان» می‌فهمد تبدیل می‌کند */
export const toAccount = (user: User): MockAccount => ({
  id: user.id,
  name: user.adminTitle ? `${user.fullName} (${user.adminTitle})` : user.fullName,
  role: user.role,
  permissions: user.permissions,
})

interface SessionState {
  /** توکن بک‌اند واقعی؛ در حالت mock همیشه null است */
  token: string | null
  userId: string
  role: UserRole
  permissions: Permission[]
  fullName: string
  signIn: (token: string, user: User) => void
  signOut: () => void
  /** فقط حالت دمو */
  signInAs: (account: MockAccount) => void
}

/** حالت خارج‌شده؛ در mock به حساب دموی اول برمی‌گردد تا سایت خالی نماند */
const guest = () =>
  MOCKING_ENABLED
    ? {
        token: null,
        userId: MOCK_ACCOUNTS[0].id,
        role: MOCK_ACCOUNTS[0].role as UserRole,
        permissions: MOCK_ACCOUNTS[0].permissions ?? [],
        fullName: MOCK_ACCOUNTS[0].name,
      }
    : { token: null, userId: '', role: 'customer' as UserRole, permissions: [], fullName: '' }

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...guest(),
      signIn: (token, user) =>
        set({
          token,
          userId: user.id,
          role: user.role,
          permissions: user.permissions ?? [],
          fullName: user.fullName,
        }),
      signOut: () => set(guest()),
      signInAs: (account) =>
        set({
          token: null,
          userId: account.id,
          role: account.role,
          permissions: account.permissions ?? [],
          fullName: account.name,
        }),
    }),
    {
      name: 'sinner-session',
      version: 3,
      /**
       * نسخه‌های قبل توکن نداشتند و نقش را از حساب دمو می‌گرفتند. بدون این
       * مهاجرت، هر کسی که از قبل «وارد» بود با نشستِ ناقص بالا می‌آمد.
       */
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<SessionState>

        return {
          ...guest(),
          ...(old.userId ? { userId: old.userId, role: old.role ?? 'customer' } : {}),
          permissions: old.permissions ?? [],
          token: null,
        } as SessionState
      },
    },
  ),
)

/** توکن، بیرون از React — لایه‌ی شبکه هوک صدا نمی‌زند */
export const sessionToken = () => useSession.getState().token
