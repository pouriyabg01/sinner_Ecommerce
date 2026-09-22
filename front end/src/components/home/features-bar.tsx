'use client'

import { motion } from 'motion/react'
import type { SectionProps } from '@/types/cms'
import { getIcon } from '@/lib/icons'

export function FeaturesBar({ items }: SectionProps['features_bar']) {
  return (
    <div className="container-page">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => {
          const Icon = getIcon(item.icon)
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand-300 dark:hover:border-brand-800"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 transition-transform duration-300 group-hover:scale-110 dark:text-brand-400">
                <Icon className="size-5.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{item.title}</span>
                <span className="block truncate text-xs text-muted">{item.subtitle}</span>
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
