import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'درباره ما',
  description: 'داستان سینر، تیم، و راه‌های تماس با فروشگاه و تعمیرگاه.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
