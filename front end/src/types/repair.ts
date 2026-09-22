import type { PaymentStatus } from './order'

/** سفارش تعمیر / سرویس — بخش کلیدی سایت */
export type DeviceKind = 'mobile' | 'laptop' | 'console' | 'tablet' | 'desktop' | 'other'

export const DEVICE_KIND_LABEL: Record<DeviceKind, string> = {
  mobile: 'گوشی موبایل',
  laptop: 'لپ‌تاپ',
  console: 'کنسول بازی',
  tablet: 'تبلت',
  desktop: 'کامپیوتر رومیزی',
  other: 'سایر',
}

/** مشکلات رایج که کاربر از لیست انتخاب می‌کند (به‌جای توضیح دادن) */
export interface CommonIssue {
  id: string
  deviceKinds: DeviceKind[]
  title: string
  hint: string
  icon: string
  estimatedMin: number
  estimatedMax: number
  estimatedDays: number
}

/** روش رساندن دستگاه: پست، پیک درب منزل، یا حضوری */
export type PickupMethod = 'courier' | 'post' | 'in_person'

export const PICKUP_METHOD_LABEL: Record<PickupMethod, string> = {
  courier: 'پیک رایگان درب منزل',
  post: 'ارسال با پست',
  in_person: 'تحویل حضوری در فروشگاه',
}

export type RepairStatus =
  | 'submitted'
  | 'pickup_scheduled'
  | 'received'
  | 'diagnosing'
  | 'quoted'
  | 'awaiting_approval'
  | 'awaiting_payment'
  | 'repairing'
  | 'ready'
  | 'returning'
  | 'completed'
  | 'rejected'

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  submitted: 'ثبت شد',
  pickup_scheduled: 'زمان پیک تعیین شد',
  received: 'دستگاه دریافت شد',
  diagnosing: 'در حال عیب‌یابی',
  quoted: 'اعلام هزینه',
  awaiting_approval: 'در انتظار تأیید شما',
  awaiting_payment: 'در انتظار پرداخت',
  repairing: 'در حال تعمیر',
  ready: 'آماده تحویل',
  returning: 'در حال ارسال به شما',
  completed: 'تکمیل شده',
  rejected: 'انصراف / غیرقابل تعمیر',
}

export interface RepairRequest {
  id: string
  code: string
  userId: string
  deviceKind: DeviceKind
  deviceBrand: string
  deviceModel: string
  /** شناسه‌های CommonIssue انتخاب‌شده */
  issueIds: string[]
  /** توضیح آزاد کاربر */
  issueDescription: string
  photos: string[]
  pickupMethod: PickupMethod
  addressSummary: string
  preferredDate: string | null
  status: RepairStatus
  /** هزینه‌ی برآوردی اولیه بر اساس مشکلات انتخاب‌شده */
  estimatedCost: { min: number; max: number }
  /** هزینه‌ی قطعی پس از عیب‌یابی */
  finalCost: number | null
  technicianNote: string | null
  warrantyDays: number
  createdAt: string
  timeline: { status: RepairStatus; at: string; note?: string }[]
  /** پرداخت هزینه‌ی تعمیر، جدا از وضعیت خودِ تعمیر */
  paymentStatus: PaymentStatus
  /** کد پیگیری بانک؛ فقط بعد از پرداخت موفق پر می‌شود */
  paymentRef: string | null
  /** لحظه‌ای که مشتری برآورد را پذیرفت؛ null یعنی هنوز تأیید نکرده */
  approvedAt: string | null
}

/**
 * همان درخواست تعمیر، به‌علاوه‌ی مشخصات تماس صاحبش.
 * پنل بدون شماره‌ی مشتری عملاً نمی‌تواند هماهنگ کند، و `userId` تنها به‌دردی نمی‌خورد؛
 * پس سرور آن را همان‌جا ضمیمه می‌کند تا لیست تعمیرها یک درخواست بیشتر نزند.
 */
export interface AdminRepairRequest extends RepairRequest {
  customer: { id: string; fullName: string; phone: string } | null
  /** وضعیت‌های مجازِ بعدی برای ادمین — «در انتظار پرداخت» در آن نیست چون تأیید مشتری می‌سازدش */
  allowedNext: RepairStatus[]
  /**
   * از میان `allowedNext`، آن‌هایی که شرطشان هنوز برقرار نیست، همراه دلیل.
   * مثلاً «اعلام هزینه» تا وقتی هزینه‌ی نهایی وارد نشده قابل ثبت نیست.
   */
  blockedNext: Partial<Record<RepairStatus, string>>
}

/**
 * پاسخ عمومی «پیگیری با کد». بدون ورود باز می‌شود، پس نشانی، عکس‌ها، شرح مشتری و
 * شناسه‌ی کاربر در آن نیست — وگرنه با حدس زدن کد لو می‌رفت.
 */
export type RepairTracking = Omit<RepairRequest, 'userId' | 'addressSummary' | 'photos' | 'issueDescription'>
