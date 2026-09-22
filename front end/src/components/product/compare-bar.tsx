'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { GitCompareArrows, X } from 'lucide-react'
import { useCompareStore, MAX_COMPARE } from '@/store/compare'
import { useCompare } from '@/lib/api/queries'
import { buttonVariants } from '@/components/ui/button'
import { toFaDigits } from '@/lib/format'

export function CompareBar() {
  const { ids, remove, clear } = useCompareStore()
  const { data } = useCompare(ids)

  return (
    <AnimatePresence>
      {ids.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-x-0 bottom-0 z-90 border-t border-border bg-surface/95 backdrop-blur-lg print:hidden"
        >
          <div className="container-page flex items-center gap-3 py-3">
            <span className="hidden shrink-0 items-center gap-2 text-[13px] font-medium sm:flex">
              <GitCompareArrows className="size-4 text-brand-500" />
              مقایسه ({toFaDigits(ids.length)} از {toFaDigits(MAX_COMPARE)})
            </span>

            {/*
              overflow-x-auto باعث می‌شود کلیپ روی محور عمودی هم اعمال شود و دکمه‌ی
              حذف که ۶ پیکسل بیرون از تامبنیل نشسته بریده شود. پدینگ به کلیپ فضا
              می‌دهد و مارجین منفی همان اندازه را از چیدمان پس می‌گیرد.
            */}
            <ul className="-m-2 flex flex-1 items-center gap-2 overflow-x-auto p-2 no-scrollbar">
              {(data?.items ?? []).map((p) => (
                <li key={p.id} className="relative shrink-0">
                  <Image
                    src={p.images[0]}
                    alt={p.title}
                    width={48}
                    height={48}
                    className="size-12 rounded-xl bg-ink-950 object-cover"
                  />
                  <button
                    onClick={() => remove(p.id)}
                    aria-label={`حذف ${p.title}`}
                    className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink-900 text-white shadow-soft transition-transform hover:scale-110 dark:bg-white dark:text-ink-900"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>

            <button onClick={clear} className="shrink-0 text-xs text-muted hover:text-red-500">
              پاک کردن
            </button>
            <Link href="/compare" className={buttonVariants({ size: 'sm' })}>
              مقایسه کن
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
