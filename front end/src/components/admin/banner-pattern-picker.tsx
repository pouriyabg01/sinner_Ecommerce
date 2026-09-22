'use client'

import { Check } from 'lucide-react'
import type { BannerPattern } from '@/types/cms'
import { BANNER_PATTERNS, BannerBackground } from '@/components/home/banner-background'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** رنگ‌گزین به‌همراه کد رنگ؛ کد برای وقتی است که رنگ دقیق برند را دارید */
export function ColorInput({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-surface p-1"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" className="en-code" />
    </div>
  )
}

/**
 * انتخاب الگوی پس‌زمینه‌ی بنر. هر گزینه با رنگ‌های همین بنر پیش‌نمایش می‌شود،
 * نه یک نمونه‌ی ثابت — چون الگوی کم‌رنگ روی هر رنگی جور دیگری دیده می‌شود.
 */
export function BannerPatternPicker({
  value,
  color,
  accent,
  onChange,
}: {
  value: BannerPattern
  color: string
  accent: string
  onChange: (pattern: BannerPattern) => void
}) {
  return (
    <div className="space-y-2">
      <span className="block text-[13px] font-medium">الگو</span>
      <div className="grid grid-cols-3 gap-2">
        {BANNER_PATTERNS.map((pattern) => {
          const picked = pattern.value === value
          return (
            <button
              key={pattern.value}
              type="button"
              aria-pressed={picked}
              onClick={() => onChange(pattern.value)}
              className={cn(
                'overflow-hidden rounded-xl border text-start transition-all',
                picked ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-border hover:border-brand-400',
              )}
            >
              <span className="relative block aspect-[16/7]">
                <BannerBackground color={color} accent={accent} pattern={pattern.value} />
              </span>
              <span className="flex items-center justify-between px-2 py-1.5 text-[11.5px]">
                {pattern.label}
                {picked && <Check className="size-3.5 text-brand-500" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
