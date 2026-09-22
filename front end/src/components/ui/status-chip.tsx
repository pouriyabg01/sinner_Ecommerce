import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus, type PaymentStatus } from '@/types/order'
import { REPAIR_STATUS_LABEL, type RepairStatus } from '@/types/repair'

const orderTone: Record<OrderStatus, 'brand' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending_payment: 'warning',
  processing: 'brand',
  packing: 'brand',
  shipped: 'brand',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'neutral',
}

const repairTone: Record<RepairStatus, 'brand' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  submitted: 'neutral',
  pickup_scheduled: 'brand',
  received: 'brand',
  diagnosing: 'brand',
  quoted: 'warning',
  awaiting_approval: 'warning',
  awaiting_payment: 'warning',
  repairing: 'brand',
  ready: 'success',
  returning: 'brand',
  completed: 'success',
  rejected: 'danger',
}

const paymentTone: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  unpaid: 'neutral',
  failed: 'danger',
  cancelled: 'warning',
}

export const OrderStatusChip = ({ status }: { status: OrderStatus }) => (
  <Badge tone={orderTone[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
)

export const RepairStatusChip = ({ status }: { status: RepairStatus }) => (
  <Badge tone={repairTone[status]}>{REPAIR_STATUS_LABEL[status]}</Badge>
)

export const PaymentStatusChip = ({ status }: { status: PaymentStatus }) => (
  <Badge tone={paymentTone[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>
)
