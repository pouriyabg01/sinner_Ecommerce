'use client'

import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { create } from 'zustand'

type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: string
  tone: ToastTone
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (m: string) => useToast.getState().push(m, 'success'),
  error: (m: string) => useToast.getState().push(m, 'error'),
  info: (m: string) => useToast.getState().push(m, 'info'),
}

const icons = { success: CheckCircle2, error: TriangleAlert, info: Info }
const tones = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-brand-500',
}

export function Toaster() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="pointer-events-none fixed bottom-5 start-5 z-200 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-lift"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${tones[t.tone]}`} />
              <p className="flex-1 text-[13px] leading-6">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="بستن" className="text-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
