'use client'

import { useEffect, useMemo, useState } from 'react'

export interface PaginationState<T> {
  page: number
  perPage: number
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  /** فقط آیتم‌های صفحه‌ی جاری */
  pageItems: T[]
  total: number
  totalPages: number
  /** شماره‌ی اولین و آخرین آیتمِ صفحه‌ی جاری (۱-پایه) — برای متن «نمایش … تا …» */
  from: number
  to: number
}

/**
 * صفحه‌بندی سمت کلاینت روی آرایه‌ای که کامل در اختیار داریم.
 * اگر تعداد آیتم‌ها کم شود (حذف رکورد یا فیلتر شدن)، صفحه‌ی جاری خودکار اصلاح می‌شود.
 *
 * `resetKey` هر وقت عوض شود کاربر به صفحه‌ی ۱ برمی‌گردد — برای جست‌وجو و مرتب‌سازی
 * که ترتیب کل لیست را عوض می‌کنند و ماندن روی صفحه‌ی قبلی بی‌معنی است.
 *
 * اینجا (نه کنار جدول‌های پنل) زندگی می‌کند چون پیشخوان کاربر هم از آن استفاده
 * می‌کند و صفحه‌ی فروشگاه نباید به کد پنل وابسته شود.
 */
export function usePagination<T>(items: T[], initialPerPage = 10, resetKey?: string): PaginationState<T> {
  const [page, setPage] = useState(1)
  const [perPage, setPerPageState] = useState(initialPerPage)
  const [lastResetKey, setLastResetKey] = useState(resetKey)

  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey)
    setPage(1)
  }

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * perPage, safePage * perPage),
    [items, safePage, perPage],
  )

  const setPerPage = (value: number) => {
    setPerPageState(value)
    setPage(1)
  }

  return {
    page: safePage,
    perPage,
    setPage,
    setPerPage,
    pageItems,
    total,
    totalPages,
    from: total === 0 ? 0 : (safePage - 1) * perPage + 1,
    to: Math.min(safePage * perPage, total),
  }
}
