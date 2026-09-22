import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'آدرس‌ها',
  description: 'مدیریت آدرس‌های تحویل سفارش و پیک تعمیر.',
}

export default function AddressesLayout({ children }: { children: React.ReactNode }) {
  return children
}
