import type { ProductCondition } from '@/types/catalog'

/**
 * وضعیت کالا، همان‌طور که خریدار ایرانی می‌شناسدش.
 *
 * «نو» نشان نمی‌گیرد: حالت پیش‌فرض فروشگاه است و برچسب زدن به همه‌ی کالاها،
 * برچسبِ دو تای دیگر را بی‌اثر می‌کرد.
 */
export const CONDITION_LABEL: Record<ProductCondition, string> = {
  new: 'نو',
  stock: 'استوک',
  used: 'کارکرده',
}

export const CONDITION_HINT: Record<ProductCondition, string> = {
  new: 'آکبند و پلمب',
  stock: 'نو و بدون استفاده، ولی بسته‌بندی اصلی ندارد',
  used: 'دست‌دوم و کارکرده',
}

/** فهرست گزینه‌ها برای فرم پنل */
export const CONDITION_OPTIONS = (Object.keys(CONDITION_LABEL) as ProductCondition[]).map((value) => ({
  value,
  label: CONDITION_LABEL[value],
  hint: CONDITION_HINT[value],
}))

/** برچسبی که روی کارت کالا می‌نشیند؛ برای «نو» چیزی نشان داده نمی‌شود */
export const conditionBadge = (condition: ProductCondition | undefined) =>
  condition && condition !== 'new' ? CONDITION_LABEL[condition] : null
