'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Upload, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { checkField, imageSourceSchema } from '@/lib/validation'
import { MAX_UPLOAD_BYTES, uploadImage } from '@/lib/file'
import { cn } from '@/lib/utils'

/** فایل انتخابی را اعتبارسنجی و به data URL تبدیل می‌کند؛ null یعنی قابل استفاده نبود */
async function toImageSource(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    toast.error(`فایل «${file.name}» تصویر نیست.`)
    return null
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.error(`حجم «${file.name}» بیشتر از ۲ مگابایت است.`)
    return null
  }
  try {
    return await uploadImage(file)
  } catch (error) {
    toast.error(`آپلود «${file.name}» ناموفق بود: ${(error as Error).message}`)
    return null
  }
}

/** وقتی محصولی هیچ تصویری ندارد، به‌جای خطای next/image این نشان داده می‌شود */
export const PLACEHOLDER_IMAGE = '/img/products/placeholder.svg'


export function ImageField({
  value,
  onChange,
  label = 'تصاویر',
  hint = 'اولین تصویر به‌عنوان کاور کالا استفاده می‌شود. می‌توانید فایل آپلود کنید یا مسیر/لینک تصویر را وارد کنید.',
}: {
  value: string[]
  onChange: (images: string[]) => void
  label?: string
  hint?: string
}) {
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)

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

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const added: string[] = []

    for (const file of Array.from(files)) {
      const src = await toImageSource(file)
      if (src) added.push(src)
    }

    if (added.length) onChange([...value, ...added])
    // بدون این، انتخاب دوباره‌ی همان فایل رویداد change نمی‌دهد
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  const makeCover = (index: number) => {
    const next = [...value]
    const [picked] = next.splice(index, 1)
    onChange([picked, ...next])
  }

  return (
    <div className="space-y-2">
      <span className="block text-[13px] font-medium">{label}</span>

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
        <Button type="button" variant="soft" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" />
          آپلود
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
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
 * انتخاب یک تصویر واحد (مثل لوگوی برند): آپلود فایل، کشیدن‌ورها کردن، یا
 * وارد کردن مسیر/لینک. فایل آپلودشده data URL می‌شود، پس به‌جای رشته‌ی
 * چندکیلوبایتی داخل input، یک نشانگر «فایل آپلودشده» نمایش داده می‌شود.
 */
export function SingleImageField({
  value,
  onChange,
  label = 'تصویر',
  hint = 'فایل را بکشید و اینجا رها کنید، آپلود کنید، یا مسیر/لینک تصویر را بنویسید. حداکثر ۲ مگابایت.',
  error,
  placeholder = '/img/… یا https://…',
}: {
  value: string
  onChange: (src: string) => void
  label?: string
  hint?: string
  error?: string
  placeholder?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const uploaded = value.startsWith('data:')

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    // بدون این، انتخاب دوباره‌ی همان فایل رویداد change نمی‌دهد
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    const src = await toImageSource(file)
    if (src) onChange(src)
  }

  return (
    <div className="space-y-2">
      <span className="block text-[13px] font-medium">{label}</span>

      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={value ? 'تغییر تصویر' : 'انتخاب تصویر'}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void pick(e.dataTransfer.files)
          }}
          className={cn(
            'grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed bg-surface-2 transition-colors',
            dragging ? 'border-brand-500 bg-brand-500/10' : 'border-border hover:border-brand-500',
          )}
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
            <ImagePlus className={cn('size-5', dragging ? 'text-brand-500' : 'text-muted')} />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="soft" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {value ? 'تغییر تصویر' : 'آپلود تصویر'}
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
              فایل آپلودشده — برای جایگزینی، دوباره آپلود کنید
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

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files)} />

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
