import type { PaymentMethodId } from '@/types/order'
import type { PickupMethod } from '@/types/repair'

/**
 * لندینگ‌پیج داده‌محور است: پنل ادمین همین ساختار را ویرایش می‌کند و
 * صفحه‌ی اصلی روی آرایه‌ی سکشن‌ها map می‌زند. هیچ JSX ثابتی در لندینگ نیست.
 */
export type SectionType =
  | 'hero_slider'
  | 'features_bar'
  | 'category_grid'
  | 'product_carousel'
  | 'banner_duo'
  | 'countdown_deal'
  | 'repair_cta'
  | 'brand_strip'
  | 'testimonials'
  | 'rich_text'
  | 'newsletter'

export interface SlideItem {
  id: string
  title: string
  subtitle: string
  /** تصویر نمای لپ‌تاپ و دسکتاپ (عریض) */
  image: string
  /** تصویر نمای گوشی؛ خالی یعنی در گوشی هم همان تصویر عریض بریده و نمایش داده می‌شود */
  mobileImage?: string
  ctaLabel: string
  ctaHref: string
  /** رنگ غالب اسلاید برای پس‌زمینه‌ی گرادیانی */
  accent: string
}

export type BannerPattern = 'none' | 'rings' | 'dots' | 'grid' | 'diagonal' | 'waves'

export interface BannerItem {
  id: string
  title: string
  subtitle: string
  image: string
  href: string
  /** رنگ خط بالای عنوان و رنگ الگوی پس‌زمینه */
  accent: string
  /** متن دکمه؛ خالی یعنی «مشاهده» */
  ctaLabel?: string
  /**
   * پس‌زمینه: تصویر، یا رنگ + الگو. بنرهای ذخیره‌شده‌ی قبلی این فیلدها را
   * ندارند و «تصویر» فرض می‌شوند، پس بی‌تغییر همان‌طور دیده می‌شوند.
   */
  backgroundType?: 'image' | 'pattern'
  /** خالی یعنی رنگی ساخته‌شده از رنگ تأکید، به سبک بنرهای قبلی */
  backgroundColor?: string
  pattern?: BannerPattern
}

export interface FeatureItem {
  id: string
  icon: string
  title: string
  subtitle: string
}

export interface TestimonialItem {
  id: string
  name: string
  role: string
  avatar: string | null
  body: string
  rating: number
}

export type SectionProps = {
  hero_slider: { slides: SlideItem[]; autoplayMs: number; showThumbnails: boolean }
  features_bar: { items: FeatureItem[] }
  category_grid: { title: string; categorySlugs: string[] }
  product_carousel: {
    title: string
    /** منبع محصولات: تگ، دسته، یا لیست دستی */
    source: 'featured' | 'newest' | 'discounted' | 'category' | 'manual'
    categorySlug?: string
    productIds?: string[]
    limit: number
    href?: string
  }
  banner_duo: { banners: BannerItem[] }
  countdown_deal: { title: string; productId: string; endsAt: string; note: string }
  repair_cta: { title: string; subtitle: string; bullets: string[]; ctaLabel: string; ctaHref: string; image: string }
  brand_strip: { title: string; brandSlugs: string[] }
  testimonials: { title: string; items: TestimonialItem[] }
  rich_text: { title: string; html: string }
  newsletter: { title: string; subtitle: string; placeholder: string; ctaLabel: string }
}

export type Section = {
  [K in SectionType]: {
    id: string
    type: K
    /** غیرفعال‌سازی بدون حذف — ادمین می‌تواند سکشن را خاموش کند */
    enabled: boolean
    /** فاصله‌ی عمودی سکشن */
    spacing: 'none' | 'sm' | 'md' | 'lg'
    background: 'default' | 'surface' | 'brand' | 'ink'
    props: SectionProps[K]
  }
}[SectionType]

export interface ThemeSettings {
  brandHue: string
  emberHue: string
  radius: 'sharp' | 'soft' | 'round'
  darkMode: 'light' | 'dark' | 'system'
}

/* ----------------------------------- فوتر ---------------------------------- */

export interface FooterBadge {
  id: string
  /** نام آیکون از `iconMap` */
  icon: string
  title: string
  text: string
}

export interface FooterLink {
  id: string
  label: string
  href: string
}

/**
 * ستون دستی را ادمین لینک‌به‌لینک می‌سازد؛ ستون خودکار لینک‌هایش را از داده‌ی
 * سایت می‌گیرد تا با اضافه یا حذف شدن دسته‌بندی یا خدمات تعمیر، فوتر خودش به‌روز شود.
 */
export type FooterColumnSource = 'manual' | 'categories' | 'services'

export const FOOTER_SOURCE_LABEL: Record<Exclude<FooterColumnSource, 'manual'>, string> = {
  categories: 'دسته‌بندی‌ها',
  services: 'خدمات تعمیر',
}

export interface FooterColumn {
  id: string
  title: string
  /** نبودنش یعنی دستی — داده‌ی قدیمی این فیلد را ندارد */
  source?: FooterColumnSource
  /** در ستون خودکار خالی است و نادیده گرفته می‌شود */
  links: FooterLink[]
}

/**
 * محتوای فوتر؛ کنار بقیه‌ی تنظیمات سایت می‌نشیند چون فوتر همان‌جا آدرس، تلفن و
 * شبکه‌های اجتماعی را هم می‌خواند و نباید برای یک بخش دو درخواست جدا بزند.
 */
export interface FooterConfig {
  description: string
  badges: { enabled: boolean; items: FooterBadge[] }
  columns: FooterColumn[]
}

/* --------------------------------- پرداخت --------------------------------- */

/**
 * شناسه‌ی درگاه از سرور می‌آید و اینجا ثابت نیست: فهرست درگاه‌ها و فیلدهایشان
 * در بک‌اند (`PaymentGateways`) تعریف شده و پنل فرم را از روی همان می‌سازد،
 * پس اضافه شدن درگاه تازه هیچ تغییری در فرانت نمی‌خواهد.
 */
export type PaymentGatewayId = string

/** یک روش پرداخت در صفحه‌ی تسویه؛ برچسب، توضیح و کف/سقف مبلغ از پنل تغییر می‌کند */
export interface PaymentMethodSetting {
  id: PaymentMethodId
  enabled: boolean
  label: string
  hint: string
  /** کف و سقف مبلغ سفارش برای این روش — صفر یعنی بدون محدودیت */
  minTotal: number
  maxTotal: number
}

/** نتیجه‌ای که درگاه دمو برمی‌گرداند؛ `ask` یعنی موقع تست خودتان انتخاب کنید */
export type DemoOutcome = 'ask' | 'success' | 'failed' | 'cancelled'

export const DEMO_OUTCOME_LABEL: Record<DemoOutcome, string> = {
  ask: 'در درگاه بپرس (تست دستی)',
  success: 'همیشه موفق',
  failed: 'همیشه ناموفق',
  cancelled: 'همیشه انصراف',
}

export interface PaymentSettings {
  methods: PaymentMethodSetting[]
  /**
   * فقط معرفی درگاه فعال. شناسه‌ی پذیرنده و رمزها عمداً اینجا نیستند — این
   * بلوک در پاسخِ عمومی `cms/settings` می‌نشیند و مرورگر هرکسی آن را می‌بیند.
   */
  gateway: {
    provider: PaymentGatewayId
    /** نام فارسی درگاه برای نمایش در صفحه‌ی تسویه */
    label: string
    /** درگاه وقتی آماده است که همه‌ی فیلدهایش در پنل پر شده باشد */
    ready: boolean
  }
  /**
   * درگاه دمو: هیچ تراکنش واقعی‌ای انجام نمی‌شود و نتیجه‌ی پرداخت ساختگی است.
   * برای تست کل مسیر تسویه بدون شناسه‌ی پذیرنده‌ی واقعی.
   */
  demo: {
    enabled: boolean
    outcome: DemoOutcome
    /** تأخیر ساختگی درگاه (میلی‌ثانیه) تا حالت انتظار هم دیده شود */
    delayMs: number
  }
}

/**
 * هویت بصری سایت. `mark` و `favicon` تصویر آپلودی‌اند و اگر خالی باشند
 * نشان پیش‌فرضِ خودِ کد استفاده می‌شود — یعنی سایت هیچ‌وقت بی‌لوگو نمی‌ماند.
 */
export interface BrandIdentity {
  /** تصویر نشان کنار نام؛ خالی یعنی نشان پیش‌فرض */
  mark: string
  /** آیکون تب مرورگر؛ خالی یعنی از نشان پیش‌فرض ساخته شود */
  favicon: string
  /** واژه‌نشان، متن بزرگ کنار نشان */
  wordmark: string
  /** خط کوچک زیر واژه‌نشان */
  caption: string
}

/**
 * روش رساندن دستگاه در ویزارد تعمیر. شناسه‌ها ثابت‌اند (سرور، پنل و گزارش‌ها
 * روی همین سه مقدار حساب می‌کنند)، ولی عنوان، توضیح، آیکون و روشن/خاموش بودن
 * هرکدام از پنل ویرایش می‌شود.
 */
export interface RepairPickupSetting {
  id: PickupMethod
  enabled: boolean
  label: string
  hint: string
  /** نام آیکون از `iconMap` */
  icon: string
}

export interface RepairSettings {
  /** تیتر بالای کارت‌های روش تحویل */
  title: string
  methods: RepairPickupSetting[]
}

export interface SiteSettings {
  siteName: string
  tagline: string
  brand: BrandIdentity
  phone: string
  email: string
  address: string
  socials: { id: string; label: string; href: string }[]
  announcement: { enabled: boolean; text: string; href: string }
  /**
   * روش‌های ورود. هرکدام جدا خاموش/روشن می‌شود و بک‌اند هم همین را می‌خواند،
   * پس خاموش کردن فقط دکمه را از رابط برنمی‌دارد — مسیرش هم بسته می‌شود.
   */
  auth: { otp: boolean; password: boolean }
  /**
   * قواعد ارسال؛ همان چیزی که نوار اعلان وعده‌اش را می‌دهد.
   * سبد خرید و صفحه‌ی تسویه از همین می‌خوانند تا متن و رفتار از هم جدا نیفتند.
   */
  shipping: { freeThreshold: number; cost: number }
  /** روش‌های پرداخت، درگاه بانکی و حالت دمو */
  payment: PaymentSettings
  /** روش‌های تحویل دستگاه در فرم تعمیر */
  repair: RepairSettings
  footer: FooterConfig
  theme: ThemeSettings
}

export interface HomePageConfig {
  sections: Section[]
  updatedAt: string
}

/* --------------------------------- درباره ما -------------------------------- */

export interface AboutStat {
  id: string
  /** نام آیکون از `iconMap` */
  icon: string
  value: string
  label: string
}

export interface AboutValue {
  id: string
  title: string
  text: string
}

export interface AboutTerm {
  id: string
  text: string
}

/**
 * صفحه‌ی «درباره ما» هم مثل لندینگ داده‌محور است؛ پنل ادمین همین را ویرایش می‌کند
 * و صفحه هیچ متن ثابتی ندارد. هر بلوک `enabled` دارد تا بدون حذف محتوا خاموش شود.
 * آدرس، تلفن و ایمیل بلوک تماس از تنظیمات سایت می‌آید تا در دو جا تکرار نشود.
 */
export interface AboutPageConfig {
  hero: { title: string; body: string }
  stats: { enabled: boolean; items: AboutStat[] }
  values: { enabled: boolean; items: AboutValue[] }
  contact: { enabled: boolean; title: string; description: string }
  terms: { enabled: boolean; title: string; items: AboutTerm[] }
  updatedAt: string
}
