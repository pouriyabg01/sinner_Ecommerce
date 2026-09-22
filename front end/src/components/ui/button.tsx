'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { buttonVariants, type ButtonVariantProps } from './button-variants'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
