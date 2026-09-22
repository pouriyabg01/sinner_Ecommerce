import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'همه محصولات',
  description: 'گوشی موبایل، لپ‌تاپ، کنسول بازی و لوازم جانبی — با فیلتر دسته، برند، قیمت و امتیاز.',
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children
}
