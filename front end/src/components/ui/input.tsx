'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { groupDigits, toEnDigits } from '@/lib/format'

const base =
  'w-full rounded-2xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-brand-400 focus:shadow-[0_0_0_4px_rgba(0,179,146,0.14)] disabled:opacity-60'

/** حالت خطا: قاب قرمز که روی حالت focus هم می‌ماند تا کاربر گمش نکند */
const invalidClasses =
  'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.16)]'

interface Invalid {
  /** ورودی خطا دارد — قاب قرمز می‌شود و `aria-invalid` می‌گیرد */
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & Invalid>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, 'h-11', invalid && invalidClasses, className)}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(base, 'min-h-28 resize-y py-3 leading-7', invalid && invalidClasses, className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & Invalid>(
  ({ className, invalid, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, 'h-11 cursor-pointer appearance-none pe-9', invalid && invalidClasses, className)}
      {...props}
    />
  ),
)
Select.displayName = 'Select'

/** روی سرور useLayoutEffect هشدار می‌دهد؛ فقط در مرورگر لازمش داریم */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

/**
 * ورودی مبلغ: در حال تایپ از راست هر سه رقم با «,» جدا می‌شود، ولی مقداری که
 * به `onChange` می‌رسد فقط رقم خام لاتین است تا فرم و اعتبارسنجی درگیر جداکننده نشوند.
 *
 * جای مکان‌نما بعد از قالب‌بندی حفظ می‌شود: تعداد رقم‌های قبل از مکان‌نما شمرده
 * می‌شود و بعد از رندر، مکان‌نما دوباره بعد از همان تعداد رقم می‌نشیند. بدون این،
 * ویرایش وسط عدد مکان‌نما را به ته فیلد پرت می‌کرد.
 */
export const PriceInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> &
    Invalid & { value: string; onChange: (rawDigits: string) => void }
>(({ value, onChange, className, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLInputElement>(null)
  const digitsBeforeCaret = React.useRef<number | null>(null)

  React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement)

  useIsomorphicLayoutEffect(() => {
    const target = digitsBeforeCaret.current
    const el = innerRef.current
    if (target == null || !el) return
    digitsBeforeCaret.current = null

    let seen = 0
    let position = 0
    while (position < el.value.length && seen < target) {
      if (/[\d۰-۹]/.test(el.value[position])) seen++
      position++
    }
    el.setSelectionRange(position, position)
  })

  const countDigits = (text: string) => (text.match(/[\d۰-۹]/g) ?? []).length

  return (
    <Input
      ref={innerRef}
      value={groupDigits(value)}
      onChange={(e) => {
        digitsBeforeCaret.current = countDigits(e.target.value.slice(0, e.target.selectionStart ?? 0))
        onChange(toEnDigits(e.target.value).replace(/\D/g, ''))
      }}
      inputMode="numeric"
      className={cn('num', className)}
      {...props}
    />
  )
})
PriceInput.displayName = 'PriceInput'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-2', className)}>
      <span className="flex items-center gap-1 text-[13px] font-medium">
        {label}
        {required && <span className="text-ember-500">*</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="block text-xs text-red-500">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

/** برای کنترل‌هایی که input نیستند ولی باید همان شکل را داشته باشند، مثل انتخابگر تاریخ */
export { base as inputBaseClass, invalidClasses as inputInvalidClass }
