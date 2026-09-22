'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import { BannerBackground, defaultBannerColor, isLightColor } from './banner-background'
import { cn } from '@/lib/utils'

export function BannerDuo({ banners }: SectionProps['banner_duo']) {
  return (
    <div className="container-page">
      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((banner, i) => {
          const withPattern = banner.backgroundType === 'pattern'
          const color = banner.backgroundColor || defaultBannerColor(banner.accent)
          // روی رنگ روشن متن سفید خوانده نمی‌شد
          const light = withPattern && isLightColor(color)
          return (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Link
              href={banner.href}
              className="group relative block overflow-hidden rounded-card"
            >
              <div className="relative aspect-[16/7]">
                {withPattern ? (
                  <BannerBackground
                    color={color}
                    accent={banner.accent}
                    pattern={banner.pattern ?? 'rings'}
                    className="transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <Image
                      src={banner.image}
                      alt={banner.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-ink-950/80" />
                  </>
                )}
                <div className="absolute inset-0 flex flex-col justify-center gap-2 p-7">
                  <span className="h-1 w-10 rounded-full" style={{ backgroundColor: banner.accent }} />
                  <h3 className={cn('text-lg font-bold leading-8 sm:text-xl', light ? 'text-ink-950' : 'text-white')}>
                    {banner.title}
                  </h3>
                  <p className={cn('text-xs', light ? 'text-ink-950/70' : 'text-white/70')}>{banner.subtitle}</p>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium',
                      light ? 'text-ink-950' : 'text-white',
                    )}
                  >
                    {banner.ctaLabel || 'مشاهده'}
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1.5" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
          )
        })}
      </div>
    </div>
  )
}
