import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Product } from '@/types/catalog'
import { absoluteUrl, serverGet } from '@/lib/api/server'

type Params = { params: Promise<{ slug: string }> }

/**
 * نکست درخواست یکسان را در یک رندر فقط یک بار می‌فرستد؛ متادیتا و JSON-LD از همین می‌خوانند.
 * کالایی که سرور می‌گوید نیست (حذف یا غیرفعال شده) صفحه‌ی ۴۰۴ واقعی می‌گیرد؛ وگرنه موتور
 * جست‌وجو یک صفحه‌ی خالی با کد ۲۰۰ را ایندکس می‌کرد.
 */
const fetchProduct = (slug: string) => serverGet<{ product: Product }>(`/products/${encodeURIComponent(slug)}`)

const describe = (product: Product) =>
  (product.shortDescription || product.description).replace(/\s+/g, ' ').trim().slice(0, 160)

/**
 * صفحه‌ی کالا در مرورگر ساخته می‌شود، پس بدون این لایه HTML اولیه نه نام کالا را داشت
 * نه توضیحش را و گوگل و پیش‌نمایش لینک در شبکه‌های اجتماعی فقط عنوان کلی سایت را می‌دیدند.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  // notFound() اینجا صدا زده نمی‌شود: متادیتا را خالی می‌کرد و تب بدون عنوان می‌ماند
  const result = await fetchProduct((await params).slug)
  if (result?.status === 404) return { title: 'صفحه پیدا نشد' }
  const product = result?.data?.product
  if (!product) return { title: 'محصول' }

  const image = product.images[0]
  return {
    title: product.title,
    description: describe(product),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description: describe(product),
      url: `/product/${product.slug}`,
      images: image ? [{ url: absoluteUrl(image), alt: product.title }] : undefined,
    },
  }
}

export default async function ProductLayout({ children, params }: Params & { children: React.ReactNode }) {
  const result = await fetchProduct((await params).slug)
  if (result?.status === 404) notFound()
  const product = result?.data?.product ?? null

  // داده‌ی ساختاریافته‌ی کالا: قیمت، موجودی و امتیاز در نتیجه‌ی جست‌وجوی گوگل دیده می‌شود
  const jsonLd = product && {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: describe(product),
    image: product.images.map(absoluteUrl),
    sku: product.slug,
    brand: { '@type': 'Brand', name: product.brandSlug },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/product/${product.slug}`),
      // قیمت‌ها به تومان ذخیره شده‌اند و واحد استاندارد ریال است
      priceCurrency: 'IRR',
      price: product.price * 10,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.reviewCount > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount },
    }),
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // < در JSON می‌تواند تگ script را زودتر ببندد
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  )
}
