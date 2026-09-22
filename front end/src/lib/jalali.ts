/**
 * تبدیل تاریخ شمسی ↔ میلادی روی تقویم persian خودِ Intl.
 *
 * نمایش تاریخ در کل سایت از Intl می‌آید؛ تبدیل برعکس هم روی همان بنا شده تا
 * برای کبیسه‌ها دو منبع حقیقت نداشته باشیم. همه‌چیز «تاریخ مدنی» است، بدون
 * ساعت و منطقه‌ی زمانی: محاسبه روی ظهر UTC انجام می‌شود تا تغییر ساعت یا
 * منطقه‌ی زمانی هیچ‌وقت یک روز جابه‌جایش نکند.
 */

export interface CivilDate {
  year: number
  month: number
  day: number
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

/** شنبه اول هفته است */
export const JALALI_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const DAY_MS = 86_400_000
const PERSIAN = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
})

const utcNoon = (date: CivilDate) => Date.UTC(date.year, date.month - 1, date.day, 12)

function fromUtc(ms: number): CivilDate {
  const date = new Date(ms)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

const compare = (a: CivilDate, b: CivilDate) => a.year - b.year || a.month - b.month || a.day - b.day

export function toJalali(gregorian: CivilDate): CivilDate {
  const parts = PERSIAN.formatToParts(utcNoon(gregorian))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function toGregorian(jalali: CivilDate): CivilDate {
  // حدس اول از روی حوالی نوروز (۲۰ مارس)؛ خطایش چند روز است و روز به روز اصلاح می‌شود
  const dayOfYear = (jalali.month <= 7 ? (jalali.month - 1) * 31 : 186 + (jalali.month - 7) * 30) + jalali.day - 1
  let ms = Date.UTC(jalali.year + 621, 2, 20, 12) + dayOfYear * DAY_MS
  for (let i = 0; i < 10; i++) {
    const diff = compare(toJalali(fromUtc(ms)), jalali)
    if (diff === 0) return fromUtc(ms)
    ms += diff > 0 ? -DAY_MS : DAY_MS
  }
  throw new RangeError(`تاریخ شمسی نامعتبر: ${jalali.year}/${jalali.month}/${jalali.day}`)
}

export function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31
  if (month <= 11) return 30
  // اسفند ۲۹ روز است، مگر در سال کبیسه
  const first = utcNoon(toGregorian({ year, month: 12, day: 1 }))
  return toJalali(fromUtc(first + 29 * DAY_MS)).month === 12 ? 30 : 29
}

/** روز هفته با شنبه = ۰ */
export function jalaliWeekday(date: CivilDate): number {
  return (new Date(utcNoon(toGregorian(date))).getUTCDay() + 1) % 7
}

export function addJalaliMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** «YYYY-MM-DD» یا «YYYY-MM-DDTHH:mm» به وقت محلی — همان قالب ورودی‌های تاریخ مرورگر */
export function parseLocal(value: string): (CivilDate & { hour: number; minute: number }) | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value)
  if (!match) return null
  const [, y, m, d, h = '0', min = '0'] = match
  return { year: +y, month: +m, day: +d, hour: +h, minute: +min }
}

export function formatLocal(date: CivilDate, time?: { hour: number; minute: number }): string {
  const day = `${date.year}-${pad(date.month)}-${pad(date.day)}`
  return time ? `${day}T${pad(time.hour)}:${pad(time.minute)}` : day
}
