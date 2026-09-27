'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, Check, ImageIcon, Scissors, Search, Trash2, Upload } from 'lucide-react'
import {
  MEDIA_SORT_LABEL,
  formatBytes,
  mediaFit,
  type MediaAdvice,
  type MediaItem,
  type MediaSort,
} from '@/types/media'
import { useDeleteMedia, useMedia, useUpdateMedia, useUploadMedia } from '@/lib/api/queries'
import { MediaEditor } from '@/components/admin/media-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { MAX_UPLOAD_BYTES } from '@/lib/file'
import { formatDateTime, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/* --------------------------------- آپلود --------------------------------- */

/**
 * آپلود در لحظه: فایل که انتخاب یا رها شد، همان موقع بالا می‌رود و به گالری
 * اضافه می‌شود — نه اینکه منتظر ذخیره‌ی فرم بماند.
 */
function UploadZone({ onUploaded }: { onUploaded: (item: MediaItem) => void }) {
  const upload = useUploadMedia()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(0)

  const send = async (files: FileList | null) => {
    const list = Array.from(files ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (!list.length) return

    // چند فایل پشت سر هم و نه موازی، تا ترتیب گالری به‌هم نریزد و سرور شلوغ نشود
    for (const file of list) {
      if (!file.type.startsWith('image/')) {
        toast.error(`«${file.name}» تصویر نیست.`)
        continue
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`حجم «${file.name}» بیشتر از ۲ مگابایت است.`)
        continue
      }
      setBusy((n) => n + 1)
      try {
        onUploaded(await upload.mutateAsync(file))
      } catch (error) {
        toast.error(`آپلود «${file.name}» ناموفق بود: ${(error as Error).message}`)
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void send(e.dataTransfer.files)
      }}
      className={cn(
        'rounded-2xl border border-dashed p-4 text-center transition-colors',
        dragging ? 'border-brand-500 bg-brand-500/10' : 'border-border',
      )}
    >
      <Button type="button" variant="soft" size="sm" loading={busy > 0} onClick={() => fileRef.current?.click()}>
        <Upload className="size-4" />
        آپلود تصویر
      </Button>
      <p className="mt-2 text-[11px] text-muted">
        {busy > 0
          ? `در حال آپلود ${toFaDigits(busy)} فایل…`
          : 'یا فایل‌ها را بکشید و همین‌جا رها کنید — حداکثر ۲ مگابایت برای هر تصویر'}
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void send(e.target.files)}
      />
    </div>
  )
}

/* -------------------------------- فهرست -------------------------------- */

function MediaCard({
  item,
  advice,
  selected,
  onClick,
}: {
  item: MediaItem
  advice?: MediaAdvice
  selected: boolean
  onClick: () => void
}) {
  const fit = mediaFit(item, advice)

  return (
    <button
      type="button"
      onClick={onClick}
      title={item.name}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl border bg-ink-950 transition-all',
        selected ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-border hover:border-brand-400',
      )}
    >
      <Image src={item.url} alt={item.alt} fill sizes="160px" className="object-cover" />

      {selected && (
        <span className="absolute top-1.5 end-1.5 grid size-6 place-items-center rounded-lg bg-brand-500 text-white">
          <Check className="size-3.5" />
        </span>
      )}

      {/* تصویر کوچک‌تر از حد، روی صفحه کشیده و مات می‌شود؛ همین‌جا گفته می‌شود */}
      {fit === 'small' && (
        <span className="absolute top-1.5 start-1.5 grid size-6 place-items-center rounded-lg bg-amber-500 text-white">
          <AlertTriangle className="size-3.5" />
        </span>
      )}

      <span className="num absolute inset-x-0 bottom-0 bg-ink-950/75 px-1.5 py-1 text-[10px] text-white/90 backdrop-blur">
        {item.width ? `${toFaDigits(item.width)}×${toFaDigits(item.height)}` : '—'}
      </span>
    </button>
  )
}

/**
 * مرورگر کتابخانه: جست‌وجو، ترتیب، آپلود و شبکه‌ی تصویرها.
 * هم در صفحه‌ی گالری استفاده می‌شود و هم داخل پنجره‌ی انتخاب.
 */
export function MediaBrowser({
  advice,
  selected,
  onToggle,
  onFirstLoad,
}: {
  advice?: MediaAdvice
  selected: string[]
  onToggle: (item: MediaItem) => void
  onFirstLoad?: (item: MediaItem) => void
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<MediaSort>('newest')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useMedia({ search: search.trim() || undefined, sort, page })

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      {advice && (
        <p className="rounded-xl bg-brand-500/8 px-3.5 py-2.5 text-[12px] leading-6 text-brand-700 dark:text-brand-300">
          <span className="num">
            برای اینجا اندازه‌ی پیشنهادی {toFaDigits(advice.width)}×{toFaDigits(advice.height)} پیکسل است.
          </span>
          {advice.note ? ` ${advice.note}` : ''}
        </p>
      )}

      <UploadZone
        onUploaded={(item) => {
          // تصویر تازه بالای فهرست می‌نشیند، پس ترتیب و صفحه به اول برمی‌گردد
          setSort('newest')
          setPage(1)
          onFirstLoad?.(item)
        }}
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-44 flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="جست‌وجو در نام یا عنوان"
            className="h-9 ps-9 text-[12.5px]"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as MediaSort)
            setPage(1)
          }}
          className="h-9 w-36 text-[12.5px]"
        >
          {(Object.keys(MEDIA_SORT_LABEL) as MediaSort[]).map((value) => (
            <option key={value} value={value}>
              {MEDIA_SORT_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={ImageIcon}
          title={search ? 'چیزی پیدا نشد' : 'کتابخانه خالی است'}
          description={search ? 'عبارت دیگری را امتحان کنید.' : 'اولین تصویر را از کادر بالا آپلود کنید.'}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                advice={advice}
                selected={selected.includes(item.url)}
                onClick={() => onToggle(item)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 text-[12px] text-muted">
            <span className="num">{toFaDigits(data?.total ?? 0)} تصویر</span>
            {(data?.lastPage ?? 1) > 1 && (
              <span className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  قبلی
                </Button>
                <span className="num">
                  {toFaDigits(page)} از {toFaDigits(data?.lastPage ?? 1)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= (data?.lastPage ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  بعدی
                </Button>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* -------------------------------- جزئیات -------------------------------- */

/** ویرایش عنوان، متن جایگزین و توضیح یک تصویر، به‌علاوه‌ی حذف از کتابخانه */
export function MediaDetails({
  item,
  onDeleted,
  onCreated,
}: {
  item: MediaItem
  onDeleted?: () => void
  /** کپی تازه‌ای که ویرایشگر ساخته؛ صفحه یا پنجره‌ی انتخاب همان را نشان می‌دهد */
  onCreated?: (created: MediaItem) => void
}) {
  const save = useUpdateMedia()
  const remove = useDeleteMedia()
  const [draft, setDraft] = useState({ title: item.title, alt: item.alt, caption: item.caption })
  const [confirmUsage, setConfirmUsage] = useState(0)
  const [editing, setEditing] = useState(false)

  const dirty = draft.title !== item.title || draft.alt !== item.alt || draft.caption !== item.caption

  const del = (force: boolean) =>
    remove.mutate(
      { id: item.id, force },
      {
        onSuccess: () => {
          toast.success('تصویر حذف شد')
          setConfirmUsage(0)
          onDeleted?.()
        },
        onError: (error) => {
          /*
           * سرور با ۴۰۹ می‌گوید این تصویر جایی استفاده شده. به‌جای خطای خشک،
           * همان‌جا پرسیده می‌شود، چون حذفش آن صفحه‌ها را می‌شکند.
           */
          const used = Number((error as Error).message.match(/\d+/)?.[0] ?? 0)
          if (used > 0 && !force) setConfirmUsage(used)
          else toast.error((error as Error).message)
        },
      },
    )

  return (
    <div className="space-y-4">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-ink-950">
        {/*
          priority چون این تصویر همان چیزی است که کاربر همین حالا رویش زده؛
          با بارگذاری تنبل، کادر خالی می‌ماند تا وقتی مرورگر تصمیم بگیرد.
        */}
        <Image src={item.url} alt={item.alt} fill priority sizes="400px" className="object-contain" />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <dt className="text-muted">ابعاد</dt>
          <dd className="num mt-0.5 font-medium">
            {item.width ? `${toFaDigits(item.width)}×${toFaDigits(item.height)}` : 'نامشخص'}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <dt className="text-muted">حجم</dt>
          <dd className="num mt-0.5 font-medium">{formatBytes(item.size)}</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-surface-2 px-3 py-2">
          <dt className="text-muted">نام فایل</dt>
          <dd className="en-code mt-0.5 break-all font-medium">{item.name}</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-surface-2 px-3 py-2">
          <dt className="text-muted">آپلود</dt>
          <dd className="mt-0.5 font-medium">{formatDateTime(item.createdAt)}</dd>
        </div>
      </dl>

      <Field label="عنوان" hint="فقط برای پیدا کردن تصویر در همین کتابخانه">
        <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </Field>
      <Field label="متن جایگزین" hint="وقتی تصویر بالا نیاید یا کاربر نابینا باشد، همین خوانده می‌شود">
        <Input value={draft.alt} onChange={(e) => setDraft({ ...draft, alt: e.target.value })} />
      </Field>
      <Field label="توضیح">
        <Textarea
          value={draft.caption}
          onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
          className="min-h-20 text-[12.5px]"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              { id: item.id, ...draft },
              { onSuccess: () => toast.success('ذخیره شد'), onError: (e) => toast.error(e.message) },
            )
          }
        >
          ذخیره
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Scissors className="size-3.5" />
          برش و تغییر اندازه
        </Button>
        <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => del(false)}>
          <Trash2 className="size-3.5" />
          حذف از کتابخانه
        </Button>
      </div>

      <MediaEditor item={item} open={editing} onClose={() => setEditing(false)} onSaved={onCreated} />

      {confirmUsage > 0 && (
        <div className="space-y-2 rounded-xl bg-amber-500/10 p-3.5 text-[12.5px] leading-6 text-amber-700 dark:text-amber-300">
          <p className="num">
            این تصویر در {toFaDigits(confirmUsage)} جای سایت استفاده شده است. با حذفش، آن‌جاها بدون تصویر می‌مانند.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={() => del(true)}>
              با این حال حذف کن
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmUsage(0)}>
              انصراف
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ پنجره‌ی انتخاب ------------------------------ */

/**
 * پنجره‌ی «انتخاب از کتابخانه»؛ هر جای پنل که تصویر می‌خواهد از همین باز می‌شود.
 * هم می‌شود از تصویرهای موجود برداشت و هم همان‌جا تصویر تازه آپلود کرد.
 */
export function MediaPicker({
  open,
  multiple = false,
  advice,
  onClose,
  onPick,
}: {
  open: boolean
  multiple?: boolean
  advice?: MediaAdvice
  onClose: () => void
  onPick: (urls: string[]) => void
}) {
  const [picked, setPicked] = useState<MediaItem[]>([])
  const urls = useMemo(() => picked.map((p) => p.url), [picked])

  const toggle = (item: MediaItem) => {
    if (!multiple) {
      setPicked([item])
      return
    }
    setPicked((prev) => (prev.some((p) => p.url === item.url) ? prev.filter((p) => p.url !== item.url) : [...prev, item]))
  }

  const confirm = () => {
    if (!urls.length) {
      toast.error('اول یک تصویر انتخاب کنید')
      return
    }
    onPick(urls)
    setPicked([])
    onClose()
  }

  return (
    <Drawer
      // با هر بار باز شدن از نو ساخته می‌شود تا انتخاب قبلی نماند
      key={open ? 'open' : 'closed'}
      open={open}
      onClose={onClose}
      title="انتخاب تصویر"
      widthClass="w-full max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="num text-[12.5px] text-muted">
            {picked.length ? `${toFaDigits(picked.length)} تصویر انتخاب شده` : 'چیزی انتخاب نشده'}
          </span>
          <Button onClick={confirm} disabled={!picked.length}>
            {multiple ? 'افزودن به فهرست' : 'انتخاب این تصویر'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 p-5 lg:grid-cols-[1.6fr_1fr]">
        <MediaBrowser
          advice={advice}
          selected={urls}
          onToggle={toggle}
          // تصویر تازه‌آپلودشده خودبه‌خود انتخاب می‌شود؛ کسی که آپلود می‌کند همان را می‌خواهد
          onFirstLoad={(item) => (multiple ? setPicked((prev) => [...prev, item]) : setPicked([item]))}
        />

        <aside className="min-w-0">
          {picked.length === 1 ? (
            <MediaDetails
              item={picked[0]}
              onDeleted={() => setPicked([])}
              // کسی که همین‌جا تصویر را برید، همان کپی را می‌خواهد نه اصل را
              onCreated={(created) => setPicked(multiple ? [...picked, created] : [created])}
            />
          ) : (
            <p className="rounded-xl bg-surface-2 p-4 text-[12.5px] leading-7 text-muted">
              {picked.length > 1
                ? 'برای دیدن و ویرایش جزئیات، فقط یک تصویر انتخاب کنید.'
                : 'روی یک تصویر بزنید تا جزئیاتش اینجا بیاید.'}
            </p>
          )}
        </aside>
      </div>
    </Drawer>
  )
}

/** نشان کوچک «اندازه مناسب نیست» برای استفاده کنار کادرهای تصویر */
export function MediaFitBadge({ item, advice }: { item: MediaItem; advice?: MediaAdvice }) {
  if (mediaFit(item, advice) !== 'small') return null

  return <Badge tone="warning">اندازه کوچک‌تر از حد پیشنهادی</Badge>
}
