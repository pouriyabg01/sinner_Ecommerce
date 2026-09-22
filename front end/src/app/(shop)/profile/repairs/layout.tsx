import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'تعمیرات من',
  description: 'وضعیت دستگاه‌هایی که برای تعمیر ثبت کرده‌اید.',
}

export default function RepairsLayout({ children }: { children: React.ReactNode }) {
  return children
}
