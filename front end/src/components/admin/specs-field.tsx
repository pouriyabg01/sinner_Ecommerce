'use client'

import { ListPlus, Plus, X } from 'lucide-react'
import type { CategorySlug, ProductSpec } from '@/types/catalog'
import { getCategory, specLabel } from '@/mocks/data/taxonomy'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toEnDigits } from '@/lib/format'

/** نسخه‌ی قابل‌ویرایش ProductSpec؛ score رشته می‌ماند تا تایپ کردن در input طبیعی باشد */
export interface SpecDraft {
  key: string
  label: string
  value: string
  score: string
}

export function toSpecDrafts(specs: ProductSpec[]): SpecDraft[] {
  return specs.map((s) => ({
    key: s.key,
    label: s.label,
    value: s.value,
    score: s.score === undefined ? '' : String(s.score),
  }))
}

/** ردیف‌های ناقص (بدون کلید یا بدون مقدار) ذخیره نمی‌شوند */
export function fromSpecDrafts(drafts: SpecDraft[]): ProductSpec[] {
  return drafts
    .filter((s) => s.key.trim() && s.value.trim())
    .map((s) => {
      const score = Number(toEnDigits(s.score).trim())
      const spec: ProductSpec = {
        key: s.key.trim(),
        label: s.label.trim() || specLabel(s.key.trim()),
        value: s.value.trim(),
      }
      if (s.score.trim() && Number.isFinite(score)) spec.score = score
      return spec
    })
}

export function SpecsField({
  categorySlug,
  value,
  onChange,
  error,
}: {
  categorySlug: CategorySlug
  value: SpecDraft[]
  onChange: (specs: SpecDraft[]) => void
  error?: string
}) {
  const categoryKeys = getCategory(categorySlug)?.specKeys ?? []

  // کلیدهای دسته + کلیدهایی که محصول از قبل دارد (مثلاً بعد از عوض شدن دسته)
  // تا هیچ کلیدی از لیست انتخاب بیرون نیفتد و داده‌ی موجود گم نشود.
  const options = [...categoryKeys, ...value.map((s) => s.key).filter((k) => k && !categoryKeys.includes(k))]

  const patch = (index: number, part: Partial<SpecDraft>) =>
    onChange(value.map((spec, i) => (i === index ? { ...spec, ...part } : spec)))

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  const addRow = () => onChange([...value, { key: '', label: '', value: '', score: '' }])

  const addCategoryKeys = () => {
    const missing = categoryKeys.filter((key) => !value.some((s) => s.key === key))
    onChange([...value, ...missing.map((key) => ({ key, label: specLabel(key), value: '', score: '' }))])
  }

  const missingCount = categoryKeys.filter((key) => !value.some((s) => s.key === key)).length

  return (
    <div className="space-y-2">
      <span className="block text-[13px] font-medium">مشخصات فنی</span>

      {value.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted">
          هنوز مشخصه‌ای ثبت نشده.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((spec, i) => (
            <li key={i} className="space-y-2 rounded-2xl border border-border bg-surface-2/40 p-3">
              <div className="flex gap-2">
                <Select
                  value={options.includes(spec.key) ? spec.key : ''}
                  onChange={(e) => {
                    const key = e.target.value
                    // برچسب فقط وقتی بازنویسی می‌شود که دست‌کاری نشده باشد
                    const keepLabel = spec.label && spec.label !== specLabel(spec.key)
                    patch(i, { key, label: keepLabel ? spec.label : key ? specLabel(key) : '' })
                  }}
                  aria-label="کلید مشخصه"
                  className="h-9 flex-1 text-[12.5px]"
                >
                  <option value="">سایر…</option>
                  {options.map((key) => (
                    <option key={key} value={key}>
                      {specLabel(key)} ({key})
                    </option>
                  ))}
                </Select>

                <button
                  type="button"
                  aria-label="حذف مشخصه"
                  onClick={() => removeAt(i)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-border text-muted transition-colors hover:border-red-400 hover:text-red-500"
                >
                  <X className="size-4" />
                </button>
              </div>

              {!options.includes(spec.key) && (
                <Input
                  value={spec.key}
                  onChange={(e) => patch(i, { key: e.target.value })}
                  placeholder="کلید دلخواه (انگلیسی)"
                  dir="ltr"
                  className="h-9 text-[12.5px]"
                />
              )}

              <div className="flex gap-2">
                <Input
                  value={spec.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                  placeholder="برچسب فارسی"
                  className="h-9 flex-1 text-[12.5px]"
                />
                <Input
                  value={spec.score}
                  onChange={(e) => patch(i, { score: e.target.value })}
                  placeholder="امتیاز"
                  aria-label="مقدار عددی برای رتبه‌بندی در مقایسه"
                  inputMode="numeric"
                  className="num h-9 w-20 shrink-0 text-[12.5px]"
                />
              </div>

              <Input
                value={spec.value}
                onChange={(e) => patch(i, { value: e.target.value })}
                placeholder="مقدار — مثلاً «۸ گیگابایت»"
                className="h-9 text-[12.5px]"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          افزودن مشخصه
        </Button>
        {missingCount > 0 && (
          <Button type="button" variant="soft" size="sm" onClick={addCategoryKeys}>
            <ListPlus className="size-4" />
            افزودن مشخصه‌های این دسته
          </Button>
        )}
      </div>

      {error ? (
        <span className="block text-xs text-red-500">{error}</span>
      ) : (
        <span className="block text-xs text-muted">
          کلیدها از روی دسته‌بندی پیشنهاد می‌شوند و ستون‌های صفحه‌ی مقایسه از روی همین کلیدها ساخته می‌شود. «امتیاز»
          اختیاری است و فقط برای رتبه‌بندی عددی در مقایسه به کار می‌رود.
        </span>
      )}
    </div>
  )
}
