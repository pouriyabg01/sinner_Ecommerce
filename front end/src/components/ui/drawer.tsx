'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { cn } from '@/lib/utils'

export function Drawer({
  open,
  onClose,
  title,
  side = 'start',
  widthClass = 'w-full max-w-md',
  footer,
  originRef,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  side?: 'start' | 'end' | 'bottom'
  widthClass?: string
  footer?: React.ReactNode
  /** اگر داده شود، کشو از مرکز همین المان باز و بسته می‌شود (مثلاً آیکون سبد خرید) */
  originRef?: RefObject<HTMLElement | null>
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // مبدأ ترنسفورم پیش از اولین paint مستقیماً روی گره DOM نوشته می‌شود تا
  // فریم اولِ انیمیشن هم از محل آیکون شروع شود، نه از مرکز پنل.
  useLayoutEffect(() => {
    const panel = panelRef.current
    const anchor = originRef?.current
    if (!open || !panel || !anchor) return
    const a = anchor.getBoundingClientRect()
    // getBoundingClientRect پنل در این لحظه از قبل اسکیل‌شده است، پس مبدأ را
    // از offsetLeft/offsetTop می‌گیریم که ترنسفورم رویشان اثری ندارد.
    const parent = panel.offsetParent?.getBoundingClientRect()
    const left = (parent?.left ?? 0) + panel.offsetLeft
    const top = (parent?.top ?? 0) + panel.offsetTop
    panel.style.transformOrigin = `${a.left + a.width / 2 - left}px ${a.top + a.height / 2 - top}px`
  }, [open, originRef])

  const isBottom = side === 'bottom'
  const fromOrigin = Boolean(originRef)

  // در RTL: start = سمت راست صفحه، end = سمت چپ.
  const anchorClass = isBottom
    ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl'
    : cn('inset-y-0 h-full', widthClass, side === 'start' ? 'start-0' : 'end-0')

  // پنلِ چسبیده به لبه‌ی start با translateX مثبت از کادر خارج می‌شود و برعکس.
  const hidden = isBottom ? { y: '100%' } : { x: side === 'start' ? '100%' : '-100%' }
  const shown = isBottom ? { y: 0 } : { x: 0 }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-100">
          <motion.div
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('absolute flex flex-col bg-surface shadow-lift', anchorClass)}
            initial={fromOrigin ? { opacity: 0, scale: 0.72 } : hidden}
            animate={fromOrigin ? { opacity: 1, scale: 1 } : shown}
            exit={fromOrigin ? { opacity: 0, scale: 0.72 } : hidden}
            transition={
              fromOrigin
                ? { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                : { type: 'spring', damping: 30, stiffness: 300 }
            }
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-bold">{title}</h2>
              <button
                onClick={onClose}
                aria-label="بستن"
                className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <footer className="border-t border-border px-5 py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
