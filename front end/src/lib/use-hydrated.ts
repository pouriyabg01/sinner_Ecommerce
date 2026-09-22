'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * آیا کامپوننت در مرورگر hydrate شده است.
 *
 * نشستِ ورود در localStorage است و روی سرور وجود ندارد. اگر هدر بلافاصله بر
 * اساس توکن رندر شود، HTML سرور («ورود») با اولین رندر مرورگر (آیکون حساب)
 * فرق می‌کند و React خطای ناهماهنگی می‌دهد. این هوک روی سرور و در خود مرحله‌ی
 * hydrate مقدار false برمی‌گرداند و بلافاصله بعدش true.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
