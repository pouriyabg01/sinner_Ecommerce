'use client'

import { useSession } from '@/store/session'
import { can, type Permission } from '@/types/user'

/**
 * دسترسی کاربرِ واردشده. مدیر کل همیشه همه‌چیز را دارد؛ ادمین‌های ساخته‌شده
 * فقط همان دسترسی‌هایی را دارند که موقع ساختشان انتخاب شده.
 */
export function useCan(): (permission: Permission) => boolean {
  const { role, permissions } = useSession()

  return (permission) => can({ role, permissions }, permission)
}
