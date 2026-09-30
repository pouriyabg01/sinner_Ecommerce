import type { Metadata } from 'next'
import { siteIdentity } from '@/lib/site-meta'

export async function generateMetadata(): Promise<Metadata> {
  const site = await siteIdentity()

  return {
    /* زیرصفحه‌ها عنوان خودشان را دارند؛ بدون template دوباره، پسوند نام سایت را از دست می‌دهند */
    title: {
      default: 'سفارش تعمیر',
      template: `%s | ${site.name}`,
    },
    description: 'ثبت درخواست تعمیر گوشی، لپ‌تاپ و کنسول با پیک رایگان درب منزل.',
    alternates: { canonical: '/repair' },
  }
}

export default function RepairLayout({ children }: { children: React.ReactNode }) {
  return children
}
