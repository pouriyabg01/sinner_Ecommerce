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

/** شناسه و کد را از هر متنی که ادمین چسبانده بیرون می‌کشد */
export function parseEnamad(text: string): Partial<EnamadSettings> {
  const found: Partial<EnamadSettings> = {}
  const trimmed = text.trim()

  // قطعه کد کامل یا نشانی: ?id=7899252&Code=XXXX
  const id = trimmed.match(/[?&]id=(\d+)/i)?.[1]
  const code = trimmed.match(/[?&]code=([A-Za-z0-9]+)/i)?.[1] ?? trimmed.match(/\scode="([A-Za-z0-9]+)"/i)?.[1]

  if (id) found.id = id
  if (code) found.code = code

  return found
}

/** نشان فقط وقتی کشیده می‌شود که هر دو مقدار شکل درستی داشته باشند */
export function enamadReady(enamad?: EnamadSettings | null): enamad is EnamadSettings {
  return Boolean(enamad && ID_RULE.test(enamad.id.trim()) && CODE_RULE.test(enamad.code.trim()))
}
