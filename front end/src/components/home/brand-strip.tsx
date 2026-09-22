'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { SectionProps } from '@/types/cms'
import { useBrands } from '@/lib/api/queries'

/** فقط SVG را می‌شود با currentColor رنگ کرد؛ بقیه باید تصویر واقعی بمانند */
const isMaskable = (logo: string) => /\.svg(\?|#|$)/i.test(logo) || logo.startsWith('data:image/svg+xml')

export function BrandStrip({ title, brandSlugs }: SectionProps['brand_strip']) {
  const { data } = useBrands()
  const brands = (data ?? []).filter((b) => brandSlugs.includes(b.slug))
  if (!brands.length) return null

  return (
    <div className="container-page">
      <p className="mb-5 text-center text-xs font-medium tracking-wide text-muted">{title}</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-10 hover:[animation-play-state:paused]">
          {[...brands, ...brands].map((brand, i) => (
            <Link
              key={`${brand.id}-${i}`}
              href={`/products?brands=${brand.slug}`}
              aria-label={brand.title}
              className="shrink-0 text-muted opacity-80 transition-all duration-300 hover:text-brand-500 hover:opacity-100"
            >
              {!brand.logo ? (
                // برندی که از پنل بدون لوگو ساخته شده، با نامش نمایش داده می‌شود
                <span aria-hidden className="grid h-9 w-[120px] place-items-center text-[13px] font-bold">
                  {brand.title}
                </span>
              ) : isMaskable(brand.logo) ? (
                /* SVG تک‌رنگ به‌جای <img> با mask کشیده می‌شود تا رنگش از متن بیاید و در هر دو تم دیده شود */
                <span
                  aria-hidden
                  style={{ '--logo': `url("${brand.logo}")` } as React.CSSProperties}
                  className="mask-logo block h-9 w-[120px]"
                />
              ) : (
                // لوگوی رستری (مثلاً PNG آپلودشده) با mask به یک لکه‌ی یک‌دست تبدیل می‌شود
                <Image
                  src={brand.logo}
                  alt=""
                  width={120}
                  height={36}
                  unoptimized
                  className="h-9 w-[120px] object-contain"
                />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
