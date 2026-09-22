/**
 * `admin_super` مدیر کل است و همیشه همه‌ی دسترسی‌ها را دارد.
 * `admin` ادمینی است که مدیر کل ساخته و دسترسی‌هایش موقع ساخت انتخاب شده.
 */
export type UserRole = 'customer' | 'admin_super' | 'admin'

/**
 * حساب هیچ‌وقت پاک نمی‌شود تا سفارش‌ها و تعمیرهایش بی‌صاحب نشوند؛ به‌جایش وضعیتش عوض می‌شود.
 * `inactive` حسابی است که موقتاً کنار گذاشته شده (خودش نخواسته یا رها شده)،
 * `blocked` تصمیم مدیر است. این دو را قاطی نکنید — گزارش‌ها به همین تفکیک تکیه می‌کنند.
 */
export type UserStatus = 'active' | 'inactive' | 'blocked'

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  blocked: 'مسدود',
}

/** رنگ نشان هر وضعیت؛ یک‌جا تعریف شده تا در جدول و پرونده یک‌شکل بماند */
export const USER_STATUS_TONE: Record<UserStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'warning',
  blocked: 'danger',
}

/** گزینه‌های آماده‌ی انتخاب وضعیت، به همان ترتیبی که در رابط دیده می‌شود */
export const USER_STATUS_OPTIONS = (Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((status) => ({
  value: status,
  label: USER_STATUS_LABEL[status],
  tone: USER_STATUS_TONE[status],
}))

/** توضیحی که زیر انتخاب وضعیت نشان داده می‌شود */
export const USER_STATUS_HINT: Record<UserStatus, string> = {
  active: 'حساب باز است؛ کاربر می‌تواند وارد شود و سفارش ثبت کند.',
  inactive: 'حساب موقتاً کنار گذاشته شده. سابقه‌اش می‌ماند و هر وقت خواستید دوباره فعال می‌شود.',
  blocked: 'کاربر نمی‌تواند وارد شود یا سفارش ثبت کند، ولی حساب و سابقه‌اش پاک نمی‌شود.',
}

export interface User {
  id: string
  fullName: string
  phone: string
  email: string
  /** حساب ساخته‌شده با کد پیامکی رمز ندارد؛ آن‌وقت تغییر رمز «رمز فعلی» نمی‌خواهد */
  hasPassword?: boolean
  role: UserRole
  /** عنوان ادمین برای نمایش — مثل «ادمین کاتالوگ» یا «ویرایشگر سایت» */
  adminTitle?: string
  /** فقط برای نقش `admin`؛ مدیر کل بی‌نیاز از این لیست همه‌چیز را دارد */
  permissions?: Permission[]
  status: UserStatus
  createdAt: string
  addresses: Address[]
}

export interface Address {
  id: string
  title: string
  receiver: string
  phone: string
  province: string
  city: string
  postalCode: string
  line: string
  isDefault: boolean
}

/** دسترسی‌های ریز؛ منوی پنل و گارد روت‌ها از روی همین ساخته می‌شود */
export type Permission =
  | 'dashboard.view'
  | 'product.manage'
  | 'category.manage'
  | 'discount.manage'
  | 'tag.manage'
  | 'order.manage'
  | 'repair.manage'
  | 'review.moderate'
  | 'user.manage'
  | 'appearance.manage'
  | 'settings.manage'
  | 'admin.manage'

/** ترتیب مرجع همه‌ی دسترسی‌ها — مدیر کل دقیقاً همین‌ها را دارد */
export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'product.manage',
  'category.manage',
  'tag.manage',
  'discount.manage',
  'order.manage',
  'repair.manage',
  'review.moderate',
  'appearance.manage',
  'settings.manage',
  'user.manage',
  'admin.manage',
]

/**
 * دسترسی‌هایی که فقط مال مدیر کل می‌مانند و به ادمین ساخته‌شده داده نمی‌شوند.
 * بدون این، یک ادمین می‌توانست ادمین دیگری با دسترسی کامل بسازد و سطحش را بالا ببرد.
 */
export const SUPER_ONLY_PERMISSIONS: Permission[] = ['admin.manage']

/** چیزی که مدیر کل موقع ساخت ادمین می‌تواند تیک بزند */
export const GRANTABLE_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (permission) => !SUPER_ONLY_PERMISSIONS.includes(permission),
)

export const ROLE_LABEL: Record<UserRole, string> = {
  customer: 'مشتری',
  admin_super: 'مدیر کل',
  admin: 'ادمین',
}

export const PERMISSION_LABEL: Record<Permission, { label: string; hint: string }> = {
  'dashboard.view': { label: 'داشبورد', hint: 'مشاهده‌ی آمار فروش، سفارش‌ها و کالاهای رو به اتمام' },
  'product.manage': { label: 'محصولات', hint: 'افزودن، ویرایش و حذف کالا' },
  'category.manage': { label: 'دسته‌بندی و برند', hint: 'ساخت، ویرایش و حذف دسته‌بندی‌ها و برندهای کاتالوگ' },
  'tag.manage': { label: 'برچسب‌ها', hint: 'مدیریت برچسب‌های کالا' },
  'discount.manage': { label: 'کدهای تخفیف', hint: 'ساخت، فعال/غیرفعال کردن و حذف کد تخفیف' },
  'order.manage': { label: 'سفارش‌ها', hint: 'مشاهده‌ی سفارش‌ها و تغییر وضعیت آن‌ها' },
  'repair.manage': { label: 'تعمیرات', hint: 'رسیدگی به درخواست‌ها، هزینه نهایی و یادداشت تکنسین' },
  'review.moderate': { label: 'نظرات', hint: 'تأیید یا رد نظرات کاربران' },
  'appearance.manage': { label: 'طراحی سایت', hint: 'چیدمان صفحه اصلی و محتوای صفحه درباره ما' },
  'settings.manage': { label: 'تنظیمات سایت', hint: 'اطلاعات پایه، تماس و نوار اعلان' },
  'user.manage': { label: 'کاربران', hint: 'مشاهده‌ی فهرست کاربران و اطلاعات تماس آن‌ها' },
  'admin.manage': { label: 'ادمین‌ها', hint: 'ساخت و حذف حساب ادمین — فقط مدیر کل' },
}

/** گروه‌بندی نمایش در فرم ساخت ادمین */
export const PERMISSION_GROUPS: { title: string; permissions: Permission[] }[] = [
  { title: 'عمومی', permissions: ['dashboard.view'] },
  { title: 'کاتالوگ', permissions: ['product.manage', 'category.manage', 'tag.manage', 'discount.manage'] },
  { title: 'فروش و خدمات', permissions: ['order.manage', 'repair.manage', 'review.moderate'] },
  { title: 'سایت و کاربران', permissions: ['appearance.manage', 'settings.manage', 'user.manage'] },
]

/** قالب‌های آماده‌ی ادمین؛ فرم ساخت با انتخاب هرکدام پر می‌شود */
export interface AdminPreset {
  id: string
  title: string
  description: string
  permissions: Permission[]
}

export const ADMIN_PRESETS: AdminPreset[] = [
  {
    id: 'catalog',
    title: 'ادمین کاتالوگ',
    description: 'کالاها، دسته‌بندی، برچسب و کد تخفیف',
    permissions: ['dashboard.view', 'product.manage', 'category.manage', 'tag.manage', 'discount.manage'],
  },
  {
    id: 'site_editor',
    title: 'ویرایشگر سایت',
    description: 'چیدمان صفحه اصلی و تنظیمات سایت',
    permissions: ['dashboard.view', 'appearance.manage', 'settings.manage'],
  },
  {
    id: 'support',
    title: 'پشتیبان سفارش‌ها',
    description: 'سفارش‌ها، تعمیرات و تأیید نظرات',
    permissions: ['dashboard.view', 'order.manage', 'repair.manage', 'review.moderate'],
  },
  {
    id: 'custom',
    title: 'سفارشی',
    description: 'دسترسی‌ها را دستی انتخاب کنید',
    permissions: [],
  },
]

/** کمترین اطلاعاتی که برای تصمیم‌گیری درباره‌ی دسترسی لازم است */
export interface Principal {
  role: UserRole
  permissions?: Permission[]
}

export function permissionsFor(principal: Principal | undefined): Permission[] {
  if (!principal) return []
  if (principal.role === 'admin_super') return ALL_PERMISSIONS
  if (principal.role === 'admin') return principal.permissions ?? []
  return []
}

export function can(principal: Principal | undefined, permission: Permission): boolean {
  return permissionsFor(principal).includes(permission)
}

/**
 * لیست دسترسی ورودی را امن می‌کند: ناشناس‌ها، تکراری‌ها و دسترسی‌های
 * مخصوص مدیر کل حذف می‌شوند. هم فرم و هم هندلر سرور از همین استفاده می‌کنند.
 */
export function sanitizeAdminPermissions(input: unknown): Permission[] {
  const requested = Array.isArray(input) ? (input as Permission[]) : []
  return GRANTABLE_PERMISSIONS.filter((permission) => requested.includes(permission))
}
