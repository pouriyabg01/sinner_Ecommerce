'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/input'
import { getIcon, iconMap } from '@/lib/icons'

const ICON_NAMES = Object.keys(iconMap)

/**
 * سوییچ روشن/خاموش یک بلوک — محتوا حذف نمی‌شود، فقط در سایت نشان داده نمی‌شود.
 * `labels` برای جاهایی است که «نمایش/مخفی» معنا ندارد، مثل روشن بودن ارسال پیامک.
 */
export function BlockToggle({
  checked,
  onChange,
  labels = { on: 'نمایش داده می‌شود', off: 'مخفی است' },
}: {
  checked: boolean
  onChange: (next: boolean) => void
  labels?: { on: string; off: string }
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--color-brand-500)]"
      />
      {checked ? labels.on : labels.off}
    </label>
  )
}

/** قاب یک ردیف تکرارشونده در ویرایشگرها: عنوان + دکمه‌ی حذف */
export function EditorRow({
  title,
  onDelete,
  children,
}: {
  title: string
  onDelete: () => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold">{title}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`حذف ${title}`}
          className="text-muted hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {children}
    </div>
  )
}

/** انتخاب آیکون از `iconMap` با پیش‌نمایش زنده‌ی همان آیکونی که در سایت رندر می‌شود */
export function IconPicker({
  value,
  onChange,
  label = 'آیکون',
}: {
  value: string
  onChange: (next: string) => void
  label?: string
}) {
  const Icon = getIcon(value)
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <Icon className="size-5" />
        </span>
        <Select value={value} dir="ltr" onChange={(e) => onChange(e.target.value)}>
          {ICON_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  )
}
