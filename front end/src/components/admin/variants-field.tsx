'use client'

import { Plus, X } from 'lucide-react'
import type { ProductVariant } from '@/types/catalog'
import { Input, PriceInput } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatPrice, toEnDigits, toFaDigits } from '@/lib/format'
import { uid } from '@/lib/utils'

/**
 * نسخه‌ی قابل‌ویرایش `ProductVariant`؛ عدد‌ها رشته می‌مانند تا تایپ‌کردن در
 * input طبیعی باشد و فیلد نیمه‌خالی وسط تایپ به صفر تبدیل نشود.
 */
export interface VariantDraft {
  id: string
  title: string
  colorName: string
  colorHex: string
  price: string
  stock: string
}

const DEFAULT_HEX = '#8d8f93'

export const emptyVariant = (): VariantDraft => ({
  id: uid('v'),
  title: '',
  colorName: '',
  colorHex: DEFAULT_HEX,
  price: '',
  stock: '',
})

export function toVariantDrafts(variants: ProductVariant[]): VariantDraft[] {
  return variants.map((v) => ({
    id: v.id,
    title: v.title,
    colorName: v.color?.name ?? '',
    colorHex: v.color?.hex ?? DEFAULT_HEX,
    price: String(v.price),
    stock: String(v.stock),
  }))
}

/** ردیف بی‌عنوان ذخیره نمی‌شود؛ کاربر افزوده و هنوز پرش نکرده */
export function fromVariantDrafts(drafts: VariantDraft[]): ProductVariant[] {
  return drafts
    .filter((v) => v.title.trim())
    .map((v) => {
      const variant: ProductVariant = {
        id: v.id,
        title: v.title.trim(),
        price: Number(toEnDigits(v.price)) || 0,
        stock: Number(toEnDigits(v.stock)) || 0,
      }
      if (v.colorName.trim()) variant.color = { name: v.colorName.trim(), hex: v.colorHex }
      return variant
    })
}

/**
 * قیمت و موجودیِ خودِ کالا از variantها ساخته می‌شود: ارزان‌ترین variant قیمتِ
 * «از» است و مجموع موجودی‌ها موجودی کل. داده‌ی موجود هم دقیقاً همین قاعده را
 * دارد، پس با این هیچ‌وقت قیمت کارت با قیمت صفحه‌ی محصول ناهماهنگ نمی‌شود.
 */
export function derivePricing(variants: ProductVariant[]) {
  if (!variants.length) return { price: 0, stock: 0 }
  return {
    price: Math.min(...variants.map((v) => v.price)),
    stock: variants.reduce((sum, v) => sum + v.stock, 0),
  }
}

export function VariantsField({
  value,
  onChange,
  error,
}: {
  value: VariantDraft[]
  onChange: (variants: VariantDraft[]) => void
  error?: string
}) {
  const patch = (index: number, part: Partial<VariantDraft>) =>
    onChange(value.map((variant, i) => (i === index ? { ...variant, ...part } : variant)))

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  const totals = derivePricing(fromVariantDrafts(value))

  return (
    <div className="space-y-2">
      <span className="block text-[13px] font-medium">مدل‌های کالا</span>

      {value.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted">
          هر کالا دست‌کم یک مدل لازم دارد — قیمت و موجودی از همین‌جا خوانده می‌شود.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((variant, i) => (
            <li key={variant.id} className="space-y-2 rounded-2xl border border-border bg-surface-2/40 p-3">
              <div className="flex gap-2">
                <Input
                  value={variant.title}
                  onChange={(e) => patch(i, { title: e.target.value })}
                  placeholder="عنوان مدل — مثلاً «۲۵۶ گیگابایت — مشکی»"
                  className="h-9 flex-1 text-[12.5px]"
                />
                <button
                  type="button"
                  aria-label="حذف مدل"
                  onClick={() => removeAt(i)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-border text-muted transition-colors hover:border-red-400 hover:text-red-500"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/*
                برچسب بالای این دو، نه فقط placeholder: با پر شدن فیلد، placeholder
                می‌رفت و «موجودی» شبیه یک جعبه‌ی عددی بی‌نام می‌شد و پیدا نمی‌شد.
              */}
              <div className="flex gap-2">
                <label className="flex-1 space-y-1">
                  <span className="block text-[11px] text-muted">قیمت (تومان)</span>
                  <PriceInput
                    value={variant.price}
                    onChange={(price) => patch(i, { price })}
                    aria-label="قیمت این مدل"
                    placeholder="قیمت (تومان)"
                    className="h-9 w-full text-[12.5px]"
                  />
                </label>
                <label className="w-28 shrink-0 space-y-1">
                  <span className="block text-[11px] text-muted">موجودی (عدد)</span>
                  <Input
                    value={variant.stock}
                    onChange={(e) => patch(i, { stock: e.target.value })}
                    aria-label="موجودی این مدل"
                    placeholder="۰"
                    inputMode="numeric"
                    className="num h-9 w-full text-[12.5px]"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <Input
                  value={variant.colorName}
                  onChange={(e) => patch(i, { colorName: e.target.value })}
                  placeholder="نام رنگ (اختیاری)"
                  className="h-9 flex-1 text-[12.5px]"
                />
                <input
                  type="color"
                  value={variant.colorHex}
                  onChange={(e) => patch(i, { colorHex: e.target.value })}
                  aria-label="رنگ این مدل"
                  className="h-9 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-surface p-1"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, emptyVariant()])}>
        <Plus className="size-4" />
        افزودن مدل
      </Button>

      {error ? (
        <span role="alert" className="block text-xs text-red-500">
          {error}
        </span>
      ) : (
        <span className="block text-xs text-muted">
          قیمت کالا از ارزان‌ترین مدل و موجودی کل از جمع مدل‌ها ساخته می‌شود
          {totals.price > 0 && ` — الان «از ${formatPrice(totals.price)}» با ${toFaDigits(totals.stock)} عدد موجودی`}.
        </span>
      )}
    </div>
  )
}
