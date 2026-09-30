'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon, ImagePlus, X } from 'lucide-react'
import type { MediaAdvice } from '@/types/media'
import { MediaPicker } from '@/components/admin/media-library'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { checkField, imageSourceSchema } from '@/lib/validation'
import { toFaDigits } from '@/lib/format'

/*
 * آپلود فقط از کتابخانه انجام می‌شود.
 *
 * آپلود مستقیم در همین کادر فایل را به گالری اضافه نمی‌کرد، پس تصویر جایی
 * فهرست نمی‌شد و دوباره قابل استفاده نبود. حالا هر تصویر اول به کتابخانه
 * می‌رود و از آنجا انتخاب می‌شود.
 */

/**
 * اندازه‌ی پیشنهادیِ همین‌جا، کنار عنوان فیلد.
 *
 * پنجره‌ی کتابخانه هم همین عدد را نشان می‌دهد، ولی کسی که تصویر را از قبل
 * انتخاب‌شده برمی‌دارد پنجره را باز نمی‌کند و بی‌آن، اندازه را هیچ‌جا نمی‌دید.
 */
export function SizeHint({ advice }: { advice?: MediaAdvice }) {
  if (!advice) return null

  return (
    <span
      title={advice.note}
      className="num shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted"
    >
      اندازه‌ی پیشنهادی: {toFaDigits(advice.width)} × {toFaDigits(advice.height)} پیکسل
    </span>
  )
}

/** وقتی محصولی هیچ تصویری ندارد، به‌جای خطای next/image این نشان داده می‌شود */
export const PLACEHOLDER_IMAGE = '/img/products/placeholder.svg'


export function ImageField({
  value,
  onChange,
  label = 'تصاویر',
  hint = 'اولین تصویر به‌عنوان کاور کالا استفاده می‌شود. از کتابخانه انتخاب کنید یا لینک بدهید.',
  advice = { width: 1200, height: 1200, note: 'مربع بهتر است؛ کارت‌های کالا تصویر را مربع می‌برند.' },
}: {
  value: string[]
  onChange: (images: string[]) => void
  label?: string
  hint?: string
  advice?: MediaAdvice
}) {
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string>()
  const [picking, setPicking] = useState(false)

  const addUrl = () => {
    const src = url.trim()
    if (!src) {
      setUrlError('لطفاً مسیر یا لینک تصویر را وارد کنید')
      return
    }
    const invalid = checkField(imageSourceSchema, src)
    if (invalid) {
      setUrlError(invalid)
      return
    }
    if (value.includes(src)) {
      setUrlError('این تصویر قبلاً اضافه شده')
      return
    }
    onChange([...value, src])
    setUrl('')
    setUrlError(undefined)
  }

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  const makeCover = (index: number) => {
    const next = [...value]
    const [picked] = next.splice(index, 1)
    onChange([picked, ...next])
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium">{label}</span>
        <SizeHint advice={advice} />
      </div>

      {value.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted">
          هنوز تصویری اضافه نشده است — در نبود تصویر، کاور پیش‌فرض نمایش داده می‌شود.
        </p>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {value.map((src, i) => (
            <li
              key={`${i}-${src.slice(0, 40)}`}
              className="relative aspect-square overflow-hidden rounded-xl border border-border bg-ink-950"
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />

              <button
                type="button"
                aria-label="حذف تصویر"
                onClick={() => removeAt(i)}
                className="absolute top-1 end-1 grid size-6 place-items-center rounded-lg bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-red-500"
              >
                <X className="size-3.5" />
              </button>

              {i === 0 ? (
                <span className="absolute bottom-1 start-1 rounded-md bg-brand-500 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  کاور
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(i)}
                  className="absolute bottom-1 start-1 rounded-md bg-ink-900/70 px-1.5 py-0.5 text-[9px] text-white backdrop-blur transition-colors hover:bg-brand-500"
                >
                  کاور کن
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (urlError) setUrlError(undefined)
          }}
          invalid={Boolean(urlError)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addUrl()
            }
          }}
          placeholder="/img/products/… یا https://…"
          dir="ltr"
          className="h-9 min-w-40 flex-1 text-[12.5px]"
        />
        <Button type="button" variant="outline" size="sm" onClick={addUrl}>
          <ImagePlus className="size-4" />
          افزودن
        </Button>
        <Button type="button" variant="soft" size="sm" onClick={() => setPicking(true)}>
          <ImageIcon className="size-4" />
          کتابخانه
        </Button>
      </div>

      <MediaPicker
        open={picking}
        multiple
        advice={advice}
        onClose={() => setPicking(false)}
        // تکراری‌ها کنار گذاشته می‌شوند، وگرنه یک تصویر دو بار در گالری کالا می‌نشست
        onPick={(picked) => onChange([...value, ...picked.filter((src) => !value.includes(src))])}
      />

      {urlError ? (
        <span role="alert" className="block text-xs text-red-500">
          {urlError}
        </span>
      ) : (
        <span className="block text-xs text-muted">{hint}</span>
      )}
    </div>
  )
}


/**
 * انتخاب یک تصویر واحد (مثل لوگوی برند): از کتابخانه، یا با نوشتن مسیر/لینک.
 * مقدارهای قدیمیِ data URL هم پشتیبانی می‌شوند: به‌جای رشته‌ی چندکیلوبایتی
 * داخل input، یک نشانگر «فایل آپلودشده» نمایش داده می‌شود.
 */
export function SingleImageField({
  value,
  onChange,
  label = 'تصویر',
  hint = 'از کتابخانه انتخاب کنید یا مسیر/لینک تصویر را بنویسید.',
  error,
  placeholder = '/img/… یا https://…',
  advice,
}: {
  value: string
  onChange: (src: string) => void
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  advice?: MediaAdvice
}) {
  const [picking, setPicking] = useState(false)
  const uploaded = value.startsWith('data:')

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium">{label}</span>
        <SizeHint advice={advice} />
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={value ? 'تغییر تصویر' : 'انتخاب تصویر'}
          onClick={() => setPicking(true)}
          className="grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-2 transition-colors hover:border-brand-500"
        >
          {value && !error ? (
            <Image
              src={value}
              alt=""
              width={128}
              height={80}
              className="h-full w-full object-contain p-2"
              unoptimized
            />
          ) : (
            <ImagePlus className="size-5 text-muted" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="soft" size="sm" onClick={() => setPicking(true)}>
              <ImageIcon className="size-4" />
              {value ? 'تغییر تصویر' : 'انتخاب از کتابخانه'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted hover:text-red-500"
                onClick={() => onChange('')}
              >
                <X className="size-4" />
                حذف
              </Button>
            )}
          </div>

          {uploaded ? (
            <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[12px] text-muted">
              فایل آپلودشده — برای جایگزینی، از کتابخانه انتخاب کنید
            </p>
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              invalid={Boolean(error)}
              dir="ltr"
              className="h-9 text-start text-[12.5px]"
              placeholder={placeholder}
            />
          )}
        </div>
      </div>

      <MediaPicker
        open={picking}
        advice={advice}
        onClose={() => setPicking(false)}
        onPick={([src]) => onChange(src)}
      />

      {error ? (
        <span role="alert" className="block text-xs text-red-500">
          {error}
        </span>
      ) : (
        <span className="block text-xs text-muted">{hint}</span>
      )}
    </div>
  )
}
