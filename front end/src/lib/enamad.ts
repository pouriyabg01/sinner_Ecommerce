/**
 * نماد اعتماد الکترونیکی.
 *
 * سامانه‌ی نماد به هر فروشگاه یک قطعه کدِ HTML می‌دهد که دو مقدار مهم دارد:
 * شناسه و کد. تایپ دستیِ آن کدِ سی‌ودو حرفی راه خوبی برای اشتباه کردن است،
 * پس هر چیزی که ادمین بچسباند — قطعه کد کامل، فقط نشانی، یا خودِ مقدار —
 * همین‌جا خوانده می‌شود.
 */
export interface EnamadSettings {
  id: string
  code: string
}

/**
 * مقداری که پیش از این در کد نوشته شده بود.
 *
 * تا وقتی ادمین در «تنظیمات» چیزی ذخیره نکرده، همین نشان داده می‌شود؛ وگرنه
 * با اولین استقرار، نشانِ سایت از فوتر ناپدید می‌شد.
 */
export const ENAMAD_FALLBACK: EnamadSettings = {
  id: '7899252',
  code: '1OQmy8ahl2OtwIv4ie9gdR2akSNEdL3B',
}

const ID_RULE = /^\d{4,12}$/
const CODE_RULE = /^[A-Za-z0-9]{8,64}$/

/*
 * `amp;` هم پذیرفته می‌شود: متنی که از یک صفحه‌ی رندرشده کپی شود `&` را
 * به‌صورت `&amp;` دارد و بدون این، مقدار دومِ نشانی از دست می‌رفت.
 */
const FROM_URL = (key: string) => new RegExp(`[?&](?:amp;)?${key}=([A-Za-z0-9]+)`, 'i')

/*
 * ویژگی `code` روی تگ تصویر، چه با تک‌کوتیشن چه دوتایی چه بدون کوتیشن.
 * قطعه کدی که سامانه‌ی نماد می‌دهد تک‌کوتیشن است.
 */
const FROM_ATTR = /\bcode\s*=\s*["']?([A-Za-z0-9]{8,})["']?/i

/** شناسه و کد را از هر متنی که ادمین چسبانده بیرون می‌کشد */
export function parseEnamad(text: string): Partial<EnamadSettings> {
  const found: Partial<EnamadSettings> = {}
  const trimmed = text.trim()

  const id = trimmed.match(FROM_URL('id'))?.[1]
  const code = trimmed.match(FROM_URL('code'))?.[1] ?? trimmed.match(FROM_ATTR)?.[1]

  if (id && /^\d+$/.test(id)) found.id = id
  if (code) found.code = code

  return found
}

/** نشان فقط وقتی کشیده می‌شود که هر دو مقدار شکل درستی داشته باشند */
export function enamadReady(enamad?: EnamadSettings | null): enamad is EnamadSettings {
  return Boolean(enamad && ID_RULE.test(enamad.id.trim()) && CODE_RULE.test(enamad.code.trim()))
}
