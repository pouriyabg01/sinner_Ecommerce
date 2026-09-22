import type { SmsLogEntry, SmsSettings, SmsSettingsInput } from '@/types/sms'
import type { StockAlert } from '@/types/catalog'
import { apiFetch } from './client'
import { MOCKING_ENABLED } from './config'
import type { Brand, Category, Discount, Paginated, Product, ProductFacets, ProductQuery, Review, Tag } from '@/types/catalog'
import { SPEC_PARAM_PREFIX } from '@/types/catalog'
import type { AdminOrder, Order, OrderStatus, PaymentMethodId, PaymentStatus } from '@/types/order'
import type { AdminRepairRequest, RepairTracking, CommonIssue, DeviceKind, RepairRequest, RepairStatus } from '@/types/repair'
import type { AboutPageConfig, DemoOutcome, HomePageConfig, SiteSettings } from '@/types/cms'
import type { PaymentGatewayInput, PaymentGatewaySettings } from '@/types/payment-gateway'
import type { Address, Permission, User } from '@/types/user'

export interface ProductListResponse extends Paginated<Product> {
  facets: ProductFacets
}

export type ReviewVote = 'up' | 'down'

export interface ReviewsResponse {
  items: Review[]
  breakdown: { star: number; count: number }[]
  average: number
  total: number
}

export interface MonthlySales {
  /** تاریخ میلادی روز اول ماه شمسی، به‌عنوان شناسه‌ی پایدار */
  key: string
  label: string
  productRevenue: number
  repairRevenue: number
  orderCount: number
  repairCount: number
}

export interface AdminStats {
  revenue: number
  orderCount: number
  productCount: number
  repairCount: number
  reviewCount: number
  /** سفارش‌های رسیدگی‌نشده (پیش از ارسال) */
  openOrders: number
  pendingReviews: number
  openRepairs: number
  /** فروش ۱۲ ماه شمسی اخیر به تفکیک کالا و تعمیرات؛ آخرین عضو، ماه جاری است */
  months: MonthlySales[]
  lowStock: { id: string; slug: string; title: string; stock: number }[]
  daily: { date: string; revenue: number; orders: number }[]
  topProducts: { id: string; slug: string; title: string; image: string; reviewCount: number; price: number }[]
}

/**
 * بررسی کد تخفیف. سبد هم فرستاده می‌شود چون کد می‌تواند محدود به چند کالا باشد
 * و مبلغ تخفیف را باید سرور حساب کند، نه مرورگر — وگرنه کافی است کاربر جواب را
 * دستکاری کند تا هر تخفیفی بگیرد.
 */
export interface DiscountCheck {
  code: string
  lines: { productId: string; lineTotal: number }[]
}

/** فهرست سبک کاربران برای کد تخفیف شخصی — بدون آدرس و ایمیل */
export interface DiscountCustomer {
  id: string
  fullName: string
  phone: string | null
}

export interface DiscountResult {
  discount: Discount
  /** مبلغ نهایی تخفیف روی همین سبد */
  amount: number
}

/* ----------------------------------- auth ---------------------------------- */

/** کدام روش‌های ورود از پنل روشن‌اند */
export interface AuthMethods {
  otp: boolean
  password: boolean
}

export interface AuthSession {
  token: string
  user: User
}

export const authApi = {
  methods: () => apiFetch<AuthMethods>('/auth/methods'),
  requestOtp: (phone: string) =>
    apiFetch<{ expiresIn: number; devCode: string | null }>('/auth/otp/request', {
      method: 'POST',
      body: { phone },
    }),
  verifyOtp: (body: { phone: string; code: string; fullName?: string }) =>
    apiFetch<AuthSession>('/auth/otp/verify', { method: 'POST', body }),
  login: (body: { identifier: string; password: string }) =>
    apiFetch<AuthSession>('/auth/login', { method: 'POST', body }),
  register: (body: { fullName: string; phone: string; email: string; password: string }) =>
    apiFetch<AuthSession>('/auth/register', { method: 'POST', body }),
  logout: () => apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' }),
}

/** آپلود فایل؛ با لایه‌ی mock کار نمی‌کند و آنجا مسیر data URL می‌ماند */
export const uploadApi = {
  image: async (file: File) => {
    const form = new FormData()
    form.append('file', file)

    return apiFetch<{ url: string; path: string }>('/uploads', { method: 'POST', body: form })
  },
}

/* --------------------------------- catalog --------------------------------- */
export const catalogApi = {
  list: (query: ProductQuery = {}) =>
    apiFetch<ProductListResponse>('/products', {
      params: {
        q: query.q,
        ids: query.ids,
        category: query.category,
        brands: query.brands,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        inStockOnly: query.inStockOnly,
        hasDiscount: query.hasDiscount,
        minRating: query.minRating,
        tags: query.tags,
        sort: query.sort,
        page: query.page,
        perPage: query.perPage,
        // کلیدهای مشخصات از دسته می‌آیند، پس با پیشوند به پارامترها اضافه می‌شوند
        ...Object.fromEntries(
          Object.entries(query.specs ?? {}).map(([key, values]) => [`${SPEC_PARAM_PREFIX}${key}`, values]),
        ),
      },
    }),
  detail: (slug: string) => apiFetch<{ product: Product; related: Product[] }>(`/products/${slug}`),
  reviews: (slug: string) => apiFetch<ReviewsResponse>(`/products/${slug}/reviews`),
  addReview: (slug: string, body: Partial<Review>) =>
    apiFetch<{ review: Review; message: string }>(`/products/${slug}/reviews`, { method: 'POST', body }),
  /** پسند یا ناپسند؛ همان رأی دوباره یعنی پس گرفتنش و رأی مخالف یعنی برگرداندنش */
  voteReview: (slug: string, reviewId: string, vote: ReviewVote) =>
    apiFetch<{ helpfulCount: number; notHelpfulCount: number; myVote: ReviewVote | null }>(
      `/products/${slug}/reviews/${reviewId}/vote`,
      { method: 'POST', body: { vote } },
    ),
  compare: (ids: string[]) =>
    apiFetch<{ items: Product[]; specKeys: { key: string; label: string }[] }>('/compare', { params: { ids } }),
  categories: () => apiFetch<(Category & { productCount: number })[]>('/categories'),
  brands: () => apiFetch<Brand[]>('/brands'),
  tags: () => apiFetch<string[]>('/tags'),
}

/* ----------------------------------- cms ----------------------------------- */
export const cmsApi = {
  home: () => apiFetch<HomePageConfig>('/cms/home'),
  saveHome: (body: HomePageConfig) => apiFetch<HomePageConfig>('/cms/home', { method: 'PUT', body }),
  about: () => apiFetch<AboutPageConfig>('/cms/about'),
  saveAbout: (body: AboutPageConfig) => apiFetch<AboutPageConfig>('/cms/about', { method: 'PUT', body }),
  settings: () => apiFetch<SiteSettings>('/cms/settings'),
  saveSettings: (body: SiteSettings) => apiFetch<SiteSettings>('/cms/settings', { method: 'PUT', body }),
}

/**
 * در حالت mock هویت با این هدر می‌رود چون آنجا ورودی وجود ندارد؛ با بک‌اند
 * واقعی کاربر از روی توکن شناخته می‌شود و این هدر معنایی ندارد.
 */
const asUser = (userId?: string) =>
  MOCKING_ENABLED && userId ? { 'x-mock-user': userId } : undefined

/* ----------------------------------- me ------------------------------------ */
export const meApi = {
  profile: (userId?: string) => apiFetch<User>('/me', { headers: asUser(userId) }),
  orders: (userId?: string) => apiFetch<Order[]>('/me/orders', { headers: asUser(userId) }),
  repairs: (userId?: string) => apiFetch<RepairRequest[]>('/me/repairs', { headers: asUser(userId) }),
  updateProfile: (body: ProfileUpdate, userId?: string) =>
    apiFetch<User>('/me', { method: 'PATCH', body, headers: asUser(userId) }),
  changePassword: (body: PasswordChange) =>
    apiFetch<{ message: string }>('/me/password', { method: 'PATCH', body }),
  /** هر سه کل حساب را برمی‌گردانند تا پروفایل و تکمیل سفارش یکجا به‌روز شوند */
  addAddress: (body: AddressInput, userId?: string) =>
    apiFetch<User>('/me/addresses', { method: 'POST', body, headers: asUser(userId) }),
  updateAddress: (id: string, body: Partial<AddressInput>, userId?: string) =>
    apiFetch<User>(`/me/addresses/${id}`, { method: 'PATCH', body, headers: asUser(userId) }),
  deleteAddress: (id: string, userId?: string) =>
    apiFetch<User>(`/me/addresses/${id}`, { method: 'DELETE', headers: asUser(userId) }),
}

/** پیش‌فرض بودن را سرور هم تصمیم می‌گیرد: اولین آدرس همیشه پیش‌فرض می‌شود */
export type AddressInput = Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }

export interface PasswordChange {
  /** برای حسابی که رمز ندارد (ساخته‌شده با کد پیامکی) لازم نیست */
  currentPassword?: string
  password: string
  passwordConfirmation: string
}

/**
 * علاقه‌مندی‌ها روی سرور ذخیره می‌شود تا روی همه‌ی دستگاه‌ها یکی باشد.
 * فهرست فقط کالاهای منتشرشده را برمی‌گرداند، جدیدترین اول.
 */
export const wishlistApi = {
  list: (userId?: string) => apiFetch<Product[]>('/me/wishlist', { headers: asUser(userId) }),
  add: (productId: string, userId?: string) =>
    apiFetch<{ productIds: string[] }>('/me/wishlist', { method: 'POST', body: { productId }, headers: asUser(userId) }),
  remove: (productId: string, userId?: string) =>
    apiFetch<{ productIds: string[] }>(`/me/wishlist/${productId}`, { method: 'DELETE', headers: asUser(userId) }),
}

export type PaymentOutcome = 'success' | 'failed' | 'cancelled'

export type ProfileUpdate = Partial<Pick<User, 'fullName' | 'phone' | 'email'>>

/* --------------------------------- orders ---------------------------------- */
/**
 * سبد فقط با شناسه‌ی مدل و تعداد فرستاده می‌شود.
 *
 * هیچ مبلغی از مرورگر پذیرفته نمی‌شود: قیمت هر قلم را سرور از خود کالا
 * می‌خواند، تخفیف را دوباره می‌سنجد و هزینه‌ی ارسال را از تنظیمات سایت
 * برمی‌دارد — وگرنه با یک درخواست دستی می‌شد هر کالایی را به هر قیمتی خرید.
 */
export interface OrderDraft {
  lines: { variantId: string; quantity: number }[]
  paymentMethod: PaymentMethodId
  addressSummary: string
  /** `YYYY-MM-DD`؛ خالی یعنی زودترین زمان ممکن */
  preferredDeliveryDate?: string | null
  discountCode?: string
}

/**
 * پرداخت هم برای سفارش فروشگاه است و هم برای هزینه‌ی تعمیر؛ هر دو از یک درگاه
 * و یک منطق تأیید رد می‌شوند، پس نوع فقط یک بخش از آدرس است.
 */
export type PayableType = 'order' | 'repair'

export const paymentApi = {
  start: (type: PayableType, code: string) =>
    apiFetch<PaymentStart>(`/pay/${type}/${code}`, { method: 'POST' }),
  demo: (type: PayableType, code: string, outcome: PaymentOutcome) =>
    apiFetch<unknown>(`/pay/${type}/${code}/demo`, { method: 'POST', body: { outcome } }),
}

/** پاسخ شروع پرداخت: یا درگاه ساختگی، یا فرم انتقال به بانک واقعی */
export type PaymentStart =
  | { mode: 'demo'; enabled: boolean; outcome: DemoOutcome; delayMs: number }
  | { mode: 'gateway'; action: string; method: 'GET' | 'POST'; inputs: Record<string, string> }

export const orderApi = {
  detail: (code: string) => apiFetch<Order>(`/orders/${code}`),
  create: (body: OrderDraft) => apiFetch<Order>('/orders', { method: 'POST', body }),
  /**
   * شروع پرداخت. با دموی روشن `mode: 'demo'` برمی‌گردد و صفحه‌ی ساختگی باز
   * می‌شود؛ وگرنه سرور تراکنش را نزد درگاه می‌سازد و فرم انتقال به بانک را
   * می‌دهد تا مرورگر submit کند (بعضی درگاه‌ها POST با فیلد مخفی می‌خواهند).
   */
  startPayment: (code: string) => paymentApi.start('order', code),
  /** نتیجه‌ی درگاه ساختگی. فقط تا وقتی دمو روشن است پذیرفته می‌شود */
  payDemo: (code: string, outcome: PaymentOutcome) =>
    apiFetch<Order>(`/pay/order/${code}/demo`, { method: 'POST', body: { outcome } }),
  validateDiscount: (body: DiscountCheck) =>
    apiFetch<DiscountResult>('/discounts/validate', { method: 'POST', body }),
}

/* --------------------------------- repair ---------------------------------- */
export const repairApi = {
  issues: (deviceKind?: DeviceKind) =>
    apiFetch<CommonIssue[]>('/repair/issues', { params: { deviceKind } }),
  estimate: (issueIds: string[]) =>
    apiFetch<{ min: number; max: number; days: number }>('/repair/estimate', { method: 'POST', body: { issueIds } }),
  create: (body: Partial<RepairRequest>) => apiFetch<RepairRequest>('/repair/requests', { method: 'POST', body }),
  detail: (code: string) => apiFetch<RepairTracking>(`/repair/requests/${code}`),
  /**
   * تصمیم مشتری درباره‌ی برآورد هزینه. تأیید، درخواست را به «در انتظار پرداخت»
   * می‌برد — تنها راهِ رسیدن به مرحله‌ی پرداخت، چون ادمین اجازه‌ی گذاشتنش را ندارد.
   */
  decide: (code: string, decision: 'approve' | 'reject', reason?: string) =>
    apiFetch<RepairRequest>(`/repair/requests/${code}/decide`, {
      method: 'POST',
      body: { decision, reason },
    }),
}

/* ---------------------------------- admin ---------------------------------- */
export const adminApi = {
  stats: () => apiFetch<AdminStats>('/admin/stats'),
  products: ({ specs: _unusedSpecs, ...query }: ProductQuery = {}) =>
    // فیلتر مشخصات مخصوص فروشگاه است؛ جدول پنل ستون‌های خودش را دارد
    apiFetch<Paginated<Product>>('/admin/products', { params: { ...query, perPage: query.perPage ?? 50 } }),
  createProduct: (body: Partial<Product>) => apiFetch<Product>('/admin/products', { method: 'POST', body }),
  updateProduct: (id: string, body: Partial<Product>) =>
    apiFetch<Product>(`/admin/products/${id}`, { method: 'PATCH', body }),
  deleteProduct: (id: string) => apiFetch<{ ok: true }>(`/admin/products/${id}`, { method: 'DELETE' }),

  orders: () => apiFetch<AdminOrder[]>('/admin/orders'),
  updateOrder: (id: string, body: { status?: OrderStatus; trackingCode?: string | null }) =>
    apiFetch<AdminOrder>(`/admin/orders/${id}`, { method: 'PATCH', body }),

  repairs: () => apiFetch<AdminRepairRequest[]>('/admin/repairs'),
  updateRepair: (id: string, body: { status?: RepairStatus; finalCost?: number; technicianNote?: string }) =>
    apiFetch<RepairRequest>(`/admin/repairs/${id}`, { method: 'PATCH', body }),

  reviews: () => apiFetch<(Review & { productTitle: string })[]>('/admin/reviews'),
  updateReview: (id: string, status: Review['status']) =>
    apiFetch<Review>(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } }),

  discounts: () => apiFetch<Discount[]>('/admin/discounts'),
  discountCustomers: () => apiFetch<DiscountCustomer[]>('/admin/discounts/customers'),
  createDiscount: (body: Omit<Discount, 'id'>) => apiFetch<Discount>('/admin/discounts', { method: 'POST', body }),
  updateDiscount: (id: string, body: Partial<Discount>) =>
    apiFetch<Discount>(`/admin/discounts/${id}`, { method: 'PATCH', body }),
  deleteDiscount: (id: string) => apiFetch<{ ok: true }>(`/admin/discounts/${id}`, { method: 'DELETE' }),

  categories: () => apiFetch<CategoryWithCount[]>('/admin/categories'),
  createCategory: (body: Omit<Category, 'id'>) => apiFetch<Category>('/admin/categories', { method: 'POST', body }),
  updateCategory: (id: string, body: Partial<Category>) =>
    apiFetch<Category>(`/admin/categories/${id}`, { method: 'PATCH', body }),
  /** دسته‌ی دارای کالا بدون `mode` حذف نمی‌شود — سرور ۴۲۲ برمی‌گرداند */
  deleteCategory: ({ id, mode }: { id: string; mode?: CategoryDeleteMode }) =>
    apiFetch<{ ok: true; affected: number }>(`/admin/categories/${id}`, { method: 'DELETE', params: { mode } }),

  brands: () => apiFetch<BrandWithCount[]>('/admin/brands'),
  createBrand: (body: Omit<Brand, 'id'>) => apiFetch<Brand>('/admin/brands', { method: 'POST', body }),
  updateBrand: (id: string, body: Partial<Brand>) =>
    apiFetch<Brand>(`/admin/brands/${id}`, { method: 'PATCH', body }),
  deleteBrand: (id: string) => apiFetch<{ ok: true }>(`/admin/brands/${id}`, { method: 'DELETE' }),

  tags: () => apiFetch<TagWithCount[]>('/admin/tags'),
  createTag: (body: Omit<Tag, 'id'>) => apiFetch<Tag>('/admin/tags', { method: 'POST', body }),
  updateTag: (id: string, body: Partial<Tag>) =>
    apiFetch<Tag>(`/admin/tags/${id}`, { method: 'PATCH', body }),
  deleteTag: (id: string) => apiFetch<{ ok: true }>(`/admin/tags/${id}`, { method: 'DELETE' }),

  users: () => apiFetch<User[]>('/admin/users'),
  user: (id: string) => apiFetch<UserRecord>(`/admin/users/${id}`),
  createUser: (body: UserCreate) => apiFetch<User>('/admin/users', { method: 'POST', body }),
  updateUser: (id: string, body: UserUpdate) =>
    apiFetch<User>(`/admin/users/${id}`, { method: 'PATCH', body }),
  deleteUser: (id: string) => apiFetch<{ ok: true }>(`/admin/users/${id}`, { method: 'DELETE' }),

  repairIssues: () => apiFetch<CommonIssue[]>('/admin/repair-issues'),
  createRepairIssue: (body: Omit<CommonIssue, 'id'>) =>
    apiFetch<CommonIssue>('/admin/repair-issues', { method: 'POST', body }),
  updateRepairIssue: (id: string, body: Partial<CommonIssue>) =>
    apiFetch<CommonIssue>(`/admin/repair-issues/${id}`, { method: 'PATCH', body }),
  deleteRepairIssue: (id: string) =>
    apiFetch<{ ok: true }>(`/admin/repair-issues/${id}`, { method: 'DELETE' }),

  admins: () => apiFetch<User[]>('/admin/admins'),
  createAdmin: (body: { fullName: string; adminTitle: string; phone: string; email: string; permissions: Permission[] }) =>
    apiFetch<User>('/admin/admins', { method: 'POST', body }),
  deleteAdmin: (id: string) => apiFetch<{ ok: true }>(`/admin/admins/${id}`, { method: 'DELETE' }),
}

/** تعداد کالای هر دسته/برند را بک‌اند حساب می‌کند؛ جدول ادمین برای گارد حذف لازمش دارد */
export type CategoryWithCount = Category & { productCount: number }

/** با حذف دسته، کالاهایش یا همراهش پاک می‌شوند یا بی‌دسته (و پنهان از فروشگاه) می‌مانند */
export type CategoryDeleteMode = 'delete_products' | 'detach_products'
export type BrandWithCount = Brand & { productCount: number }
export type TagWithCount = Tag & { productCount: number }

export type UserUpdate = Partial<Pick<User, 'fullName' | 'phone' | 'email' | 'status'>>
export type UserCreate = Pick<User, 'fullName' | 'phone' | 'email' | 'status'>

/** پرونده‌ی کاربر در پنل: پروفایل به‌همراه سفارش‌ها، تعمیرها و خلاصه‌ی آماری */
export interface UserRecord {
  user: User
  orders: { id: string; code: string; total: number; status: OrderStatus; paymentStatus: PaymentStatus; createdAt: string }[]
  repairs: { id: string; code: string; device: string; status: RepairStatus; createdAt: string }[]
  stats: { orderCount: number; spent: number; openRepairs: number }
}

/* ----------------------------------- پیامک ---------------------------------- */
export const smsApi = {
  settings: () => apiFetch<SmsSettings>('/admin/sms'),
  save: (body: SmsSettingsInput) => apiFetch<SmsSettings>('/admin/sms', { method: 'PUT', body }),
  test: (phone: string) =>
    apiFetch<{ ok: true; status: SmsLogEntry['status']; message: string }>('/admin/sms/test', {
      method: 'POST',
      body: { phone },
    }),
  messages: () => apiFetch<SmsLogEntry[]>('/admin/sms/messages'),
}

/* -------------------------------- خبرم کن -------------------------------- */
export const stockAlertApi = {
  list: () => apiFetch<StockAlert[]>('/me/stock-alerts'),
  add: (body: { productId: string; variantTitle: string }) =>
    apiFetch<StockAlert>('/me/stock-alerts', { method: 'POST', body }),
  remove: (id: string) => apiFetch<{ ok: true }>(`/me/stock-alerts/${id}`, { method: 'DELETE' }),
}

/* ------------------------------ درگاه پرداخت ------------------------------ */
/**
 * تنظیمات درگاه جدا از `cms/settings` است چون آن یکی بدون ورود خوانده می‌شود
 * و شناسه‌ی پذیرنده نباید به مرورگر مهمان‌ها برسد.
 */
export const paymentGatewayApi = {
  settings: () => apiFetch<PaymentGatewaySettings>('/admin/payment-gateway'),
  save: (body: PaymentGatewayInput) =>
    apiFetch<PaymentGatewaySettings>('/admin/payment-gateway', { method: 'PUT', body }),
  /** پاک کردن یک مقدار محرمانه — فرستادن خالی یعنی «همان قبلی بماند» */
  forget: (driver: string, field: string) =>
    apiFetch<PaymentGatewaySettings>('/admin/payment-gateway/field', {
      method: 'DELETE',
      body: { driver, field },
    }),
}
