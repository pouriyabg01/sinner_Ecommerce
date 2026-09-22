'use client'

import { CloudAlert } from 'lucide-react'
import { Button } from './button'
import { EmptyState } from './empty-state'

/**
 * حالتِ «کوئری خطا داد» را نشان می‌دهد.
 *
 * وقتی یک کوئری شکست می‌خورد `data` خالی می‌ماند؛ اگر صفحه فقط با
 * `isLoading || !data` اسکلتون بگذارد، آن اسکلتون تا ابد سرِ جایش می‌ماند و
 * کاربر فکر می‌کند سایت روی loading گیر کرده. اینجا به‌جای آن، خطا دیده می‌شود
 * و با یک کلیک دوباره تلاش می‌شود.
 */
export function LoadError({
  onRetry,
  className,
  as,
}: {
  onRetry?: () => void
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <EmptyState
      as={as}
      icon={CloudAlert}
      title="بارگذاری اطلاعات ناموفق بود"
      description="ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید."
      className={className}
      action={
        onRetry && (
          <Button variant="soft" onClick={onRetry}>
            تلاش دوباره
          </Button>
        )
      }
    />
  )
}
