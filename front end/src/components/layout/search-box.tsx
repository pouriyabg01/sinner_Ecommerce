'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2, Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useProducts } from '@/lib/api/queries'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

export function SearchBox({ className }: { className?: string }) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [focused, setFocused] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 280)
    return () => clearTimeout(id)
  }, [term])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const open = focused && debounced.length > 1
  // پیشنهادها فقط با دست‌کم دو حرف نشان داده می‌شوند؛ بدون این شرط هر صفحه یک درخواست بی‌فایده می‌زد
  const { data, isFetching } = useProducts({ q: debounced, perPage: 5 }, { enabled: debounced.length > 1 })
  const results = data?.items ?? []

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (term.trim()) router.push(`/products?q=${encodeURIComponent(term.trim())}`)
          setFocused(false)
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4.5 -translate-y-1/2 text-muted" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="دنبال چی می‌گردی؟ گوشی، لپ‌تاپ، بازی…"
          className="h-11 w-full rounded-2xl border border-border bg-surface-2/70 ps-11 pe-10 text-sm outline-none transition-all placeholder:text-muted/80 focus:border-brand-400 focus:bg-surface focus:shadow-[0_0_0_4px_rgba(0,179,146,0.12)]"
        />
        {isFetching && debounced ? (
          <Loader2 className="absolute end-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />
        ) : term ? (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="پاک کردن"
            className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border bg-surface shadow-lift"
          >
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                {isFetching ? 'در حال جست‌وجو…' : 'نتیجه‌ای یافت نشد. لطفاً عبارت دیگری را جست‌وجو کنید.'}
              </p>
            ) : (
              <>
                <ul className="max-h-80 overflow-y-auto p-1.5">
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/product/${p.slug}`}
                        onClick={() => setFocused(false)}
                        className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2"
                      >
                        <Image
                          src={p.images[0]}
                          alt=""
                          width={44}
                          height={44}
                          className="size-11 shrink-0 rounded-lg bg-ink-950 object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{p.title}</span>
                          <span className="block text-xs text-muted">{formatPrice(p.price)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/products?q=${encodeURIComponent(debounced)}`}
                  onClick={() => setFocused(false)}
                  className="block border-t border-border px-4 py-3 text-center text-[13px] font-medium text-brand-600 hover:bg-surface-2 dark:text-brand-400"
                >
                  دیدن همه‌ی نتایج
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
