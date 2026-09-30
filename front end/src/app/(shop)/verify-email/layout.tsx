import type { Metadata } from 'next'

/** صفحه‌ی توکن‌دار است و برای موتور جست‌وجو معنایی ندارد */
export const metadata: Metadata = { title: 'تأیید ایمیل', robots: { index: false } }

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children
}
