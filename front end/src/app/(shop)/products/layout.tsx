import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'همه محصولات',
  description: 'گوشی موبایل، لپ‌تاپ، کنسول بازی و لوازم جانبی — با فیلتر دسته، برند، قیمت و امتیاز.',
  // فیلترها در نشانی می‌نشینند و ده‌ها آدرس با محتوای نزدیک می‌سازند؛ همه به همین یکی اشاره می‌کنند
  alternates: { canonical: '/products' },
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children
}
