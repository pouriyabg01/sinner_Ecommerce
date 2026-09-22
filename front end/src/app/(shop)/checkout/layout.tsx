import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'تکمیل سفارش',
  description: 'انتخاب آدرس، روش پرداخت و ثبت نهایی سفارش.',
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
