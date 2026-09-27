'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Crop, RotateCcw, Save } from 'lucide-react'
import type { MediaItem } from '@/types/media'
import { formatBytes } from '@/types/media'
import { useUploadMedia } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field, Input, Select } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { MAX_UPLOAD_BYTES } from '@/lib/file'
import { toEnDigits, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * برش و تغییر اندازه‌ی تصویر — همه‌اش در خود مرورگر.
 *
 * چرا سمت مرورگر و نه سرور؟ چون تصویر لاراول هیچ کتابخانه‌ی گرافیکی ندارد و
 * افزودنش یعنی ساخت دوباره‌ی کل تصویر داکر و چند ده مگابایت وابستگی تازه، آن هم
 * برای کاری که خود مرورگر با canvas انجام می‌دهد.
 *
 * نتیجه همیشه فایل تازه است و اصل دست‌نخورده می‌ماند: تصویر اصلی ممکن است همین
 * حالا جایی از سایت استفاده شده باشد، و بازنویسی‌اش بی‌سروصدا آنجا را عوض می‌کرد.
 */

type Rect = { x: number; y: number; w: number; h: number }

const RATIOS: { id: string; label: string; value: number | null }[] = [
  { id: 'free', label: 'آزاد', value: null },
  { id: 'square', label: 'مربع', value: 1 },
  { id: 'wide', label: '۱۶:۹', value: 16 / 9 },
  { id: 'photo', label: '۴:۳', value: 4 / 3 },
  { id: 'banner', label: '۲:۱', value: 2 },
]

const FORMATS: { id: string; label: string; mime: string | null }[] = [
  { id: 'same', label: 'مثل اصل', mime: null },
  { id: 'jpeg', label: 'جی‌پگ — سبک‌تر', mime: 'image/jpeg' },
  { id: 'webp', label: 'وب‌پی — سبک‌ترین', mime: 'image/webp' },
]

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const numeric = (raw: string) => Number(toEnDigits(raw).replace(/\D/g, '')) || 0

export function MediaEditor({
  item,
  open,
  onClose,
  onSaved,
}: {
  item: MediaItem
  open: boolean
  onClose: () => void
  onSaved?: (created: MediaItem) => void
}) {
  const upload = useUploadMedia()
  const imgRef = useRef<HTMLImageElement>(null)
  const [natural, setNatural] = useState({ w: item.width, h: item.height })
  const [scale, setScale] = useState(1)
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: item.width, h: item.height })
  const [ratio, setRatio] = useState<string>('free')
  const [format, setFormat] = useState('same')
  const [out, setOut] = useState({ w: String(item.width), h: String(item.height) })
  const [locked, setLocked] = useState(true)
  const [busy, setBusy] = useState(false)

  /** نسبت نمایش به پیکسل واقعی؛ با تغییر عرض پنجره دوباره حساب می‌شود */
  const measure = useCallback(() => {
    const el = imgRef.current
    if (!el || !el.naturalWidth) return
    setNatural({ w: el.naturalWidth, h: el.naturalHeight })
    setScale(el.clientWidth / el.naturalWidth)
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, measure])

  const resetCrop = useCallback(
    (w: number, h: number) => {
      setCrop({ x: 0, y: 0, w, h })
      setOut({ w: String(w), h: String(h) })
    },
    [],
  )

  /** برشِ جاری را با نسبت خواسته‌شده هم‌اندازه می‌کند و داخل تصویر نگه می‌دارد */
  const applyRatio = (id: string) => {
    setRatio(id)
    const target = RATIOS.find((r) => r.id === id)?.value
    if (!target) return

    const w = Math.min(natural.w, natural.h * target)
    const h = w / target
    const next = {
      x: clamp(crop.x, 0, natural.w - w),
      y: clamp(crop.y, 0, natural.h - h),
      w,
      h,
    }
    setCrop(next)
    setOut({ w: String(Math.round(next.w)), h: String(Math.round(next.h)) })
  }

  /** کشیدن خودِ کادر یا یکی از چهار گوشه‌اش */
  const startDrag = (event: React.PointerEvent, corner: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...crop }
    const target = RATIOS.find((r) => r.id === ratio)?.value ?? null

    const onMove = (move: PointerEvent) => {
      const dx = (move.clientX - startX) / scale
      const dy = (move.clientY - startY) / scale

      if (corner === 'move') {
        setCrop({
          ...origin,
          x: clamp(origin.x + dx, 0, natural.w - origin.w),
          y: clamp(origin.y + dy, 0, natural.h - origin.h),
        })
        return
      }

      const right = corner === 'ne' || corner === 'se'
      const bottom = corner === 'se' || corner === 'sw'

      let w = clamp(right ? origin.w + dx : origin.w - dx, 20, natural.w)
      let h = clamp(bottom ? origin.h + dy : origin.h - dy, 20, natural.h)

      // با نسبت قفل‌شده، ضلع دوم از روی ضلع اول حساب می‌شود تا کادر کج نشود
      if (target) h = w / target

      const x = right ? origin.x : clamp(origin.x + (origin.w - w), 0, natural.w - w)
      const y = bottom ? origin.y : clamp(origin.y + (origin.h - h), 0, natural.h - h)

      w = Math.min(w, natural.w - x)
      h = Math.min(h, natural.h - y)
      if (target) h = Math.min(h, w / target)

      const next = { x, y, w, h }
      setCrop(next)
      setOut({ w: String(Math.round(next.w)), h: String(Math.round(next.h)) })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const setWidth = (raw: string) => {
    const w = numeric(raw)
    setOut(locked && w ? { w: String(w), h: String(Math.round((w * crop.h) / crop.w)) } : { ...out, w: String(w) })
  }

  const setHeight = (raw: string) => {
    const h = numeric(raw)
    setOut(locked && h ? { w: String(Math.round((h * crop.w) / crop.h)), h: String(h) } : { ...out, h: String(h) })
  }

  const save = async () => {
    const width = numeric(out.w)
    const height = numeric(out.h)

    if (width < 1 || height < 1) {
      toast.error('اندازه‌ی خروجی را وارد کنید')
      return
    }

    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx || !imgRef.current) throw new Error('مرورگر نتوانست تصویر را بسازد')

      // کیفیت کوچک‌کردن: بدون این، تصویر پله‌پله و دندانه‌دار درمی‌آید
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(imgRef.current, crop.x, crop.y, crop.w, crop.h, 0, 0, width, height)

      const mime = FORMATS.find((f) => f.id === format)?.mime ?? (item.mime || 'image/png')
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.9))
      if (!blob) throw new Error('ساخت فایل ناموفق بود')

      if (blob.size > MAX_UPLOAD_BYTES) {
        toast.error(
          `حجم خروجی ${formatBytes(blob.size)} شد و از ۲ مگابایت بیشتر است — اندازه را کمتر کنید یا قالب وب‌پی را بزنید.`,
        )
        return
      }

      const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
      const base = item.name.replace(/\.[^.]+$/, '')
      const created = await upload.mutateAsync(new File([blob], `${base}-edited.${ext}`, { type: mime }))

      toast.success(`کپی تازه ساخته شد — ${formatBytes(blob.size)}`)
      onSaved?.(created)
      onClose()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const box = {
    left: `${crop.x * scale}px`,
    top: `${crop.y * scale}px`,
    width: `${crop.w * scale}px`,
    height: `${crop.h * scale}px`,
  }

  const handleClass =
    'absolute size-3.5 rounded-full border-2 border-white bg-brand-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]'

  return (
    <Drawer
      key={open ? item.id : 'closed'}
      open={open}
      onClose={onClose}
      title="ویرایش تصویر"
      widthClass="w-full max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="num text-[12.5px] text-muted">
            خروجی: {toFaDigits(numeric(out.w))}×{toFaDigits(numeric(out.h))}
          </span>
          <Button loading={busy} onClick={save}>
            <Save className="size-4" />
            ذخیره به‌عنوان کپی
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12px] leading-6 text-muted">
          تصویر اصلی دست‌نخورده می‌ماند و نتیجه به‌عنوان تصویر تازه در کتابخانه ذخیره می‌شود.
        </p>

        <div className="relative select-none overflow-hidden rounded-xl border border-border bg-ink-950">
          {/* عمداً تگ ساده: باید به پیکسل‌های اصلِ تصویر دسترسی داشته باشیم، نه نسخه‌ی بهینه‌شده */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={item.url}
            alt={item.alt}
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget
              setNatural({ w: el.naturalWidth, h: el.naturalHeight })
              setScale(el.clientWidth / el.naturalWidth)
              resetCrop(el.naturalWidth, el.naturalHeight)
            }}
            className="block h-auto w-full"
          />

          {scale > 0 && (
            <>
              {/*
                تیرگیِ بیرون با سایه‌ی بزرگِ خودِ کادر ساخته می‌شود، نه با یک پرده‌ی
                جداگانه روی کل تصویر: پرده، داخل کادر را هم تیره می‌کرد و آدم
                نمی‌فهمید کدام قسمت می‌ماند.
              */}
              <div
                style={box}
                onPointerDown={(e) => startDrag(e, 'move')}
                className="absolute cursor-move border-2 border-brand-500 shadow-[0_0_0_9999px_rgba(3,7,18,0.6)]"
              >
                <span className={cn(handleClass, '-left-2 -top-2 cursor-nwse-resize')} onPointerDown={(e) => startDrag(e, 'nw')} />
                <span className={cn(handleClass, '-right-2 -top-2 cursor-nesw-resize')} onPointerDown={(e) => startDrag(e, 'ne')} />
                <span className={cn(handleClass, '-left-2 -bottom-2 cursor-nesw-resize')} onPointerDown={(e) => startDrag(e, 'sw')} />
                <span className={cn(handleClass, '-right-2 -bottom-2 cursor-nwse-resize')} onPointerDown={(e) => startDrag(e, 'se')} />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-muted">نسبت برش:</span>
          {RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => applyRatio(r.id)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[11.5px] transition-colors',
                ratio === r.id ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-border hover:border-brand-400',
              )}
            >
              {r.label}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => {
              setRatio('free')
              resetCrop(natural.w, natural.h)
            }}
          >
            <RotateCcw className="size-3.5" />
            بازنشانی
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="عرض خروجی (پیکسل)">
            <Input value={out.w} onChange={(e) => setWidth(e.target.value)} inputMode="numeric" className="num" />
          </Field>
          <Field label="ارتفاع خروجی (پیکسل)">
            <Input value={out.h} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" className="num" />
          </Field>
          <Field label="قالب فایل" hint="جی‌پگ و وب‌پی حجم را خیلی کم می‌کنند">
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-muted">
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
            className="size-4 accent-[var(--color-brand-500)]"
          />
          نسبت عرض و ارتفاع قفل بماند — وگرنه تصویر کشیده می‌شود
        </label>

        <p className="num rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12px] leading-6 text-muted">
          <Crop className="me-1.5 inline size-3.5" />
          برش انتخابی: {toFaDigits(Math.round(crop.w))}×{toFaDigits(Math.round(crop.h))} از اصلِ{' '}
          {toFaDigits(natural.w)}×{toFaDigits(natural.h)}
        </p>
      </div>
    </Drawer>
  )
}
