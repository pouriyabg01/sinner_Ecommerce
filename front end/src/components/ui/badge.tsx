import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none',
  {
    variants: {
      tone: {
        brand: 'bg-brand-500/12 text-brand-700 dark:text-brand-300',
        ember: 'bg-ember-500/14 text-ember-600 dark:text-ember-400',
        neutral: 'bg-surface-2 text-muted',
        success: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-500/14 text-amber-600 dark:text-amber-400',
        danger: 'bg-red-500/12 text-red-600 dark:text-red-400',
        solid: 'bg-ink-900 text-white dark:bg-white dark:text-ink-900',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
