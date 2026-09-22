'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_COMPARE = 4

interface CompareState {
  ids: string[]
  toggle: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
  isFull: () => boolean
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => {
          if (state.ids.includes(id)) return { ids: state.ids.filter((x) => x !== id) }
          if (state.ids.length >= MAX_COMPARE) return state
          return { ids: [...state.ids, id] }
        }),
      remove: (id) => set((state) => ({ ids: state.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
      has: (id) => get().ids.includes(id),
      isFull: () => get().ids.length >= MAX_COMPARE,
    }),
    { name: 'sinner-compare' },
  ),
)

export { MAX_COMPARE }
