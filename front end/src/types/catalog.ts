/**
 * دسته‌بندی‌ها از پنل ادمین ساخته و حذف می‌شوند، پس اسلاگ یک اتحادیه‌ی ثابت
 * نیست. نام تایپ حفظ شده تا در امضای توابع پیدا باشد این رشته اسلاگِ دسته است،
 * نه یک متن دلخواه.
 */
export type CategorySlug = string

export interface Category {
  id: string
  /** شناسه‌ی دسته‌ی مادر؛ null یعنی خودش دسته‌ی اصلی است. بیشتر از دو سطح نداریم */
  parentId?: string | null
  slug: CategorySlug
  title: string
  icon: string
  description: string
  /** ویژگی‌هایی که در فیلتر و صفحه مقایسه‌ی این دسته نمایش داده می‌شوند */
  specKeys: string[]
}

export interface Brand {
  id: string
  slug: string
  title: string
  logo: string
}

/**
 * برچسب کالا. محصول‌ها برچسب را با «عنوان» نگه می‌دارند (نه شناسه)، پس تغییر نام
 * از پنل باید روی همه‌ی کالاها آبشاری اعمال شود.
 */
export interface Tag {
  id: string
  title: string
}

export interface ProductSpec {
  key: string
  label: string
  value: string
  /** برای مقایسه: مقدار عددی قابل رتبه‌بندی (مثلاً رم بر حسب گیگ) */
  score?: number
}

export interface ProductVariant {
  id: string
  title: string
  color?: { name: string; hex: string }
  storage?: string
  price: number
  stock: number
}

/**
 * کالای غیرفعال در فروشگاه اصلاً دیده نمی‌شود (نه در لیست، نه در جست‌وجو، نه با
 * لینک مستقیم) ولی در پنل و در سفارش‌های قبلی می‌ماند — پس جای «حذف» را می‌گیرد
 * بدون اینکه تاریخچه‌ی فروش خراب شود.
 */
export type ProductStatus = 'active' | 'inactive'

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
}

export const PRODUCT_STATUS_TONE: Record<ProductStatus, 'success' | 'warning'> = {
  active: 'success',
  inactive: 'warning',
}

export const PRODUCT_STATUS_OPTIONS = (Object.keys(PRODUCT_STATUS_LABEL) as ProductStatus[]).map((status) => ({
  value: status,
  label: PRODUCT_STATUS_LABEL[status],
  tone: PRODUCT_STATUS_TONE[status],
}))

export interface Product {
  id: string
  slug: string
  title: string
  titleEn: string
  categorySlug: CategorySlug
  brandSlug: string
  price: number
  /** قیمت پیش از تخفیف؛ اگر تخفیف ندارد null */
  compareAtPrice: number | null
  rating: number
  reviewCount: number
  stock: number
  images: string[]
  shortDescription: string
  description: string
  specs: ProductSpec[]
  variants: ProductVariant[]
  tags: string[]
  isNew: boolean
  isFeatured: boolean
  status: ProductStatus
  createdAt: string
}

export interface Review {
  id: string
  productId: string
  userName: string
  rating: number
  title: string
  body: string
  pros: string[]
  cons: string[]
  createdAt: string
  helpfulCount: number
  notHelpfulCount: number
  status: 'pending' | 'approved' | 'rejected'
  verifiedPurchase: boolean
}

export interface Discount {
  id: string
  code: string
  type: 'percent' | 'amount'
  value: number
  /**
   * محدودیت کد. روی کالایی اعمال می‌شود که یا خودش در `productIds` است یا
   * دسته‌اش در `categoryIds`؛ هر دو خالی یعنی روی همه‌ی کالاها.
   */
  productIds: string[]
  categoryIds: string[]
  /** کد شخصی: فقط همین کاربران؛ خالی یعنی همه. جدا از محدودیت کالا/دسته سنجیده می‌شود */
  userIds: string[]
  startsAt: string
  endsAt: string
  usageLimit: number
  usedCount: number
  active: boolean
}

/**
 * پیشوند پارامتر URL فیلتر مشخصات — `?spec_ram=۸ گیگابایت,۱۲ گیگابایت`.
 * چون کلیدها از دسته می‌آیند و از پیش معلوم نیستند، به‌جای یک پارامتر ثابت با
 * پیشوند شناسایی می‌شوند.
 */
export const SPEC_PARAM_PREFIX = 'spec_'

export interface ProductQuery {
  q?: string
  /**
   * فهرست شناسه‌ی مشخص. برای کروسلی که ادمین کالاهایش را دستی چیده است؛
   * بدون این باید کل صفحه گرفته و بعد فیلتر می‌شد و هر کالایی که در آن صفحه
   * نبود از قلم می‌افتاد.
   */
  ids?: string[]
  category?: CategorySlug
  brands?: string[]
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
  hasDiscount?: boolean
  minRating?: number
  tags?: string[]
  /**
   * فیلتر روی مشخصات فنی: کلید مشخصه → مقدارهای انتخاب‌شده.
   * کلیدها از `Category.specKeys` می‌آیند، پس هر دسته فیلترهای خودش را دارد.
   * درون یک کلید «یا» و بین کلیدها «و» اعمال می‌شود.
   */
  specs?: Record<string, string[]>
  sort?: 'newest' | 'cheapest' | 'expensive' | 'popular' | 'discount'
  page?: number
  perPage?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface FacetBucket {
  value: string
  label: string
  count: number
}

/** یک گروه فیلتر مشخصات — مثلاً «حافظه رم» با مقدارهای موجودش */
export interface SpecFacet {
  key: string
  label: string
  options: FacetBucket[]
}

export interface ProductFacets {
  brands: FacetBucket[]
  tags: FacetBucket[]
  /** فقط وقتی دسته انتخاب شده پر می‌شود؛ ترتیبش همان ترتیب `Category.specKeys` است */
  specs: SpecFacet[]
  priceRange: { min: number; max: number }
}

/** «موجود شد خبرم کن» از دید مشتری */
export interface StockAlert {
  id: string
  productId: string
  slug: string
  title: string
  image: string
  /** مدل‌ها با هر ویرایش از نو ساخته می‌شوند، پس عنوان مدل نگه داشته می‌شود نه شناسه‌اش */
  variantTitle: string
  /** همین حالا قابل خرید است */
  available: boolean
  notifiedAt: string | null
  createdAt: string
}
