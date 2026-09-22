import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سفارش‌های من',
  description: 'پیگیری وضعیت و جزئیات سفارش‌های ثبت‌شده.',
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children
}
