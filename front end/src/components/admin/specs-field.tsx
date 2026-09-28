'use client'

import { Plus, X } from 'lucide-react'
import type { CategorySlug, ProductSpec } from '@/types/catalog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCategories } from '@/lib/api/queries'
import { specKeysFor, specLabel } from '@/lib/specs'
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

/**
 * مشخصات فنی کالا، در دو بخش.
 *
 * بالا کلیدهایی که خودِ دسته‌بندی (و مادرهایش) تعریف کرده‌اند، آماده و
 * ردیف‌به‌ردیف، تا فقط مقدارشان نوشته شود. پیش از این باید هر کلید را از یک
 * فهرست بازشونده پیدا می‌کردی و آن فهرست هم از داده‌ی واقعی پر نمی‌شد، پس
 * عملاً همیشه «سایر» می‌ماند.
 */
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
  const { data: categories } = useCategories()
  const keys = specKeysFor(categories ?? [], categorySlug)

  /** ردیف یک کلیدِ دسته را می‌سازد یا به‌روز می‌کند */
  const setFor = (key: string, part: Partial<SpecDraft>) => {
    const index = value.findIndex((spec) => spec.key === key)
    if (index >= 0) return onChange(value.map((spec, i) => (i === index ? { ...spec, ...part } : spec)))

    /*
     * ردیف تازه سرِ جای خودش می‌نشیند نه ته فهرست، تا ترتیب مشخصاتِ ذخیره‌شده
     * همان ترتیب کلیدهای دسته بماند — جدول صفحه‌ی کالا و ستون‌های مقایسه از
     * همین ترتیب می‌آیند.
     */
    const order = keys.indexOf(key)
    const at = value.findIndex((spec) => {
      const other = keys.indexOf(spec.key)
      return other === -1 || other > order
    })

    const row: SpecDraft = { key, label: specLabel(key), value: '', score: '', ...part }
    const next = [...value]
    if (at === -1) next.push(row)
    else next.splice(at, 0, row)
    onChange(next)
  }

  // هر چه کلیدِ این دسته نیست: مشخصه‌ی دستی، یا بازمانده‌ی دسته‌ی قبلیِ کالا
  const extras = value
    .map((spec, index) => ({ spec, index }))
    .filter(({ spec }) => !keys.includes(spec.key))

  const patch = (index: number, part: Partial<SpecDraft>) =>
    onChange(value.map((spec, i) => (i === index ? { ...spec, ...part } : spec)))

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  const addRow = () => onChange([...value, { key: '', label: '', value: '', score: '' }])

  return (
    <div className="space-y-3">
      <span className="block text-[13px] font-medium">مشخصات فنی</span>

      {keys.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-border bg-surface-2/40 p-3">
          <p className="text-[11px] text-muted">
            مشخصه‌های این دسته‌بندی. هرکدام را خالی بگذاری، برای این کالا ثبت نمی‌شود.
          </p>
          <ul className="space-y-2.5">
            {keys.map((key) => {
              const row = value.find((spec) => spec.key === key)
              const label = specLabel(key)
              return (
                /* برچسب بالای کادر، نه کنارش: کلیدهای دسته‌ها عبارت‌های بلندی‌اند و در یک خط بریده می‌شدند */
                <li key={key} className="space-y-1">
                  <span className="block text-[12px] leading-5 text-muted">{label}</span>
                  <div className="flex gap-2">
                    <Input
                      value={row?.value ?? ''}
                      onChange={(e) => setFor(key, { value: e.target.value })}
                      placeholder="مقدار"
                      aria-label={label}
                      className="h-9 flex-1 text-[12.5px]"
                    />
                    <Input
                      value={row?.score ?? ''}
                      onChange={(e) => setFor(key, { score: e.target.value })}
                      placeholder="امتیاز"
                      aria-label={`امتیاز عددی ${label}`}
                      inputMode="numeric"
                      className="num h-9 w-16 shrink-0 text-[12.5px]"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs leading-6 text-muted">
          {categorySlug
            ? 'برای این دسته‌بندی کلید مشخصاتی تعریف نشده. در «دسته‌بندی و برند» کلیدها را برای دسته بنویس تا اینجا آماده بیایند.'
            : 'اول دسته‌بندی کالا را انتخاب کن تا مشخصه‌های همان دسته اینجا بیایند.'}
        </p>
      )}

      {extras.length > 0 && (
        <ul className="space-y-2">
          {extras.map(({ spec, index }) => (
            <li key={index} className="space-y-2 rounded-2xl border border-border p-3">
              <div className="flex gap-2">
                <Input
                  value={spec.key}
                  onChange={(e) => patch(index, { key: e.target.value })}
                  placeholder="کلید"
                  aria-label="کلید مشخصه"
                  className="h-9 flex-1 text-[12.5px]"
                />
                <button
                  type="button"
                  aria-label="حذف مشخصه"
                  onClick={() => removeAt(index)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-border text-muted transition-colors hover:border-red-400 hover:text-red-500"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <Input
                  value={spec.label}
                  onChange={(e) => patch(index, { label: e.target.value })}
                  placeholder="برچسب نمایشی"
                  className="h-9 flex-1 text-[12.5px]"
                />
                <Input
                  value={spec.score}
                  onChange={(e) => patch(index, { score: e.target.value })}
                  placeholder="امتیاز"
                  aria-label="مقدار عددی برای رتبه‌بندی در مقایسه"
                  inputMode="numeric"
                  className="num h-9 w-16 shrink-0 text-[12.5px]"
                />
              </div>

              <Input
                value={spec.value}
                onChange={(e) => patch(index, { value: e.target.value })}
                placeholder="مقدار"
                className="h-9 text-[12.5px]"
              />
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="size-4" />
        مشخصه‌ی دلخواه
      </Button>

      {error ? (
        <span className="block text-xs text-red-500">{error}</span>
      ) : (
        <span className="block text-xs leading-6 text-muted">
          کلیدهای بالا از دسته‌بندی کالا و مادرهایش می‌آیند و ستون‌های صفحه‌ی مقایسه از روی همین‌ها ساخته می‌شود.
          «امتیاز» اختیاری است و فقط برای رتبه‌بندی عددی در مقایسه به کار می‌رود.
        </span>
      )}
    </div>
  )
}
