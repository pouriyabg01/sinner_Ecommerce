'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff, RotateCcw, Trash2 } from 'lucide-react'
import { useEmptyTrash, usePurgeTrashed, useRestoreTrashed, useTrash } from '@/lib/api/queries'
import type { TrashedItem } from '@/lib/api/endpoints'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { confirmAction } from '@/components/ui/confirm'
import { formatDateTime, toFaDigits } from '@/lib/format'

/**
 * سطل زباله‌ی پنل.
 *
 * هر چیزی که در پنل حذف شود اول اینجا می‌آید و از فروشگاه پنهان می‌ماند.
 * از همین‌جا یا برمی‌گردد سر جای خودش — با همان شناسه و همان پیوندها — یا
 * برای همیشه می‌رود.
 */
export default function AdminTrashPage() {
  const trash = useTrash()
  const restore = useRestoreTrashed()
  const purge = usePurgeTrashed()
  const empty = useEmptyTrash()
  const [busy, setBusy] = useState<string | null>(null)

  const items = trash.data ?? []
  const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : 'عملیات ناموفق بود')
  const key = (item: TrashedItem) => `${item.type}:${item.id}`

  const restoreOne = (item: TrashedItem) => {
    setBusy(key(item))
    restore.mutate(
      { type: item.type, id: item.id },
      {
        onSuccess: () => toast.success(`«${item.title}» برگشت`),
        onError: fail,
        onSettled: () => setBusy(null),
      },
    )
  }

  const purgeOne = async (item: TrashedItem) => {
    const ok = await confirmAction({
      title: `«${item.title}» برای همیشه حذف شود؟`,
      body: 'بعد از این دیگر راهی برای برگرداندنش نیست.',
      confirmLabel: 'حذف کامل',
    })
    if (!ok) return

    setBusy(key(item))
    purge.mutate(
      { type: item.type, id: item.id },
      { onSuccess: () => toast.success('برای همیشه حذف شد'), onError: fail, onSettled: () => setBusy(null) },
    )
  }

  const emptyAll = async () => {
    const ok = await confirmAction({
      title: 'سطل زباله خالی شود؟',
      body: `${toFaDigits(items.length)} چیز داخلش هست و همه برای همیشه می‌روند.`,
      confirmLabel: 'خالی کردن سطل',
    })
    if (!ok) return

    empty.mutate(undefined, {
      onSuccess: (result) => toast.success(`${toFaDigits(result.removed)} چیز برای همیشه حذف شد`),
      onError: fail,
    })
  }

  return (
    <PermissionGate permission="dashboard.view">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">سطل زباله</h1>
            <p className="pt-1.5 text-[13px] leading-6 text-muted">
              هرچه در پنل حذف شود اول اینجا می‌آید و از فروشگاه پنهان می‌ماند. تا وقتی اینجاست، برگرداندنش یک کلیک است.
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="outline"
              loading={empty.isPending}
              onClick={() => void emptyAll()}
              className="border-red-500/40 text-red-600 hover:border-red-500 hover:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 className="size-4" />
              خالی کردن سطل
            </Button>
          )}
        </div>

        <AdminCard>
          {trash.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !items.length ? (
            <EmptyState
              icon={Trash2}
              title="سطل زباله خالی است"
              description="هر چیزی که در پنل حذف کنی اینجا می‌نشیند تا خیالت راحت باشد."
            />
          ) : (
            <Table head={['چه چیزی', 'نوع', 'زمان حذف', '']}>
              {items.map((item) => (
                <tr key={key(item)} className="transition-colors hover:bg-surface-2/40">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-muted">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt=""
                            width={40}
                            height={40}
                            className="size-10 object-cover"
                            unoptimized
                          />
                        ) : (
                          <ImageOff className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 truncate font-bold">{item.title}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <Badge tone="neutral">{item.typeLabel}</Badge>
                  </td>
                  <td className="num p-3.5 text-muted">{item.deletedAt ? formatDateTime(item.deletedAt) : '—'}</td>
                  <td className="p-3.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === key(item) && restore.isPending}
                        onClick={() => restoreOne(item)}
                      >
                        <RotateCcw className="size-3.5" />
                        برگرداندن
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف کامل"
                        className="text-muted hover:text-red-500"
                        onClick={() => void purgeOne(item)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </AdminCard>
      </div>
    </PermissionGate>
  )
}
