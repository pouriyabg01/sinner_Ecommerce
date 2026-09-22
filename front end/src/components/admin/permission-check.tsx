'use client'

import { PERMISSION_LABEL, type Permission } from '@/types/user'
import { cn } from '@/lib/utils'

/** تیک یک دسترسی؛ هم در ساخت ادمین جدید و هم در ویرایش پرونده به کار می‌رود */
export function PermissionCheck({
  checked,
  onChange,
  permission,
}: {
  checked: boolean
  onChange: () => void
  permission: Permission
}) {
  const { label, hint } = PERMISSION_LABEL[permission]

  return (
    <label className="group flex cursor-pointer items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-surface-2/60">
      <span
        className={cn(
          'mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-md border transition-all duration-200',
          checked ? 'border-brand-500 bg-brand-500' : 'border-border group-hover:border-brand-400',
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium">{label}</span>
        <span className="block text-[10.5px] leading-5 text-muted">{hint}</span>
      </span>
    </label>
  )
}
