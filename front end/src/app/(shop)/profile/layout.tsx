import type { Metadata } from 'next'
import { ProfileShell } from '@/components/profile/profile-shell'

/* پوسته‌ی کلاینتی جداست تا این لایه بتواند metadata صادر کند */
export const metadata: Metadata = {
  /* زیرصفحه‌ها عنوان خودشان را دارند؛ بدون template دوباره، پسوند «| سینر» را از دست می‌دهند */
  title: {
    default: 'پنل کاربری',
    template: '%s | سینر',
  },
  description: 'سفارش‌ها، تعمیرات، آدرس‌ها و اطلاعات حساب شما.',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileShell>{children}</ProfileShell>
}
