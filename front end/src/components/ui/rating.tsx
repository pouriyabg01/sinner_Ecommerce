import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toFaDigits } from '@/lib/format'

export function Rating({
  value,
  count,
  size = 14,
  showValue = true,
  className,
}: {
  value: number
  count?: number
  size?: number
  showValue?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex" dir="ltr">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            width={size}
            height={size}
            className={cn(
              'transition-colors',
              i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-ink-300 dark:text-ink-700',
            )}
          />
        ))}
      </span>
      {showValue && <span className="num text-xs font-medium">{toFaDigits(value.toFixed(1))}</span>}
      {count != null && <span className="num text-xs text-muted">({toFaDigits(count)})</span>}
    </span>
  )
}
