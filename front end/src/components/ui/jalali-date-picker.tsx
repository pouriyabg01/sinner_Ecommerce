'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  addJalaliMonths,
  formatLocal,
  jalaliMonthLength,
  jalaliWeekday,
  parseLocal,
  toGregorian,
  toJalali,
} from '@/lib/jalali'
import { formatDate, formatDateTime, toFaDigits } from '@/lib/format'
import { inputBaseClass, inputInvalidClass } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const two = (n: number) => toFaDigits(String(n).padStart(2, '0'))

function todayLocal() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

/**
 * انتخابگر تاریخ (و ساعت) با تقویم شمسی.
 *
 * ورودی تاریخ خود مرورگر تقویم میلادی دارد. مقدار همان قالب آن است —
 * «YYYY-MM-DD» یا «YYYY-MM-DDTHH:mm» به وقت محلی — تا جایگزینی بی‌دردسر باشد و
 * تبدیل به ISO همان جایی بماند که قبلاً بود.
 *
 * داخل Field نمی‌نشیند (Field یک label است و این چند دکمه دارد)، پس برچسب و
 * پیام خطا را خودش می‌کشد. تقویم زیر دکمه باز می‌شود و محتوا را پایین می‌راند،
 * نه روی آن: داخل کشوی اسکرول‌دار، پنل شناور بریده می‌شد.
 */
export function JalaliDatePicker({
  label,
  value,
  onChange,
  withTime = true,
  min,
  required,
  error,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  withTime?: boolean
  /** روزهای پیش از این تاریخ انتخاب‌شدنی نیستند — همان قالب value */
  min?: string
  required?: boolean
  error?: string
  hint?: string
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const parsed = parseLocal(value)
  const selected = parsed ? toJalali(parsed) : null
  const [view, setView] = useState(() => selected ?? toJalali(todayLocal()))

  const today = toJalali(todayLocal())
  const minDay = min ? min.slice(0, 10) : null

  // هر روز ماه همراه با معادل میلادی‌اش؛ فقط با عوض شدن ماه دوباره ساخته می‌شود
  const days = useMemo(() => {
    const length = jalaliMonthLength(view.year, view.month)
    return Array.from({ length }, (_, i) => {
      const day = i + 1
      return { day, local: formatLocal(toGregorian({ year: view.year, month: view.month, day })) }
    })
  }, [view.year, view.month])
  const lead = jalaliWeekday({ year: view.year, month: view.month, day: 1 })

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // Escape فقط تقویم را می‌بندد، نه کشویی که داخلش است
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const toggle = () => {
    if (!open) setView(selected ?? today)
    setOpen(!open)
  }

  const pick = (local: string) => {
    const date = parseLocal(local)!
    if (!withTime) {
      onChange(formatLocal(date))
      setOpen(false)
      return
    }
    onChange(formatLocal(date, { hour: parsed?.hour ?? 0, minute: parsed?.minute ?? 0 }))
  }

  const setTime = (patch: { hour?: number; minute?: number }) => {
    const base = parsed ?? { ...todayLocal(), hour: 0, minute: 0 }
    onChange(formatLocal(base, { hour: patch.hour ?? base.hour, minute: patch.minute ?? base.minute }))
  }

  // دقیقه‌ای که مضرب پنج نیست (مثل «همین حالا») هم باید در فهرست بماند
  const minutes = parsed && parsed.minute % 5 ? [...MINUTES, parsed.minute].sort((a, b) => a - b) : MINUTES

  const display = parsed
    ? withTime
      ? formatDateTime(new Date(value).toISOString())
      : formatDate(value)
    : null

  return (
    <div ref={rootRef} className="space-y-2">
      <span id={`${id}-label`} className="flex items-center gap-1 text-[13px] font-medium">
        {label}
        {required && <span className="text-ember-500">*</span>}
      </span>

      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-invalid={Boolean(error) || undefined}
        className={cn(inputBaseClass, 'flex h-11 items-center gap-2 text-start', error && inputInvalidClass)}
      >
        <CalendarDays className="size-4 shrink-0 text-muted" />
        <span id={`${id}-value`} className={cn('num flex-1 truncate', !display && 'text-muted/70')}>
          {display ?? 'انتخاب کنید'}
        </span>
      </button>

      {open && (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-label={`تقویم ${label}`}
          className="rounded-2xl border border-border bg-surface p-3 shadow-soft"
        >
          <div className="mb-2 flex items-center justify-between">
            {/* راست‌به‌چپ: ماه قبل سمت راست است */}
            <button
              type="button"
              aria-label="ماه قبل"
              onClick={() => setView((v) => ({ ...addJalaliMonths(v.year, v.month, -1), day: 1 }))}
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="text-[13px] font-bold" aria-live="polite">
              {JALALI_MONTHS[view.month - 1]} {toFaDigits(view.year)}
            </span>
            <button
              type="button"
              aria-label="ماه بعد"
              onClick={() => setView((v) => ({ ...addJalaliMonths(v.year, v.month, 1), day: 1 }))}
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-muted" aria-hidden>
            {JALALI_WEEKDAYS.map((name, i) => (
              <span key={name} className={cn('py-1', i === 6 && 'text-red-500/80')}>
                {name}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: lead }, (_, i) => (
              <span key={`lead-${i}`} />
            ))}
            {days.map(({ day, local }, i) => {
              const isSelected = selected?.year === view.year && selected.month === view.month && selected.day === day
              const isToday = today.year === view.year && today.month === view.month && today.day === day
              const disabled = minDay !== null && local < minDay
              const friday = (lead + i) % 7 === 6
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={`${toFaDigits(day)} ${JALALI_MONTHS[view.month - 1]} ${toFaDigits(view.year)}`}
                  onClick={() => pick(local)}
                  className={cn(
                    'num grid h-9 place-items-center rounded-lg text-[12.5px] transition-colors',
                    isSelected
                      ? 'bg-brand-500 font-bold text-white'
                      : cn(
                          'hover:bg-surface-2',
                          isToday && 'ring-1 ring-brand-400 ring-inset',
                          friday && 'text-red-500',
                        ),
                    disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent',
                  )}
                >
                  {toFaDigits(day)}
                </button>
              )
            })}
          </div>

          {withTime && (
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[12.5px] text-muted">ساعت</span>
              {/* ساعت و دقیقه چپ‌به‌راست خوانده می‌شوند: ۱۰:۳۰ */}
              <div dir="ltr" className="flex items-center gap-1">
                <select
                  aria-label="ساعت"
                  value={parsed?.hour ?? 0}
                  onChange={(e) => setTime({ hour: Number(e.target.value) })}
                  className="num h-9 rounded-xl border border-border bg-surface px-2 text-sm outline-none focus:border-brand-400"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {two(h)}
                    </option>
                  ))}
                </select>
                <span className="text-muted">:</span>
                <select
                  aria-label="دقیقه"
                  value={parsed?.minute ?? 0}
                  onChange={(e) => setTime({ minute: Number(e.target.value) })}
                  className="num h-9 rounded-xl border border-border bg-surface px-2 text-sm outline-none focus:border-brand-400"
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>
                      {two(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setView(today)
                pick(formatLocal(todayLocal()))
              }}
            >
              امروز
            </Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              تأیید
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <span role="alert" className="block text-xs text-red-500">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  )
}
