import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'اطلاعات حساب',
  description: 'ویرایش نام، شماره تماس، ایمیل و تصویر پروفایل.',
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
