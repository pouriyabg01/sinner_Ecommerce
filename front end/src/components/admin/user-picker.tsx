'use client'

import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { useDiscountCustomers } from '@/lib/api/queries'
import { Input } from '@/components/ui/input'
import { formatPhone, toEnDigits, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * انتخاب چند کاربر برای کد تخفیف شخصی. جست‌وجو هم با نام است هم با شماره، و
 * شماره با رقم فارسی هم پیدا می‌شود. مثل ProductPicker انتخاب‌شده‌ها بالای فهرست‌اند.
 */
export function UserPicker({ value, onChange }: { value: string[]; onChange: (userIds: string[]) => void }) {
  const { data, isLoading } = useDiscountCustomers()
  const [term, setTerm] = useState('')

  const items = useMemo(() => {
    const all = data ?? []
    const needle = toEnDigits(term.trim()).toLowerCase()
    const matched = needle
      ? all.filter((u) => `${u.fullName} ${u.phone ?? ''}`.toLowerCase().includes(needle))
      : all
    return [...matched].sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)))
  }, [data, term, value])

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="جست‌وجوی نام یا شماره"
          className="h-10 ps-9 text-[13px]"
        />
      </div>

      <ul className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-border p-1.5">
        {isLoading ? (
          <li className="p-4 text-center text-xs text-muted">در حال بارگذاری…</li>
        ) : items.length === 0 ? (
          <li className="p-4 text-center text-xs text-muted">کاربری پیدا نشد.</li>
        ) : (
          items.map((user) => {
            const picked = value.includes(user.id)
            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => toggle(user.id)}
                  aria-pressed={picked}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl p-2 text-start transition-colors',
                    picked ? 'bg-brand-500/10' : 'hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                      picked ? 'border-brand-500 bg-brand-500 text-white' : 'border-border',
                    )}
                  >
                    {picked && <Check className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{user.fullName}</span>
                  {user.phone && <span className="num shrink-0 text-[11px] text-muted">{formatPhone(user.phone)}</span>}
                </button>
              </li>
            )
          })
        )}
      </ul>

      <p className="text-xs text-muted">
        {value.length === 0
          ? 'هیچ کسی انتخاب نشده — کد برای همه قابل استفاده است.'
          : `کد فقط برای ${toFaDigits(value.length)} نفر انتخاب‌شده کار می‌کند.`}
      </p>
    </div>
  )
}
