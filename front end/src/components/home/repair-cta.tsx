'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowLeft, Check } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RepairCta({ title, subtitle, bullets, ctaLabel, ctaHref, image }: SectionProps['repair_cta']) {
  return (
    <div className="container-page">
      <div className="relative grid overflow-hidden rounded-card border border-brand-500/20 bg-gradient-to-bl from-brand-600 to-brand-800 md:grid-cols-2">
        {/*
         * روی گوشی ستون تصویر زیر متن می‌افتاد و یک قاب بلندِ تقریباً خالی می‌ساخت.
         * اینجا همان تصویر پس‌زمینه‌ی کم‌رنگ پشت متن است؛ ستون جدا از md به بعد.
         */}
        <div className="absolute inset-0 md:hidden" aria-hidden>
          <Image src={image} alt="" fill sizes="100vw" className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-700/40 via-brand-700/80 to-brand-800/95" />
        </div>

        <div className="relative z-10 flex flex-col justify-center gap-4 p-6 sm:gap-5 sm:p-12">
          <motion.h2
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-balance text-xl font-bold leading-[1.7] text-white sm:text-3xl"
          >
            {title}
          </motion.h2>
          <p className="max-w-md text-[13px] leading-7 text-white/75 sm:text-sm sm:leading-8">{subtitle}</p>

          <ul className="space-y-1.5 sm:space-y-2.5">
            {bullets.map((bullet, i) => (
              <motion.li
                key={bullet}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-2.5 text-[13px] leading-7 text-white/90"
              >
                <span className="mt-1 grid size-4.5 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check className="size-3" />
                </span>
                {bullet}
              </motion.li>
            ))}
          </ul>

          <Link
            href={ctaHref}
            className={cn(
              buttonVariants({ size: 'lg' }),
              // روی گوشی تمام‌عرض: هدف لمسی بزرگ‌تر و بدون جای خالی کنارش
              'group mt-1 w-full bg-white text-brand-700 shadow-none hover:bg-ink-50 sm:mt-2 sm:w-fit',
            )}
          >
            {ctaLabel}
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        <div className="relative hidden min-h-56 md:block">
          <Image src={image} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-brand-700/70 md:bg-gradient-to-l md:from-transparent md:to-brand-700" />
        </div>
      </div>
    </div>
  )
}
