import type { Category } from '@/types/catalog'

/**
 * برچسب فارسی پیش‌فرض کلیدهای انگلیسیِ قدیمی.
 *
 * کلیدهای تازه را ادمین خودش در «دسته‌بندی و برند» می‌نویسد و معمولاً فارسی‌اند،
 * پس این نگاشت فقط برای کلیدهایی است که از قبل مانده‌اند؛ هر کلید ناشناخته
 * خودش برچسب خودش است.
 */
const SPEC_LABELS: Record<string, string> = {
  display: 'نمایشگر',
  chipset: 'پردازنده',
  cpu: 'پردازنده',
  gpu: 'گرافیک',
  ram: 'حافظه رم',
  storage: 'حافظه',
  battery: 'باتری',
  camera: 'دوربین اصلی',
  weight: 'وزن',
  resolution: 'رزولوشن',
  fps: 'نرخ فریم',
  controllers: 'دسته همراه',
  platform: 'پلتفرم',
  genre: 'سبک',
  players: 'تعداد بازیکن',
  language: 'زبان',
  type: 'نوع',
  connection: 'اتصال',
}

export function specLabel(key: string) {
  return SPEC_LABELS[key] ?? key
}

type SpecSource = Pick<Category, 'id' | 'slug' | 'specKeys'> & { parentId?: string | null }

/**
 * کلیدهای مشخصات یک دسته، به‌همراه آنچه از مادرهایش به ارث می‌برد.
 *
 * درخت چند سطحی است و کلیدها معمولاً بالای شاخه تعریف می‌شوند؛ بدون ارث،
 * کالای یک زیرشاخه‌ی عمیق هیچ مشخصه‌ی آماده‌ای نمی‌گرفت. ترتیب از ریشه به
 * پایین است — عمومی‌ها اول — و کلید تکراری یک بار می‌آید.
 */
export function specKeysFor(categories: SpecSource[], slug: string): string[] {
  const byId = new Map(categories.map((category) => [category.id, category]))

  const trail: SpecSource[] = []
  const seen = new Set<string>()
  for (
    let node = categories.find((category) => category.slug === slug);
    node && !seen.has(node.id);
    node = node.parentId ? byId.get(node.parentId) : undefined
  ) {
    seen.add(node.id)
    trail.unshift(node)
  }

  const keys: string[] = []
  for (const node of trail) {
    for (const key of node.specKeys) {
      if (key && !keys.includes(key)) keys.push(key)
    }
  }

  return keys
}
