import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminApi,
  catalogApi,
  cmsApi,
  meApi,
  orderApi,
  paymentApi,
  repairApi,
  wishlistApi,
  type PaymentOutcome,
  type ProfileUpdate,
  type AddressInput,
  type ReviewsResponse,
  type ReviewVote,
} from './endpoints'
import type { Product, ProductQuery } from '@/types/catalog'
import { MOCKING_ENABLED } from './config'
import { smsApi, stockAlertApi } from './endpoints'
import type { StockAlert } from '@/types/catalog'
import { useSession } from '@/store/session'
import type { DeviceKind } from '@/types/repair'

export const qk = {
  products: (query: ProductQuery) => ['products', query] as const,
  product: (slug: string) => ['product', slug] as const,
  reviews: (slug: string) => ['product-reviews', slug] as const,
  compare: (ids: string[]) => ['compare', ids] as const,
  categories: ['categories'] as const,
  brands: ['brands'] as const,
  tags: ['tags'] as const,
  home: ['cms', 'home'] as const,
  about: ['cms', 'about'] as const,
  settings: ['cms', 'settings'] as const,
  me: (userId?: string) => ['me', userId ?? 'default'] as const,
  myOrders: (userId?: string) => ['me', 'orders', userId ?? 'default'] as const,
  myRepairs: (userId?: string) => ['me', 'repairs', userId ?? 'default'] as const,
  wishlist: (userId?: string) => ['me', 'wishlist', userId ?? 'default'] as const,
  repairIssues: (deviceKind?: string) => ['repair', 'issues', deviceKind ?? 'all'] as const,
  adminRepairIssues: ['admin', 'repair-issues'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminProducts: ['admin', 'products'] as const,
  adminOrders: ['admin', 'orders'] as const,
  smsSettings: ['admin', 'sms'] as const,
  smsMessages: ['admin', 'sms', 'messages'] as const,
  stockAlerts: (userId?: string) => ['me', 'stock-alerts', userId] as const,
  adminRepairs: ['admin', 'repairs'] as const,
  adminReviews: ['admin', 'reviews'] as const,
  adminDiscounts: ['admin', 'discounts'] as const,
  adminDiscountCustomers: ['admin', 'discount-customers'] as const,
  adminUsers: ['admin', 'users'] as const,
  adminUser: (id: string) => ['admin', 'user', id] as const,
  adminCategories: ['admin', 'categories'] as const,
  adminBrands: ['admin', 'brands'] as const,
  adminTags: ['admin', 'tags'] as const,
  adminAdmins: ['admin', 'admins'] as const,
}

/* ---------------------------------- catalog --------------------------------- */
export const useProducts = (query: ProductQuery, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: qk.products(query),
    queryFn: () => catalogApi.list(query),
    placeholderData: (p) => p,
    enabled: options?.enabled ?? true,
  })

export const useProduct = (slug: string) =>
  useQuery({ queryKey: qk.product(slug), queryFn: () => catalogApi.detail(slug), enabled: Boolean(slug) })

export const useProductReviews = (slug: string) =>
  useQuery({ queryKey: qk.reviews(slug), queryFn: () => catalogApi.reviews(slug), enabled: Boolean(slug) })

export const useCompare = (ids: string[]) =>
  useQuery({ queryKey: qk.compare(ids), queryFn: () => catalogApi.compare(ids), enabled: ids.length > 0 })

export const useCategories = () => useQuery({ queryKey: qk.categories, queryFn: catalogApi.categories })
export const useBrands = () => useQuery({ queryKey: qk.brands, queryFn: catalogApi.brands })
export const useTags = () => useQuery({ queryKey: qk.tags, queryFn: catalogApi.tags })

/** شمارنده‌های پسند و ناپسند بدون گرفتن دوباره‌ی فهرست نظرها به‌روز می‌شوند */
export function useVoteReview(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, vote }: { reviewId: string; vote: ReviewVote }) =>
      catalogApi.voteReview(slug, reviewId, vote),
    onSuccess: (result, { reviewId }) =>
      qc.setQueryData(qk.reviews(slug), (prev: ReviewsResponse | undefined) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((review) =>
                review.id === reviewId
                  ? { ...review, helpfulCount: result.helpfulCount, notHelpfulCount: result.notHelpfulCount }
                  : review,
              ),
            }
          : prev,
      ),
  })
}

export function useAddReview(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof catalogApi.addReview>[1]) => catalogApi.addReview(slug, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reviews(slug) }),
  })
}

/* ------------------------------------ cms ----------------------------------- */
export const useHomeConfig = () => useQuery({ queryKey: qk.home, queryFn: cmsApi.home })
export const useAboutConfig = () => useQuery({ queryKey: qk.about, queryFn: cmsApi.about })
export const useSiteSettings = () => useQuery({ queryKey: qk.settings, queryFn: cmsApi.settings })

export function useSaveHomeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cmsApi.saveHome,
    onSuccess: (data) => qc.setQueryData(qk.home, data),
  })
}

export function useSaveAboutConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cmsApi.saveAbout,
    onSuccess: (data) => qc.setQueryData(qk.about, data),
  })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cmsApi.saveSettings,
    onSuccess: (data) => qc.setQueryData(qk.settings, data),
  })
}

/* ------------------------------------ me ------------------------------------ */
/**
 * مهمان توکن ندارد؛ بدون این شرط هر صفحه‌ای که حساب را می‌خواند (مثل فرم تعمیر)
 * یک درخواست ۴۰۱ بی‌فایده می‌زد و کنسول را پر از خطا می‌کرد.
 */
function useSignedIn() {
  const token = useSession((s) => s.token)
  return MOCKING_ENABLED || Boolean(token)
}

export const useMe = (userId?: string) =>
  useQuery({ queryKey: qk.me(userId), queryFn: () => meApi.profile(userId), enabled: useSignedIn() })
export const useMyOrders = (userId?: string) =>
  useQuery({ queryKey: qk.myOrders(userId), queryFn: () => meApi.orders(userId), enabled: useSignedIn() })
export const useMyRepairs = (userId?: string) =>
  useQuery({ queryKey: qk.myRepairs(userId), queryFn: () => meApi.repairs(userId), enabled: useSignedIn() })

/**
 * تصمیم مشتری درباره‌ی برآورد هزینه‌ی تعمیر. تأیید، درخواست را به مرحله‌ی
 * پرداخت می‌برد؛ انصراف آن را می‌بندد.
 */
export function useDecideRepair() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, decision, reason }: { code: string; decision: 'approve' | 'reject'; reason?: string }) =>
      repairApi.decide(code, decision, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'repairs'] })
      qc.invalidateQueries({ queryKey: qk.adminRepairs })
    },
  })
}

/** شروع پرداخت هزینه‌ی تعمیر — همان درگاهی که فروشگاه استفاده می‌کند */
export const useStartRepairPayment = () =>
  useMutation({ mutationFn: (code: string) => paymentApi.start('repair', code) })

/** نتیجه‌ی درگاه ساختگی برای تعمیر */
export function usePayRepairDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, outcome }: { code: string; outcome: PaymentOutcome }) =>
      paymentApi.demo('repair', code, outcome),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'repairs'] })
      qc.invalidateQueries({ queryKey: qk.adminRepairs })
    },
  })
}

/** ویرایش اطلاعات حساب — سایدبار پروفایل و هدر هم از همین کوئری تغذیه می‌شوند */
export const useUpdateProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, userId }: { body: ProfileUpdate; userId?: string }) => meApi.updateProfile(body, userId),
    onSuccess: (user) => {
      qc.setQueryData(qk.me(user.id), user)
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: qk.adminUsers })
    },
  })
}

export const useChangePassword = () => useMutation({ mutationFn: meApi.changePassword })

/* --------------------------------- آدرس‌ها --------------------------------- */

/** ساخت یا ویرایش؛ پاسخ کل حساب است و کش پروفایل مستقیم با همان پر می‌شود */
export function useSaveAddress() {
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<AddressInput> }) =>
      id ? meApi.updateAddress(id, body, userId) : meApi.addAddress(body as AddressInput, userId),
    onSuccess: (user) => {
      qc.setQueryData(qk.me(userId), user)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  return useMutation({
    mutationFn: (id: string) => meApi.deleteAddress(id, userId),
    onSuccess: (user) => {
      qc.setQueryData(qk.me(userId), user)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

/* ------------------------------- علاقه‌مندی‌ها ------------------------------- */

/**
 * هر کارت کالا همین را صدا می‌زند؛ react-query درخواست‌های تکراری را یکی می‌کند.
 * مهمان فهرستی ندارد، پس تا ورود درخواستی هم زده نمی‌شود.
 */
export function useWishlist() {
  const { userId, token } = useSession()
  return useQuery({
    queryKey: qk.wishlist(userId),
    queryFn: () => wishlistApi.list(userId),
    enabled: MOCKING_ENABLED || Boolean(token),
  })
}

/**
 * قلب همان لحظه پر/خالی می‌شود و بعد با پاسخ سرور هماهنگ می‌شود؛ اگر درخواست
 * شکست بخورد، به حالت قبل برمی‌گردد.
 */
export function useToggleWishlist() {
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  const key = qk.wishlist(userId)

  return useMutation({
    mutationFn: ({ product, wished }: { product: Product; wished: boolean }) =>
      wished ? wishlistApi.remove(product.id, userId) : wishlistApi.add(product.id, userId),
    onMutate: async ({ product, wished }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Product[]>(key)
      qc.setQueryData<Product[]>(key, (list = []) =>
        wished ? list.filter((p) => p.id !== product.id) : [product, ...list],
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

/* ---------------------------------- orders ---------------------------------- */
export const useCreateOrder = () => useMutation({ mutationFn: orderApi.create })
/** ثبت نتیجه‌ی درگاه ساختگی؛ با درگاه واقعی این مسیر اصلاً صدا زده نمی‌شود */
export function usePayOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: PaymentOutcome }) => orderApi.payDemo(id, outcome),
    // سفارش تازه پرداخت‌شده باید در «سفارش‌های من» و پنل هم به‌روز دیده شود
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'orders'] })
      qc.invalidateQueries({ queryKey: qk.adminOrders })
    },
  })
}

/** شروع پرداخت: تصمیم «دمو یا بانک واقعی» را سرور می‌گیرد، نه مرورگر */
export const useStartPayment = () => useMutation({ mutationFn: orderApi.startPayment })
export const useValidateDiscount = () => useMutation({ mutationFn: orderApi.validateDiscount })

/* ---------------------------------- repair ---------------------------------- */
export const useRepairIssues = (deviceKind?: DeviceKind) =>
  useQuery({ queryKey: qk.repairIssues(deviceKind), queryFn: () => repairApi.issues(deviceKind) })
export const useCreateRepair = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: repairApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'repairs'] }),
  })
}

/* ----------------------------------- admin ---------------------------------- */
export const useAdminStats = () => useQuery({ queryKey: qk.adminStats, queryFn: adminApi.stats })
export const useAdminProducts = () =>
  useQuery({ queryKey: qk.adminProducts, queryFn: () => adminApi.products({ perPage: 100 }) })
export const useAdminOrders = () => useQuery({ queryKey: qk.adminOrders, queryFn: adminApi.orders })
export const useAdminRepairs = () => useQuery({ queryKey: qk.adminRepairs, queryFn: adminApi.repairs })
export const useAdminReviews = () => useQuery({ queryKey: qk.adminReviews, queryFn: adminApi.reviews })
export const useAdminDiscounts = () => useQuery({ queryKey: qk.adminDiscounts, queryFn: adminApi.discounts })
export const useDiscountCustomers = () =>
  useQuery({ queryKey: qk.adminDiscountCustomers, queryFn: adminApi.discountCustomers })
export const useAdminUsers = () => useQuery({ queryKey: qk.adminUsers, queryFn: adminApi.users })
export const useAdminCategories = () =>
  useQuery({ queryKey: qk.adminCategories, queryFn: adminApi.categories })
export const useAdminBrands = () => useQuery({ queryKey: qk.adminBrands, queryFn: adminApi.brands })
export const useAdminTags = () => useQuery({ queryKey: qk.adminTags, queryFn: adminApi.tags })

export const useAdmins = () => useQuery({ queryKey: qk.adminAdmins, queryFn: adminApi.admins })

/** پرونده‌ی یک کاربر؛ فقط وقتی کشوی جزئیات باز است fetch می‌شود */
export const useAdminUser = (id: string | null) =>
  useQuery({
    queryKey: qk.adminUser(id ?? ''),
    queryFn: () => adminApi.user(id!),
    enabled: Boolean(id),
  })

function useAdminMutation<TArgs, TData>(fn: (args: TArgs) => Promise<TData>, keys: readonly unknown[][]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((key) => qc.invalidateQueries({ queryKey: key })),
  })
}

export const useUpdateProduct = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateProduct>[1] }) =>
      adminApi.updateProduct(id, body),
    [[...qk.adminProducts], ['products'], [...qk.adminStats]],
  )

export const useCreateProduct = () =>
  useAdminMutation(adminApi.createProduct, [[...qk.adminProducts], ['products'], [...qk.adminStats]])

export const useDeleteProduct = () =>
  useAdminMutation(adminApi.deleteProduct, [[...qk.adminProducts], ['products'], [...qk.adminStats]])

/** تغییر کاربر روی جدول کاربران و لیست ادمین‌ها اثر دارد */
const USER_KEYS = [[...qk.adminUsers], [...qk.adminAdmins], ['me']]

/** ویرایش، پرونده‌ی باز را هم تازه می‌کند — ولی حذف نباید، وگرنه ۴۰۴ می‌گیرد */
export const useUpdateUser = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateUser>[1] }) =>
      adminApi.updateUser(id, body),
    [...USER_KEYS, ['admin', 'user']],
  )

export const useCreateUser = () => useAdminMutation(adminApi.createUser, USER_KEYS)

export const useDeleteUser = () => useAdminMutation(adminApi.deleteUser, USER_KEYS)

/** وضعیت سفارش از دو جا عوض می‌شود: جدول سفارش‌ها و پرونده‌ی کاربر — هر دو باید تازه شوند */
export const useUpdateOrder = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateOrder>[1] }) => adminApi.updateOrder(id, body),
    [[...qk.adminOrders], ['me', 'orders'], ['admin', 'user']],
  )

/** مثل سفارش، وضعیت تعمیر هم از پرونده‌ی کاربر عوض می‌شود */
export const useUpdateRepair = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateRepair>[1] }) =>
      adminApi.updateRepair(id, body),
    [[...qk.adminRepairs], ['me', 'repairs'], ['admin', 'user']],
  )

export const useModerateReview = () =>
  useAdminMutation(
    ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'pending' }) => adminApi.updateReview(id, status),
    [[...qk.adminReviews], [...qk.adminStats]],
  )

export const useCreateAdmin = () =>
  useAdminMutation(adminApi.createAdmin, [[...qk.adminAdmins], [...qk.adminUsers]])

export const useDeleteAdmin = () =>
  useAdminMutation(adminApi.deleteAdmin, [[...qk.adminAdmins], [...qk.adminUsers]])

/** تغییر مشکلات، هم فهرست پنل و هم فرم ثبت تعمیر در سایت را تازه می‌کند */
const REPAIR_ISSUE_KEYS = [[...qk.adminRepairIssues], ['repair', 'issues']]

export const useAdminRepairIssues = () =>
  useQuery({ queryKey: qk.adminRepairIssues, queryFn: adminApi.repairIssues })

export const useCreateRepairIssue = () => useAdminMutation(adminApi.createRepairIssue, REPAIR_ISSUE_KEYS)

export const useUpdateRepairIssue = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateRepairIssue>[1] }) =>
      adminApi.updateRepairIssue(id, body),
    REPAIR_ISSUE_KEYS,
  )

export const useDeleteRepairIssue = () => useAdminMutation(adminApi.deleteRepairIssue, REPAIR_ISSUE_KEYS)

export const useCreateDiscount = () => useAdminMutation(adminApi.createDiscount, [[...qk.adminDiscounts]])
export const useDeleteDiscount = () => useAdminMutation(adminApi.deleteDiscount, [[...qk.adminDiscounts]])
export const useUpdateDiscount = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateDiscount>[1] }) =>
      adminApi.updateDiscount(id, body),
    [[...qk.adminDiscounts]],
  )

/* --------------------------- دسته‌بندی و برند (ادمین) ------------------------ */

/** اسلاگ در محصولات، فیلترها و سکشن‌های لندینگ هم دیده می‌شود؛ همه باید تازه شوند */
const TAXONOMY_KEYS = [
  [...qk.adminCategories],
  [...qk.adminBrands],
  [...qk.adminTags],
  [...qk.categories],
  [...qk.tags],
  [...qk.brands],
  ['products'],
  [...qk.adminProducts],
  [...qk.home],
]

export const useCreateCategory = () => useAdminMutation(adminApi.createCategory, TAXONOMY_KEYS)
export const useUpdateCategory = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Partial<Parameters<typeof adminApi.createCategory>[0]> }) =>
      adminApi.updateCategory(id, body),
    TAXONOMY_KEYS,
  )
// حذف دسته کالاها را هم پاک یا بی‌دسته می‌کند، پس فهرست‌های کالا هم باید تازه شوند
export const useDeleteCategory = () =>
  useAdminMutation(adminApi.deleteCategory, [
    ...TAXONOMY_KEYS,
    [...qk.adminProducts],
    ['products'],
    ['product'],
    [...qk.adminStats],
  ])

export const useCreateBrand = () => useAdminMutation(adminApi.createBrand, TAXONOMY_KEYS)
export const useUpdateBrand = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Partial<Parameters<typeof adminApi.createBrand>[0]> }) =>
      adminApi.updateBrand(id, body),
    TAXONOMY_KEYS,
  )
export const useDeleteBrand = () => useAdminMutation(adminApi.deleteBrand, TAXONOMY_KEYS)

export const useCreateTag = () => useAdminMutation(adminApi.createTag, TAXONOMY_KEYS)
export const useUpdateTag = () =>
  useAdminMutation(
    ({ id, body }: { id: string; body: Partial<Parameters<typeof adminApi.createTag>[0]> }) =>
      adminApi.updateTag(id, body),
    TAXONOMY_KEYS,
  )
export const useDeleteTag = () => useAdminMutation(adminApi.deleteTag, TAXONOMY_KEYS)

/* ----------------------------------- پیامک ---------------------------------- */
export const useSmsSettings = () => useQuery({ queryKey: qk.smsSettings, queryFn: smsApi.settings })

export function useSaveSmsSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: smsApi.save,
    onSuccess: (saved) => qc.setQueryData(qk.smsSettings, saved),
  })
}

/** گزارش هر ۱۵ ثانیه تازه می‌شود تا پیامکِ رویدادِ همین حالا هم دیده شود */
export const useSmsMessages = () =>
  useQuery({ queryKey: qk.smsMessages, queryFn: smsApi.messages, refetchInterval: 15_000 })

export function useSendTestSms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: smsApi.test,
    onSettled: () => qc.invalidateQueries({ queryKey: qk.smsMessages }),
  })
}

/* -------------------------------- خبرم کن -------------------------------- */
export function useStockAlerts() {
  const { userId, token } = useSession()
  return useQuery({
    queryKey: qk.stockAlerts(userId),
    queryFn: stockAlertApi.list,
    enabled: MOCKING_ENABLED || Boolean(token),
  })
}

/** اگر `alert` داده شود لغو می‌شود، وگرنه ثبت */
export function useToggleStockAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ alert, productId, variantTitle }: { alert?: StockAlert; productId: string; variantTitle: string }) =>
      alert ? stockAlertApi.remove(alert.id).then(() => null) : stockAlertApi.add({ productId, variantTitle }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['me', 'stock-alerts'] }),
  })
}
