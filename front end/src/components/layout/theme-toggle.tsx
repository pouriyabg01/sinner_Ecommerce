'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useUi } from '@/store/ui'
import { cn } from '@/lib/utils'

const options = [
  { value: 'light', label: 'روشن', icon: Sun },
  { value: 'system', label: 'سیستم', icon: Monitor },
  { value: 'dark', label: 'تاریک', icon: Moon },
] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useUi()
  return (
    <div className={cn('flex items-center gap-0.5 rounded-xl bg-surface-2 p-0.5', className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={cn(
            'grid size-8 place-items-center rounded-lg transition-all duration-200',
            theme === value ? 'bg-surface text-brand-600 shadow-soft dark:text-brand-400' : 'text-muted hover:text-foreground',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
