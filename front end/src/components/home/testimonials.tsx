'use client'

import { motion } from 'motion/react'
import { Quote } from 'lucide-react'
import type { SectionProps } from '@/types/cms'
import { SectionHeading } from '@/components/ui/section-heading'
import { Rating } from '@/components/ui/rating'

export function Testimonials({ title, items }: SectionProps['testimonials']) {
  return (
    <div className="container-page">
      <SectionHeading title={title} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <motion.figure
            key={item.id}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.09 }}
            className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-surface p-6 transition-colors hover:border-brand-300 dark:hover:border-brand-800"
          >
            <Quote className="absolute -end-2 -top-2 size-16 text-brand-500/8" />
            <Rating value={item.rating} showValue={false} />
            <blockquote className="flex-1 text-[13px] leading-8 text-muted">{item.body}</blockquote>
            <figcaption className="flex items-center gap-3 border-t border-border pt-4">
              <span className="grid size-10 place-items-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600 dark:text-brand-400">
                {item.name.charAt(0)}
              </span>
              <span>
                <span className="block text-[13px] font-bold">{item.name}</span>
                <span className="block text-[11px] text-muted">{item.role}</span>
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  )
}
