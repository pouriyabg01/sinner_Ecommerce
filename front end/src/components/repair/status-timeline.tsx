'use client'

import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { REPAIR_STATUS_LABEL, type RepairRequest } from '@/types/repair'
import { formatDateTime } from '@/lib/format'

export function RepairTimeline({ timeline }: { timeline: RepairRequest['timeline'] }) {
  return (
    <ol className="relative space-y-5 ps-7">
      <span className="absolute bottom-2 start-2.5 top-2 w-px bg-border" />
      {timeline.map((step, i) => {
        const isLast = i === timeline.length - 1
        return (
          <motion.li
            key={`${step.status}-${step.at}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="relative"
          >
            <span
              className={`absolute -start-7 top-0.5 grid size-5 place-items-center rounded-full ring-4 ring-surface ${
                isLast ? 'bg-brand-500 text-white' : 'bg-brand-500/25 text-brand-700 dark:text-brand-300'
              }`}
            >
              <Check className="size-3" />
            </span>
            <p className="text-[13px] font-bold">{REPAIR_STATUS_LABEL[step.status]}</p>
            <p className="mt-0.5 text-[11px] text-muted">{formatDateTime(step.at)}</p>
            {step.note && <p className="mt-1.5 text-[12px] leading-6 text-muted">{step.note}</p>}
          </motion.li>
        )
      })}
    </ol>
  )
}
