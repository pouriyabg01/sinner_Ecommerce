import { cn } from '@/lib/utils'
import { discountPercent, formatPrice, toFaDigits } from '@/lib/format'

export function Price({
  value,
  compareAt,
  size = 'md',
  className,
}: {
  value: number
  compareAt?: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const off = discountPercent(value, compareAt ?? null)
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  } as const

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {off != null && (
        <span className="rounded-full bg-ember-500 px-2 py-0.5 text-[11px] font-bold text-white">
          {toFaDigits(off)}٪
        </span>
      )}
      <span className={cn('font-bold tracking-tight', sizes[size])}>{formatPrice(value)}</span>
      {off != null && compareAt && (
        <span className="text-xs text-muted line-through">{formatPrice(compareAt, false)}</span>
      )}
    </div>
  )
}
