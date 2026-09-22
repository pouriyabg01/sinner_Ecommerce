import type { Metadata } from 'next'

export const metadata: Metadata = {
  /* زیرصفحه‌ها عنوان خودشان را دارند؛ بدون template دوباره، پسوند «| سینر» را از دست می‌دهند */
  title: {
    default: 'سفارش تعمیر',
    template: '%s | سینر',
  },
  description: 'ثبت درخواست تعمیر گوشی، لپ‌تاپ و کنسول با پیک رایگان درب منزل.',
}

export default function RepairLayout({ children }: { children: React.ReactNode }) {
  return children
}
