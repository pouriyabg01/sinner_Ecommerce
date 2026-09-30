import type { Metadata } from 'next'
import { siteIdentity } from '@/lib/site-meta'

export async function generateMetadata(): Promise<Metadata> {
  const site = await siteIdentity()

  return {
    title: 'درباره ما',
    description: `داستان ${site.name}، تیم، و راه‌های تماس با فروشگاه و تعمیرگاه.`,
    alternates: { canonical: '/about' },
  }
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
