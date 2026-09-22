import type { OrderStatus } from '@/types/order'
import { REPAIR_STATUS_LABEL, type RepairStatus } from '@/types/repair'

/**
 * آینه‌ی `OrderStatusFlow` و `RepairStatusFlow` در بک‌اند.
 *
 * منبع اصلی سرور است — خودِ برنامه هیچ‌وقت از این فایل نمی‌خواند و فهرست
 * وضعیت‌های مجاز را از پاسخ API می‌گیرد. این نسخه فقط برای لایه‌ی mock است تا
 * بدون بک‌اند هم همان قواعد دیده شود؛ با تغییر قواعد در سرور، اینجا هم باید
 * به‌روز شود.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['processing', 'cancelled'],
  processing: ['packing', 'cancelled'],
  packing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
}

export const REPAIR_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  submitted: ['pickup_scheduled', 'received', 'rejected'],
  pickup_scheduled: ['received', 'rejected'],
  received: ['diagnosing', 'rejected'],
  diagnosing: ['quoted', 'rejected'],
  quoted: ['awaiting_approval', 'rejected'],
  awaiting_approval: ['awaiting_payment', 'rejected'],
  awaiting_payment: ['repairing', 'rejected'],
  repairing: ['ready', 'rejected'],
  ready: ['returning', 'completed'],
  returning: ['completed'],
  completed: [],
  rejected: [],
}

/** «در انتظار پرداخت» را تأیید خودِ مشتری می‌سازد، نه ادمین */
const CUSTOMER_ONLY: RepairStatus[] = ['awaiting_payment']

/** بدون هزینه‌ی نهایی، این وضعیت‌ها معنی ندارند */
const REQUIRES_FINAL_COST: RepairStatus[] = ['quoted', 'awaiting_approval']

export const repairNextForAdmin = (status: RepairStatus): RepairStatus[] =>
  REPAIR_TRANSITIONS[status].filter((s) => !CUSTOMER_ONLY.includes(s))

export const repairRequirement = (status: RepairStatus, finalCost: number | null): string | null =>
  REQUIRES_FINAL_COST.includes(status) && !finalCost
    ? `برای «${REPAIR_STATUS_LABEL[status]}» اول باید هزینه‌ی نهایی را وارد کنید`
    : null

/** وضعیت‌های مسدود همراه دلیلشان — همان چیزی که سرور در `blockedNext` می‌دهد */
export const repairBlockedNext = (
  status: RepairStatus,
  finalCost: number | null,
): Partial<Record<RepairStatus, string>> =>
  Object.fromEntries(
    repairNextForAdmin(status)
      .map((s) => [s, repairRequirement(s, finalCost)])
      .filter(([, reason]) => reason),
  )
