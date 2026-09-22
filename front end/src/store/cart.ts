'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLine {
  productId: string
  variantId: string
  title: string
  variantTitle: string
  image: string
  slug: string
  unitPrice: number
  quantity: number
  maxStock: number
}

interface CartState {
  lines: CartLine[]
  isOpen: boolean
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
  remove: (variantId: string) => void
  setQuantity: (variantId: string, quantity: number) => void
  clear: () => void
  /** جایگزینی یکجای ردیف‌ها — برای هماهنگ‌سازی با موجودی و قیمت واقعی */
  replaceLines: (lines: CartLine[]) => void
  open: () => void
  close: () => void
  toggle: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      add: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId)
          const lines = existing
            ? state.lines.map((l) =>
                l.variantId === line.variantId
                  ? { ...l, quantity: Math.min(l.quantity + quantity, l.maxStock) }
                  : l,
              )
            : [...state.lines, { ...line, quantity: Math.min(quantity, line.maxStock) }]
          return { lines, isOpen: true }
        }),
      remove: (variantId) => set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) =>
                  l.variantId === variantId ? { ...l, quantity: Math.min(quantity, l.maxStock) } : l,
                ),
        })),
      clear: () => set({ lines: [] }),
      replaceLines: (lines) => set({ lines }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    { name: 'sinner-cart', partialize: (s) => ({ lines: s.lines }) },
  ),
)

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0)
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
