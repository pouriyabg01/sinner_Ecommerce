'use client'

import { useEffect, useState } from 'react'
import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from '@tanstack/react-query'
import { MockProvider } from '@/mocks/mock-provider'
import { FaviconSync } from '@/components/layout/favicon-sync'
import { Toaster } from '@/components/ui/toast'
import { applyTheme, useUi } from '@/store/ui'

function ThemeSync() {
  const theme = useUi((s) => s.theme)
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])
  return null
}

/**
 * `state` داده‌ای است که لایه‌ی ریشه روی سرور از پیش گرفته (تنظیمات سایت). باید دور
 * همه‌چیز باشد، حتی FaviconSync: اولین کامپوننتی که کوئری تنظیمات را می‌سازد همین است و
 * اگر پیش از رسیدن داده‌ی سرور بسازدش، آن داده فقط بعد از بالا آمدن صفحه اعمال می‌شود.
 */
export function Providers({ children, state }: { children: React.ReactNode; state?: DehydratedState }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={state}>
        <MockProvider>
          <ThemeSync />
          <FaviconSync />
          {children}
          <Toaster />
        </MockProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
