import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  as: Heading = 'h3',
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /**
   * سطح تیتر. وقتی حالت خالی کل محتوای صفحه است باید `h1` باشد، وگرنه صفحه
   * بدون تیتر اصلی می‌ماند و ساختار سند می‌شکند.
   */
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      <span className="grid size-16 place-items-center rounded-3xl bg-surface-2 text-muted">
        <Icon className="size-7" />
      </span>
      <Heading className="text-base font-bold">{title}</Heading>
      {description && <p className="max-w-sm text-sm leading-7 text-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
