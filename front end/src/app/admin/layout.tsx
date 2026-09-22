import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { AdminGate } from '@/components/admin/admin-gate'

// عنوان عمداً اینجا نیست تا HTML سرور پنل را لو ندهد؛ AdminGate بعد از ورود می‌گذاردش
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <AdminShell>{children}</AdminShell>
    </AdminGate>
  )
}
