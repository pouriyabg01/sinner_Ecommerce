import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'مقایسه محصولات',
  description: 'مشخصات فنی و قیمت چند کالا را کنار هم ببینید و بهترین را انتخاب کنید.',
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
