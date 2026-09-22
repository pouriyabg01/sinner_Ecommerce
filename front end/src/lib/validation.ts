import { z } from 'zod'
import { formatNumber, toEnDigits, toFaDigits } from '@/lib/format'

/**
 * قواعد اعتبارسنجی مشترک همه‌ی فرم‌ها، با پیام فارسی.
 *
 * کاربر ممکن است ارقام را فارسی تایپ کند («۰۹۱۲…»)، پس هر فیلد عددی اول
 * با `toEnDigits` نرمال می‌شود و بعد بررسی. مقدارِ پاک‌شده هم همان چیزی است
 * که به API می‌رود، نه رشته‌ی خام ورودی.
 */

/** فاصله‌ی اضافی و ارقام فارسی را می‌گیرد */
const normalizeDigits = (value: string) => toEnDigits(value).trim()

/** جداکننده‌های رایجی که کاربر داخل شماره می‌گذارد: «۰۹۱۲ ۱۲۳ ۴۵۶۷» یا «0912-123-4567» */
const stripSeparators = (value: string) => normalizeDigits(value).replace(/[\s\-()]/g, '')

export const REQUIRED = 'این فیلد الزامی است'

/** تعداد کلمه‌های یک متن؛ فاصله‌های پشت‌سرهم و نیم‌فاصله درست شمرده می‌شوند */
export const wordCount = (value: string) =>
  value.trim().split(/[\s\u200c]+/).filter(Boolean).length

/* --------------------------------- متن‌ها --------------------------------- */

export const requiredText = (label: string, min = 3) =>
  z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: `${label} الزامی است` })
    .refine((v) => v.length === 0 || v.length >= min, {
      message: `${label} باید حداقل ${toFaDigits(min)} حرف باشد`,
    })

export const optionalText = (max = 200, label = 'این فیلد') =>
  z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length <= max, { message: `${label} نباید بیشتر از ${toFaDigits(max)} حرف باشد` })

/* --------------------------------- شماره‌ها -------------------------------- */

/** موبایل ایران: دقیقاً ۱۱ رقم و شروع با ۰۹ */
export const mobileSchema = z
  .string()
  .transform(stripSeparators)
  .refine((v) => v.length > 0, { message: 'شماره موبایل الزامی است' })
  .refine((v) => /^\d+$/.test(v), { message: 'شماره موبایل باید فقط شامل عدد باشد' })
  .refine((v) => v.length === 11, { message: 'شماره موبایل باید دقیقاً ۱۱ رقم باشد' })
  .refine((v) => v.startsWith('09'), { message: 'شماره موبایل باید با ۰۹ شروع شود' })

export const optionalMobileSchema = z
  .string()
  .transform(stripSeparators)
  .refine((v) => v === '' || /^09\d{9}$/.test(v), {
    message: 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود',
  })

/** تلفن تماس سایت: ثابت یا موبایل — ۸ تا ۱۱ رقم */
export const phoneSchema = z
  .string()
  .transform(stripSeparators)
  .refine((v) => v.length > 0, { message: 'شماره تماس الزامی است' })
  .refine((v) => /^\d+$/.test(v), { message: 'شماره تماس باید فقط شامل عدد باشد' })
  .refine((v) => v.length >= 8 && v.length <= 11, { message: 'شماره تماس باید بین ۸ تا ۱۱ رقم باشد' })

/** کد پستی ایران: دقیقاً ۱۰ رقم */
export const postalCodeSchema = z
  .string()
  .transform(stripSeparators)
  .refine((v) => v.length > 0, { message: 'کد پستی الزامی است' })
  .refine((v) => /^\d{10}$/.test(v), { message: 'کد پستی باید دقیقاً ۱۰ رقم باشد' })

/* --------------------------------- ایمیل ---------------------------------- */

export const emailSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: 'ایمیل الزامی است' })
  .refine((v) => z.email().safeParse(v).success, { message: 'ایمیل واردشده معتبر نیست — مانند name@example.com' })

export const optionalEmailSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === '' || z.email().safeParse(v).success, {
    message: 'ایمیل واردشده معتبر نیست — مانند name@example.com',
  })

/* --------------------------------- عددها ---------------------------------- */

/** رشته‌ی عددی فرم را به number تبدیل می‌کند؛ جداکننده‌ی هزارگان هم قبول است */
const toNumber = (value: string) => {
  const clean = normalizeDigits(value).replace(/[,٬\s]/g, '')
  return clean === '' ? NaN : Number(clean)
}

export const amountSchema = ({
  label,
  min = 1,
  max = 100_000_000_000,
  required = true,
}: {
  label: string
  min?: number
  max?: number
  required?: boolean
}) =>
  z
    .string()
    .transform((v) => normalizeDigits(v))
    .superRefine((raw, ctx) => {
      if (raw === '') {
        if (required) ctx.addIssue({ code: 'custom', message: `${label} الزامی است` })
        return
      }
      const value = toNumber(raw)
      if (Number.isNaN(value)) {
        ctx.addIssue({ code: 'custom', message: `${label} باید عدد باشد` })
        return
      }
      if (!Number.isInteger(value)) {
        ctx.addIssue({ code: 'custom', message: `${label} باید عدد صحیح باشد` })
        return
      }
      if (value < min) ctx.addIssue({ code: 'custom', message: `${label} نباید کمتر از ${formatNumber(min)} باشد` })
      if (value > max) ctx.addIssue({ code: 'custom', message: `${label} نباید بیشتر از ${formatNumber(max)} باشد` })
    })
    .transform((raw) => (raw === '' ? null : toNumber(raw)))

/* ---------------------------------- سایر ---------------------------------- */

/** اسلاگ آدرس: فقط حروف کوچک لاتین، عدد و خط تیره */
export const slugSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), {
    message: 'اسلاگ باید فقط شامل حروف کوچک انگلیسی، عدد و خط تیره باشد — مانند iphone-16-pro',
  })

/** کد تخفیف: حروف بزرگ لاتین و عدد، ۳ تا ۲۰ حرف */
export const discountCodeSchema = z
  .string()
  .transform((v) => normalizeDigits(v).toUpperCase())
  .refine((v) => v.length > 0, { message: 'کد تخفیف الزامی است' })
  .refine((v) => /^[A-Z0-9]+$/.test(v), { message: 'کد باید فقط شامل حروف انگلیسی و عدد باشد — بدون فاصله' })
  .refine((v) => v.length >= 3 && v.length <= 20, { message: 'کد باید بین ۳ تا ۲۰ حرف باشد' })

/** آدرس اینترنتی کامل یا مسیر داخلی سایت */
export const linkSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\/.+\..+/.test(v), {
    message: 'لینک باید با / شروع شود یا یک آدرس کامل http(s) باشد',
  })

/** آدرس پستی: به‌اندازه‌ی کافی دقیق باشد که پیک پیدا کند */
export const addressSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: 'آدرس الزامی است' })
  .refine((v) => v.length >= 10, { message: 'آدرس واردشده کوتاه است — لطفاً استان، شهر، خیابان و پلاک را وارد کنید' })

/** تاریخ ISO (`yyyy-mm-dd`) که در گذشته نباشد */
export const futureDateSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), { message: 'تاریخ معتبر نیست' })
  .refine(
    (v) => {
      if (v === '') return true
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(v) >= today
    },
    { message: 'تاریخ نمی‌تواند در گذشته باشد' },
  )

/** منبع تصویر: مسیر داخلی، آدرس کامل، یا data URL آپلود شده */
export const imageSourceSchema = z
  .string()
  .transform((v) => v.trim())
  .refine(
    (v) => v === '' || v.startsWith('/') || /^https?:\/\/.+/.test(v) || v.startsWith('data:image/'),
    { message: 'مسیر تصویر باید با / شروع شود یا یک آدرس کامل http(s) باشد' },
  )

/**
 * ردیف‌های مشخصات فنی محصول.
 * ردیف کاملاً خالی نادیده گرفته می‌شود (کاربر افزوده و هنوز پر نکرده) ولی ردیف
 * نیمه‌پر، کلید بدفرم یا کلید تکراری باید قبل از ذخیره اصلاح شود؛ صفحه‌ی مقایسه
 * ستون‌هایش را از روی همین کلیدها می‌سازد و کلید تکراری آن را خراب می‌کند.
 */
export const productSpecsSchema = z
  .array(z.object({ key: z.string(), label: z.string(), value: z.string(), score: z.string() }))
  .superRefine((rows, ctx) => {
    const seen = new Set<string>()

    rows.forEach((row, i) => {
      const key = row.key.trim()
      const value = row.value.trim()
      const at = `ردیف ${toFaDigits(i + 1)}`

      if (!key && !value) return
      if (!key) return ctx.addIssue({ code: 'custom', message: `${at}: کلید مشخصه انتخاب نشده است` })
      if (!/^[a-z][a-z0-9_-]*$/.test(key))
        return ctx.addIssue({ code: 'custom', message: `${at}: کلید باید با حروف کوچک انگلیسی باشد — مانند ram` })
      if (!value) return ctx.addIssue({ code: 'custom', message: `${at}: مقدار مشخصه خالی است` })
      if (seen.has(key)) return ctx.addIssue({ code: 'custom', message: `${at}: کلید «${key}» تکراری است` })
      seen.add(key)

      if (row.score.trim() && Number.isNaN(toNumber(row.score)))
        ctx.addIssue({ code: 'custom', message: `${at}: امتیاز باید عدد باشد` })
    })
  })

/**
 * مدل‌های کالا. قیمت و موجودیِ خودِ کالا از همین‌ها ساخته می‌شود، پس ردیف
 * بی‌قیمت یعنی کالایی که در فروشگاه صفر تومان می‌افتد — باید جلویش گرفته شود.
 * ردیف کاملاً خالی نادیده گرفته می‌شود (کاربر افزوده و هنوز پر نکرده).
 */
export const productVariantsSchema = z
  .array(
    z.object({
      id: z.string(),
      title: z.string(),
      colorName: z.string(),
      colorHex: z.string(),
      price: z.string(),
      stock: z.string(),
    }),
  )
  .superRefine((rows, ctx) => {
    const filled = rows.filter((row) => row.title.trim() || row.price.trim() || row.stock.trim())

    if (!filled.length) {
      ctx.addIssue({ code: 'custom', message: 'دست‌کم یک مدل کالا لازم است' })
      return
    }

    const seen = new Set<string>()

    filled.forEach((row) => {
      const title = row.title.trim()
      const at = `مدل «${title || 'بی‌نام'}»`

      if (!title) return ctx.addIssue({ code: 'custom', message: 'عنوان یکی از مدل‌ها خالی است' })

      const key = title.toLowerCase()
      if (seen.has(key)) ctx.addIssue({ code: 'custom', message: `${at}: عنوان تکراری است` })
      seen.add(key)

      const price = toNumber(row.price)
      if (!row.price.trim() || Number.isNaN(price))
        return ctx.addIssue({ code: 'custom', message: `${at}: قیمت وارد نشده است` })
      if (price < 1_000) ctx.addIssue({ code: 'custom', message: `${at}: قیمت نمی‌تواند کمتر از ۱۰۰۰ تومان باشد` })

      const stock = toNumber(row.stock)
      if (row.stock.trim() && (Number.isNaN(stock) || stock < 0))
        ctx.addIssue({ code: 'custom', message: `${at}: موجودی باید عدد صفر یا بیشتر باشد` })
    })
  })

/* ------------------------------ کمکی فرم‌ها ------------------------------- */

/**
 * سنجش یک فیلد تکی، بیرون از چرخه‌ی submit — برای فرم‌هایی مثل ویرایشگر
 * ظاهر سایت که هر تغییر بلافاصله در پیش‌نویس می‌نشیند و لحظه‌ای بازخورد لازم دارند.
 * اگر مقدار درست باشد `undefined` برمی‌گرداند تا مستقیم به prop `error` برود.
 */
export function checkField(schema: z.ZodType, value: unknown): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

export type FieldErrors = Record<string, string>

/** اولین خطای هر فیلد؛ همان چیزی که زیر ورودی نشان داده می‌شود */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!result[key]) result[key] = issue.message
  }
  return result
}
