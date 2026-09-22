/**
 * تنظیمات درگاه پرداخت در پنل.
 *
 * فهرست درگاه‌ها و فیلدهای هرکدام از سرور می‌آید (`GET /admin/payment-gateway`)،
 * نه از یک لیست ثابت در فرانت. برای اضافه شدن درگاه تازه فقط یک ردیف در
 * `PaymentGateways` بک‌اند لازم است و همین فرم خودش آن را نشان می‌دهد.
 */

/** یک فیلد متنی درگاه؛ `secret` یعنی مقدارش هیچ‌وقت از سرور برنمی‌گردد */
export interface GatewayField {
  key: string
  label: string
  hint: string | null
  secret: boolean
  /** کلید عمومی و گواهی چندخطی‌اند و در textarea نشان داده می‌شوند */
  multiline: boolean
}

export interface GatewayToggle {
  key: string
  label: string
  hint: string | null
}

/** فیلد چندگزینه‌ای مثل حالت زرین‌پال (عادی / تست / زرین‌گیت) */
export interface GatewayChoice {
  key: string
  label: string
  default: string
  options: { value: string; label: string }[]
}

export interface GatewayDescriptor {
  id: string
  label: string
  /** سایت ارائه‌دهنده برای گرفتن اطلاعات پذیرنده */
  site: string | null
  note: string | null
  fields: GatewayField[]
  toggles: GatewayToggle[]
  choices: GatewayChoice[]
}

/**
 * مقدارهای ذخیره‌شده‌ی یک درگاه. فیلد محرمانه همیشه خالی می‌آید و در کنارش
 * `<key>Set` می‌گوید مقداری ذخیره شده یا نه.
 */
export type GatewayCredentials = Record<string, string | boolean>

export interface PaymentGatewaySettings {
  driver: string
  credentials: Record<string, GatewayCredentials>
  /** هر درگاه همه‌ی فیلدهایش پر است یا نه */
  configured: Record<string, boolean>
  catalog: GatewayDescriptor[]
}

export interface PaymentGatewayInput {
  driver: string
  credentials: GatewayCredentials
}
