'use client'

import { useMemo, useState } from 'react'
import { Check, MessageSquare, X } from 'lucide-react'
import { useAdminReviews, useModerateReview } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard } from '@/components/admin/data-table'
import { EmptyRows, FilterBar, TableTitle, matches, useTableFilters } from '@/components/admin/filters'
import { Pagination, usePagination } from '@/components/admin/pagination'
import { SortSelect, useSort } from '@/components/admin/sorting'
import { BulkBar, runBulk, useSelection } from '@/components/admin/selection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Rating } from '@/components/ui/rating'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { timeAgo, toFaDigits } from '@/lib/format'

const statusTone = { pending: 'warning', approved: 'success', rejected: 'danger' } as const
const statusLabel = { pending: 'در انتظار تأیید', approved: 'تأیید شده', rejected: 'رد شده' }

export default function AdminReviewsPage() {
  const { data, isLoading } = useAdminReviews()
  const moderate = useModerateReview()
  const filters = useTableFilters(['status', 'rating'])

  const all = useMemo(() => data ?? [], [data])
  const items = useMemo(
    () =>
      all.filter(
        (r) =>
          matches(filters.term, r.productTitle, r.userName, r.title, r.body) &&
          (filters.pick('status') ?? r.status) === r.status &&
          (filters.pick('rating') ?? String(r.rating)) === String(r.rating),
      ),
    [all, filters],
  )

  const sort = useSort(
    items,
    {
      createdAt: { get: (r) => r.createdAt, defaultDirection: 'desc' },
      rating: { get: (r) => r.rating, defaultDirection: 'desc' },
      // در انتظار تأیید اول می‌آید چون کار ادمین همان‌جاست
      status: (r) => ['pending', 'approved', 'rejected'].indexOf(r.status),
      productTitle: (r) => r.productTitle,
      userName: (r) => r.userName,
    },
    { key: 'createdAt' },
  )

  const pagination = usePagination(sort.sorted, 10, `${filters.token}|${sort.token}`)
  const selection = useSelection(
    pagination.pageItems.map((r) => r.id),
    sort.sorted.map((r) => r.id),
  )
  const [bulkBusy, setBulkBusy] = useState(false)

  /** تأیید یا رد گروهی — کار اصلی این صفحه روی نظرهای «در انتظار» است */
  const moderateSelected = async (status: 'approved' | 'rejected') => {
    const ids = selection.selected.filter((id) => all.find((r) => r.id === id)?.status !== status)
    if (!ids.length) return

    setBulkBusy(true)
    const { done, failed, firstError } = await runBulk(ids, (id) => moderate.mutateAsync({ id, status }))
    setBulkBusy(false)
    selection.clear()
    if (done) toast.success(`${toFaDigits(done)} نظر ${status === 'approved' ? 'تأیید' : 'رد'} شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} نظر تغییر نکرد`)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
    )
  }

  const pending = all.filter((r) => r.status === 'pending')

  return (
    <PermissionGate permission="review.moderate">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TableTitle
            title="مدیریت نظرات"
            unit="نظر"
            total={all.length}
            shown={items.length}
            filters={filters}
            description={pending.length ? `${toFaDigits(pending.length)} نظر در انتظار تأیید` : 'نظری در انتظار تأیید نیست'}
          />
          <SortSelect
            sort={sort}
            options={[
              { key: 'createdAt', label: 'تاریخ ثبت' },
              { key: 'status', label: 'وضعیت' },
              { key: 'rating', label: 'امتیاز' },
              { key: 'productTitle', label: 'نام کالا' },
              { key: 'userName', label: 'نام کاربر' },
            ]}
          />
        </div>

        <FilterBar
          filters={filters}
          placeholder="نام کالا، نام کاربر یا متن نظر…"
          selects={[
            {
              id: 'status',
              label: 'وضعیت',
              options: (Object.keys(statusLabel) as (keyof typeof statusLabel)[]).map((status) => ({
                value: status,
                label: statusLabel[status],
              })),
            },
            {
              id: 'rating',
              label: 'امتیاز',
              options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${toFaDigits(n)} ستاره` })),
            },
          ]}
        />

        {!items.length && (
          <AdminCard>
            <EmptyRows filters={filters} icon={MessageSquare} title="نظری ثبت نشده" />
          </AdminCard>
        )}

        {selection.count > 0 && (
          <AdminCard>
            <BulkBar selection={selection} unit="نظر">
              <Button size="sm" loading={bulkBusy} onClick={() => void moderateSelected('approved')}>
                <Check className="size-3.5" />
                تأیید انتخاب‌شده‌ها
              </Button>
              <Button size="sm" variant="danger" loading={bulkBusy} onClick={() => void moderateSelected('rejected')}>
                <X className="size-3.5" />
                رد انتخاب‌شده‌ها
              </Button>
            </BulkBar>
          </AdminCard>
        )}

        {/* انتخاب گروهی روی همین صفحه؛ کارت‌ها جدول نیستند پس تیک داخل خود کارت است */}
        {pagination.pageItems.length > 0 && (
          <label className="flex w-fit cursor-pointer items-center gap-2 px-1 text-[12px] text-muted">
            <input
              type="checkbox"
              className="size-4 cursor-pointer accent-[var(--color-brand-500)]"
              checked={selection.pageAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = !selection.pageAllSelected && selection.pageSomeSelected
              }}
              onChange={selection.togglePage}
            />
            انتخاب همه‌ی نظرهای این صفحه
          </label>
        )}

        <div className="space-y-3">
          {pagination.pageItems.map((review) => (
            <AdminCard key={review.id}>
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer accent-[var(--color-brand-500)]"
                    checked={selection.has(review.id)}
                    onChange={() => selection.toggle(review.id)}
                    aria-label={`انتخاب نظر ${review.userName}`}
                  />
                  <span className="grid size-9 place-items-center rounded-full bg-brand-500/10 text-[12px] font-bold text-brand-600 dark:text-brand-400">
                    {review.userName.charAt(0)}
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-bold">{review.userName}</span>
                    <span className="block text-[10.5px] text-muted">
                      روی «{review.productTitle}» — {timeAgo(review.createdAt)}
                    </span>
                  </span>
                  <Rating value={review.rating} showValue={false} className="ms-2" />
                  <Badge tone={statusTone[review.status]} className="ms-auto">
                    {statusLabel[review.status]}
                  </Badge>
                </div>

                <div>
                  <p className="text-[13px] font-bold">{review.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-7 text-muted">{review.body}</p>
                </div>

                <div className="flex gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    disabled={review.status === 'approved'}
                    onClick={() =>
                      moderate.mutate(
                        { id: review.id, status: 'approved' },
                        { onSuccess: () => toast.success('نظر تأیید شد') },
                      )
                    }
                  >
                    <Check className="size-3.5" />
                    تأیید
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={review.status === 'rejected'}
                    onClick={() =>
                      moderate.mutate(
                        { id: review.id, status: 'rejected' },
                        { onSuccess: () => toast.info('نظر رد شد') },
                      )
                    }
                  >
                    <X className="size-3.5" />
                    رد
                  </Button>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>

        <AdminCard>
          <Pagination state={pagination} label="نظر" className="border-t-0" />
        </AdminCard>
      </div>
    </PermissionGate>
  )
}
