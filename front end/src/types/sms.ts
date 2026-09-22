/** سرویس‌های پیامک؛ `log` حالت آزمایشی است و پیامکی واقعاً ارسال نمی‌شود */
export type SmsProvider = 'log' | 'kavenegar' | 'smsir' | 'melipayamak' | 'ghasedak'

export const SMS_PROVIDER_LABEL: Record<SmsProvider, string> = {
  log: 'حالت آزمایشی — فقط ثبت در گزارش',
  kavenegar: 'کاوه‌نگار',
  smsir: 'اس‌ام‌اس دات آی‌آر',
  melipayamak: 'ملی‌پیامک',
  ghasedak: 'قاصدک',
}

/** جای‌نگه‌دارهای متن پیامک و معنی هرکدام */
export const SMS_PLACEHOLDER_LABEL: Record<string, string> = {
  name: 'نام مشتری',
  code: 'کد',
  total: 'مبلغ',
  tracking: 'کد رهگیری',
  cost: 'هزینه',
  warranty: 'روزهای گارانتی',
  product: 'نام کالا',
  link: 'لینک کالا',
  site: 'نام سایت',
}

export interface SmsEventInfo {
  key: string
  label: string
  hint: string
  placeholders: string[]
}

export interface SmsSettings {
  enabled: boolean
  provider: SmsProvider
  sender: string
  username: string
  /** کلید و رمز هرگز برنمی‌گردند؛ فقط اینکه ذخیره شده‌اند یا نه */
  apiKeySet: boolean
  passwordSet: boolean
  events: Record<string, { enabled: boolean; template: string }>
  catalog: SmsEventInfo[]
}

/** کلید یا رمزِ خالی یعنی «همان قبلی بماند» */
export type SmsSettingsInput = Pick<SmsSettings, 'enabled' | 'provider' | 'sender' | 'username' | 'events'> & {
  apiKey?: string
  password?: string
}

export interface SmsLogEntry {
  id: string
  phone: string
  event: string
  eventLabel: string
  message: string
  status: 'sent' | 'failed' | 'logged'
  provider: string
  error: string | null
  createdAt: string
}
