'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark' | 'system'

interface UiState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  mobileNavOpen: boolean
  setMobileNav: (open: boolean) => void
  filtersOpen: boolean
  setFiltersOpen: (open: boolean) => void
  /** عنوان گروه‌های بسته‌شده‌ی منوی پنل — بسته‌ها ذخیره می‌شوند، نه بازها، تا گروه تازه پیش‌فرض باز باشد */
  adminNavCollapsed: string[]
  toggleAdminNavGroup: (title: string) => void
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      mobileNavOpen: false,
      setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
      filtersOpen: false,
      setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
      adminNavCollapsed: [],
      toggleAdminNavGroup: (title) =>
        set((state) => ({
          adminNavCollapsed: state.adminNavCollapsed.includes(title)
            ? state.adminNavCollapsed.filter((t) => t !== title)
            : [...state.adminNavCollapsed, title],
        })),
    }),
    {
      name: 'sinner-ui',
      partialize: (s) => ({ theme: s.theme, adminNavCollapsed: s.adminNavCollapsed }),
    },
  ),
)

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const isDark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}
