const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** تبدیل ارقام لاتین به فارسی — برای نمایش، نه برای مقدار input */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

/**
 * ۱۲۵۰۰۰۰ → «۱,۲۵۰,۰۰۰» — از راست هر سه رقم با ویرگول جدا می‌شود.
 * بخش اعشاری اگر باشد دست‌نخورده می‌ماند و گروه‌بندی نمی‌شود.
 */
export function groupDigits(value: number | string): string {
  const [whole = '', fraction] = toEnDigits(String(value)).split('.')
  const digits = whole.replace(/\D/g, '')
  if (!digits && !fraction) return ''

  const grouped = (digits || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return toFaDigits(fraction ? `${grouped}.${fraction.replace(/\D/g, '')}` : grouped)
}

/** ۱۲۵۰۰۰۰ → «۱,۲۵۰,۰۰۰ تومان» */
export function formatPrice(value: number, withUnit = true): string {
  const grouped = groupDigits(value)
  return withUnit ? `${grouped} تومان` : grouped
}

export function formatNumber(value: number): string {
  return groupDigits(value)
}

export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round(((compareAt - price) / compareAt) * 100)
}

const FA_DATE = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
const FA_DATETIME = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const FA_DAY = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })
const FA_DAY_MONTH = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' })
const FA_WEEKDAY = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' })

/**
 * «YYYY-MM-DD» را در تایم‌زون محلی می‌خواند. بدون این، new Date() آن را UTC
 * فرض می‌کند و در تایم‌زون‌های عقب‌تر یک روز جابه‌جا نمایش داده می‌شود.
 */
function parseIso(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso)
}

export function formatDate(iso: string): string {
  return FA_DATE.format(parseIso(iso))
}

/** «۱۵» — برچسب کوتاه محور نمودار */
export function formatDay(iso: string): string {
  return FA_DAY.format(parseIso(iso))
}

/** «۱۵ شهریور» */
export function formatDayMonth(iso: string): string {
  return FA_DAY_MONTH.format(parseIso(iso))
}

/** «چهارشنبه» */
export function formatWeekday(iso: string): string {
  return FA_WEEKDAY.format(parseIso(iso))
}

/**
 * «YYYY-MM-DD» از روی تاریخِ محلی.
 * `toISOString` تاریخ را به UTC می‌برد و در تهران شب‌ها یک روز عقب می‌افتد.
 */
export function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** «YYYY-MM-DDTHH:mm» به وقت محلی، برای ورودی datetime-local — به همان دلیل toLocalIso */
export function toLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${toLocalIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDateTime(iso: string): string {
  return FA_DATETIME.format(new Date(iso))
}

/** «۳ روز پیش» */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'همین حالا'
  if (minutes < 60) return `${toFaDigits(minutes)} دقیقه پیش`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${toFaDigits(hours)} ساعت پیش`
  const days = Math.round(hours / 24)
  if (days < 30) return `${toFaDigits(days)} روز پیش`
  const months = Math.round(days / 30)
  if (months < 12) return `${toFaDigits(months)} ماه پیش`
  return `${toFaDigits(Math.round(months / 12))} سال پیش`
}

export function formatPhone(phone: string): string {
  return toFaDigits(phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3'))
}
