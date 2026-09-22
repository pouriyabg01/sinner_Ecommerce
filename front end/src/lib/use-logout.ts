'use client'

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/endpoints'
import { useSession } from '@/store/session'

/**
 * خروج از حساب.
 *
 * کش react-query هم پاک می‌شود، نه فقط توکن: پروفایل، سفارش‌ها و تعمیرهای
 * کاربر قبلی در کش می‌مانند و بدون این، نفر بعدی که روی همین مرورگر وارد
 * می‌شود تا رسیدن پاسخ تازه اطلاعات او را می‌بیند.
 */
export function useLogout(redirectTo = '/') {
  const router = useRouter()
  const queryClient = useQueryClient()
  const signOut = useSession((s) => s.signOut)

  return async () => {
    // اگر خودِ درخواست خروج شکست بخورد (توکن منقضی، قطعی شبکه)، نشست محلی باز هم باید بسته شود
    await authApi.logout().catch(() => undefined)
    signOut()
    queryClient.clear()
    router.push(redirectTo)
  }
}
