'use client'

import { useId } from 'react'
import { Check } from 'lucide-react'
import { badgeVariants, type BadgeTone } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ChipOption<T extends string> {
  value: T
  label: string
  /** رنگ نشان وقتی انتخاب شده؛ نشده‌ها همیشه خاکستری‌اند */
  tone?: BadgeTone
}

/**
 * انتخاب یک گزینه از چند گزینه‌ی کم‌تعداد، با ظاهر همان نشان‌های (Badge) سایت.
 * برای وضعیت‌هایی مثل حساب کاربر که سه حالت بیشتر ندارند، از سلکتور خواناتر است:
 * هر سه گزینه هم‌زمان دیده می‌شوند و رنگِ انتخاب‌شده همان رنگی است که در جدول می‌بینید.
 *
 * زیر پوسته رادیوی واقعی است، نه دکمه — یعنی کلید جهت‌ها، Tab و صفحه‌خوان
 * بدون کد اضافه درست کار می‌کنند.
 *
 * انتخاب‌شده تیک می‌گیرد، نه فقط رنگ؛ و گزینه‌های دیگر کم‌رنگ نمی‌شوند چون
 * متنشان باید خوانا بماند — تفاوت را رنگ نشان و تیک می‌سازند، نه شفافیت.
 */
export function ChipPicker<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
}: {
  value: T
  options: ChipOption<T>[]
  onChange: (value: T) => void
  /** برای صفحه‌خوان؛ روی صفحه دیده نمی‌شود */
  label: string
  disabled?: boolean
  className?: string
}) {
  const name = useId()

  return (
    <fieldset disabled={disabled} className={cn('min-w-0', disabled && 'opacity-60')}>
      <legend className="sr-only">{label}</legend>
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                badgeVariants({ tone: selected ? (option.tone ?? 'brand') : 'neutral' }),
                'cursor-pointer select-none px-3 py-1.5 transition-all',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                selected
                  ? 'ring-1 ring-current/25'
                  : 'can-hover:hover:text-foreground can-hover:hover:ring-1 can-hover:hover:ring-border',
                disabled && 'cursor-not-allowed',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {selected && <Check className="size-3 shrink-0" aria-hidden />}
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
