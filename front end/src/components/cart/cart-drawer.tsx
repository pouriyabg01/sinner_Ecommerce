'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cartSubtotal, useCart } from '@/store/cart'
import { useShipping } from '@/lib/use-shipping'
import { useSession } from '@/store/session'
import { useHydrated } from '@/lib/use-hydrated'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { cartButtonRef } from './cart-anchor'
import { formatPrice, toFaDigits } from '@/lib/format'

export function CartDrawer() {
  const { lines, isOpen, close, setQuantity, remove } = useCart()
  const { freeThreshold } = useShipping()
  const subtotal = cartSubtotal(lines)
  const remaining = Math.max(0, freeThreshold - subtotal)
  const progress = freeThreshold > 0 ? Math.min(100, (subtotal / freeThreshold) * 100) : 100
  const hydrated = useHydrated()
  const hasToken = useSession((s) => Boolean(s.token))
  // مهمان مستقیم به ورود می‌رود، نه به فرم آدرسی که آخرش ثبت نمی‌شود
  const signedIn = MOCKING_ENABLED || (hydrated && hasToken)

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title="سبد خرید"
      // آیکون سبد در RTL سمت چپ هدر است، پس کشو هم از همان لبه باز می‌شود
      side="end"
      originRef={cartButtonRef}
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">جمع کل</span>
              <span className="text-base font-bold">{formatPrice(subtotal)}</span>
            </div>
            {signedIn ? (
              <Link href="/checkout" onClick={close} className={buttonVariants({ size: 'lg', block: true })}>
                ادامه‌ی فرآیند خرید
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent('/checkout')}`}
                  onClick={close}
                  className={buttonVariants({ size: 'lg', block: true })}
                >
                  ورود و تکمیل خرید
                </Link>
                <p className="text-center text-[11.5px] text-muted">سبد خرید شما بعد از ورود حفظ می‌شود.</p>
              </>
            )}
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="سبد خرید شما خالی است"
          description="نگاهی به پیشنهادهای امروز بیندازید؛ مطمئناً کالای مورد نظرتان را پیدا می‌کنید."
          action={
            <Button variant="soft" onClick={close}>
              رفتن به فروشگاه
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-2 p-3.5">
            <p className="mb-2 text-xs leading-6">
              {remaining > 0 ? (
                <>
                  تا <span className="font-bold text-brand-600 dark:text-brand-400">{formatPrice(remaining)}</span> دیگر
                  تا ارسال رایگان فاصله دارید.
                </>
              ) : (
                <span className="font-bold text-brand-600 dark:text-brand-400">ارسال سفارش شما رایگان است 🎉</span>
              )}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', damping: 24, stiffness: 200 }}
              />
            </div>
          </div>

          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <motion.li
                  key={line.variantId}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 rounded-2xl border border-border p-3">
                    <Link href={`/product/${line.slug}`} onClick={close} className="shrink-0">
                      <Image
                        src={line.image}
                        alt={line.title}
                        width={72}
                        height={72}
                        className="size-18 rounded-xl bg-ink-950 object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${line.slug}`}
                          onClick={close}
                          className="line-clamp-2 text-[13px] font-medium leading-6 hover:text-brand-600"
                        >
                          {line.title}
                        </Link>
                        <button
                          onClick={() => remove(line.variantId)}
                          aria-label="حذف"
                          className="shrink-0 text-muted transition-colors hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {line.variantTitle && <p className="text-[11px] text-muted">{line.variantTitle}</p>}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-border p-0.5">
                          <button
                            onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                            disabled={line.quantity >= line.maxStock}
                            aria-label="افزایش"
                            className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-brand-600 disabled:opacity-40"
                          >
                            <Plus className="size-3.5" />
                          </button>
                          <span className="num w-6 text-center text-[13px] font-bold">
                            {toFaDigits(line.quantity)}
                          </span>
                          <button
                            onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                            aria-label="کاهش"
                            className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-red-500"
                          >
                            <Minus className="size-3.5" />
                          </button>
                        </div>
                        <span className="text-[13px] font-bold">{formatPrice(line.unitPrice * line.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </Drawer>
  )
}
