export type OrderStatus =
  | 'pending_payment'
  | 'processing'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'در انتظار پرداخت',
  processing: 'در حال بررسی',
  packing: 'آماده‌سازی بسته',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شد',
  cancelled: 'لغو شده',
  returned: 'مرجوع شده',
}

/* --------------------------------- پرداخت --------------------------------- */

export type PaymentMethodId = 'online' | 'cod' | 'installment'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodId, string> = {
  online: 'پرداخت اینترنتی',
  cod: 'پرداخت در محل',
  installment: 'خرید اقساطی',
}

/**
 * نتیجه‌ی تلاش پرداخت، جدا از وضعیت سفارش نگه داشته می‌شود: سفارشِ «در حال
 * بررسی» می‌تواند آنلاین پرداخت‌شده باشد یا پرداخت‌در‌محل و هنوز پرداخت‌نشده.
 */
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'cancelled'

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'پرداخت‌نشده',
  paid: 'پرداخت شد',
  failed: 'ناموفق',
  cancelled: 'انصراف کاربر',
}

export interface OrderItem {
  productId: string
  title: string
  image: string
  variantTitle?: string
  unitPrice: number
  quantity: number
}

export interface Order {
  id: string
  code: string
  userId: string
  items: OrderItem[]
  subtotal: number
  discount: number
  shippingCost: number
  total: number
  status: OrderStatus
  paymentMethod: PaymentMethodId
  paymentStatus: PaymentStatus
  /** کد رهگیری بانک؛ فقط وقتی پرداخت موفق بوده پر می‌شود */
  paymentRef: string | null
  addressSummary: string
  /** روزی که مشتری برای تحویل خواسته (`YYYY-MM-DD`)؛ null یعنی زودترین زمان ممکن */
  preferredDeliveryDate: string | null
  trackingCode: string | null
  createdAt: string
  timeline: { status: OrderStatus; at: string; note?: string }[]
}

/** سفارش در پنل، به‌علاوه‌ی مشخصات تماس صاحبش تا برای هماهنگی ارسال درخواست جدا لازم نباشد */
export interface AdminOrder extends Order {
  customer: { id: string; fullName: string; phone: string } | null
  /**
   * وضعیت‌هایی که از وضعیت فعلی می‌شود به آن‌ها رفت. سرور تعیینش می‌کند تا پنل
   * گزینه‌ای نشان ندهد که در نهایت رد می‌شود — و سفارش از «در انتظار پرداخت»
   * یکباره «تحویل داده شد» نشود.
   */
  allowedNext: OrderStatus[]
}
