import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'پیگیری تعمیر',
  description: 'وضعیت دستگاهی که برای تعمیر ثبت کرده‌اید را با کد پیگیری ببینید.',
  alternates: { canonical: '/repair/track' },
}

export default function RepairTrackLayout({ children }: { children: React.ReactNode }) {
  return children
}
