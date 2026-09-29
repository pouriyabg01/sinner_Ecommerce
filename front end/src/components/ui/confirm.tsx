'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Trash2, TriangleAlert } from 'lucide-react'
import { create } from 'zustand'
import { Button } from '@/components/ui/button'

/**
 * پنجره‌ی تأیید، به‌جای هشدار خامِ مرورگر.
 *
 * مثل toast با یک تابع صدا زده می‌شود و منتظر جواب می‌ماند، پس جای
 * `confirm()` می‌نشیند بدون اینکه هر صفحه‌ای وضعیت باز و بسته را خودش نگه دارد.
 */
export interface ConfirmRequest {
  title: string
  body?: string
  /** دکمه‌ی اصلی؛ کار امن‌تر */
  confirmLabel: string
  /** دکمه‌ی دوم، خطرناک‌تر و برگشت‌ناپذیر — مثلاً «حذف کامل» */
  dangerLabel?: string
  /** زیرنویس دکمه‌ی خطرناک */
  dangerHint?: string
}

export type ConfirmAnswer = 'confirm' | 'danger' | null

interface ConfirmState {
  request: (ConfirmRequest & { resolve: (answer: ConfirmAnswer) => void }) | null
  open: (request: ConfirmRequest) => Promise<ConfirmAnswer>
  answer: (value: ConfirmAnswer) => void
}

const useConfirm = create<ConfirmState>((set, get) => ({
  request: null,
  open: (request) =>
    new Promise<ConfirmAnswer>((resolve) => {
      // پنجره‌ی باز قبلی بی‌جواب نمی‌ماند، وگرنه صداکننده‌اش برای همیشه منتظر می‌شد
      get().request?.resolve(null)
      set({ request: { ...request, resolve } })
    }),
  answer: (value) => {
    get().request?.resolve(value)
    set({ request: null })
  },
}))

/** پرسش آزاد؛ true یعنی ادمین تأیید کرد */
export async function confirmAction(request: ConfirmRequest): Promise<boolean> {
  return (await useConfirm.getState().open(request)) === 'confirm'
}

/**
 * پرسشِ حذف: «به سطل زباله» یا «همین حالا برای همیشه».
 *
 * `count` برای حذف گروهی است و `note` برای هشدارِ خاصِ همان صفحه (مثلاً
 * سرنوشت کالاهای یک دسته).
 */
export async function confirmDelete({
  what,
  kind,
  count,
  note,
}: {
  what?: string
  kind: string
  count?: number
  note?: string
}): Promise<'trash' | 'permanent' | null> {
  const subject = count === undefined ? `«${what}»` : `${count} ${kind}`
  const answer = await useConfirm.getState().open({
    title: count === undefined ? `${subject} حذف شود؟` : `${subject} حذف شوند؟`,
    body: [note, 'به سطل زباله می‌رود و هر وقت خواستی برمی‌گردد.'].filter(Boolean).join(' '),
    confirmLabel: 'انتقال به سطل زباله',
    dangerLabel: 'حذف کامل',
    dangerHint: 'بدون سطل زباله، بدون برگشت',
  })

  return answer === 'confirm' ? 'trash' : answer === 'danger' ? 'permanent' : null
}

export function ConfirmHost() {
  const request = useConfirm((s) => s.request)
  const answer = useConfirm((s) => s.answer)

  useEffect(() => {
    if (!request) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && answer(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [request, answer])

  return (
    <AnimatePresence>
      {request && (
        <div className="fixed inset-0 z-200 grid place-items-center p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => answer(null)}
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-[3px]"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={request.title}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="relative w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-lift"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <TriangleAlert className="size-5" />
            </span>

            <h2 className="mt-4 text-base leading-7 font-bold">{request.title}</h2>
            {request.body && <p className="mt-1.5 text-[13px] leading-6 text-muted">{request.body}</p>}

            <div className="mt-6 space-y-2">
              <Button block onClick={() => answer('confirm')}>
                <Trash2 className="size-4" />
                {request.confirmLabel}
              </Button>

              <div className="flex gap-2">
                <Button block variant="outline" onClick={() => answer(null)}>
                  انصراف
                </Button>
                {request.dangerLabel && (
                  <Button
                    block
                    variant="outline"
                    onClick={() => answer('danger')}
                    className="border-red-500/40 text-red-600 hover:border-red-500 hover:bg-red-500/10 dark:text-red-400"
                  >
                    {request.dangerLabel}
                  </Button>
                )}
              </div>
            </div>

            {request.dangerHint && request.dangerLabel && (
              <p className="mt-3 text-center text-[11px] text-muted">
                {request.dangerLabel}: {request.dangerHint}
              </p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
