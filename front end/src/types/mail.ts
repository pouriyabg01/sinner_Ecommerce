/** `log` حالت آزمایشی است و ایمیلی واقعاً ارسال نمی‌شود */
export type Mailer = 'log' | 'smtp'

export const MAILER_LABEL: Record<Mailer, string> = {
  log: 'حالت آزمایشی — فقط ثبت در گزارش',
  smtp: 'سرویس ایمیل',
}

export type MailEncryption = 'tls' | 'ssl' | 'none'

export const MAIL_ENCRYPTION_LABEL: Record<MailEncryption, string> = {
  tls: 'رمزگذاری‌شده (درگاه ۵۸۷)',
  ssl: 'رمزگذاری‌شده (درگاه ۴۶۵)',
  none: 'بدون رمزگذاری',
}

/** جای‌نگه‌دارهای متن ایمیل و معنی هرکدام */
export const MAIL_PLACEHOLDER_LABEL: Record<string, string> = {
  name: 'نام مشتری',
  code: 'کد سفارش',
  total: 'مبلغ',
  tracking: 'کد رهگیری',
  link: 'لینک دکمه',
  minutes: 'مدت اعتبار لینک',
  site: 'نام سایت',
}

export interface MailEventInfo {
  key: string
  label: string
  hint: string
  placeholders: string[]
}

export interface MailSettings {
  enabled: boolean
  mailer: Mailer
  host: string
  port: number
  encryption: MailEncryption
  username: string
  /** رمز هرگز برنمی‌گردد؛ فقط اینکه ذخیره شده است یا نه */
  passwordSet: boolean
  fromAddress: string
  fromName: string
  events: Record<string, { enabled: boolean; subject: string; body: string }>
  catalog: MailEventInfo[]
}

/** رمزِ خالی یعنی «همان قبلی بماند» */
export type MailSettingsInput = Pick<
  MailSettings,
  'enabled' | 'mailer' | 'host' | 'port' | 'encryption' | 'username' | 'fromAddress' | 'fromName' | 'events'
> & { password?: string }

export interface MailLogEntry {
  id: string
  email: string
  event: string
  eventLabel: string
  subject: string
  body: string
  status: 'sent' | 'failed' | 'logged'
  mailer: string
  error: string | null
  createdAt: string
}
