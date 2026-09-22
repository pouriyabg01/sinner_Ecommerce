import { cva, type VariantProps } from 'class-variance-authority'

/**
 * جدا از button.tsx نگه داشته شده چون آن فایل 'use client' است و
 * فراخوانی این تابع از Server Component ها باید ممکن بماند.
 */
export const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,background-color,box-shadow,color] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-500 text-white shadow-[0_10px_30px_-12px_rgba(0,179,146,0.8)] hover:bg-brand-600 hover:shadow-[0_16px_38px_-14px_rgba(0,179,146,0.9)]',
        ember: 'bg-ember-500 text-white shadow-[0_10px_30px_-12px_rgba(255,92,62,0.8)] hover:bg-ember-600',
        outline: 'border border-border bg-transparent hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300',
        ghost: 'bg-transparent hover:bg-surface-2',
        soft: 'bg-brand-500/10 text-brand-700 hover:bg-brand-500/20 dark:text-brand-300',
        ink: 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100',
        danger: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400',
      },
      size: {
        sm: 'h-9 rounded-xl px-3.5 text-[13px]',
        md: 'h-11 rounded-2xl px-5 text-sm',
        lg: 'h-13 rounded-2xl px-7 text-base',
        icon: 'size-10 rounded-xl',
        'icon-sm': 'size-8 rounded-lg',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
