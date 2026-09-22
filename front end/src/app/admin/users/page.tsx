'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import type { User, UserRole, UserStatus } from '@/types/user'
import { ROLE_LABEL, USER_STATUS_LABEL, USER_STATUS_TONE } from '@/types/user'
import { useAdminUsers, useDeleteUser } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { EmptyRows, FilterBar, TableTitle, matches, useTableFilters } from '@/components/admin/filters'
import { Pagination, usePagination } from '@/components/admin/pagination'
import { useSort } from '@/components/admin/sorting'
import { BulkBar, SelectCell, runBulk, useSelection } from '@/components/admin/selection'
import { UserCreateDrawer } from '@/components/admin/user-create-drawer'
import { UserRecordDrawer } from '@/components/admin/user-record-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useSession } from '@/store/session'
import { formatDate, formatPhone, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/** useSearchParams باید داخل Suspense باشد وگرنه build صفحه را رد می‌کند */
export default function AdminUsersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-card" />}>
      <UsersView />
    </Suspense>
  )
}

function UsersView() {
  const { data, isLoading } = useAdminUsers()
  // لینک «تعمیرات ← مشتری» با ?q=<شماره موبایل> می‌آید
  const focused = useSearchParams().get('q')?.trim() ?? ''
  const filters = useTableFilters(['role', 'status'], focused)
  /** null یعنی کشوی پرونده بسته است */
  const [openUser, setOpenUser] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const all = useMemo(() => data ?? [], [data])
  const items = useMemo(
    () =>
      all.filter(
        (u) =>
          matches(filters.term, u.fullName, u.phone, u.email, u.adminTitle) &&
          (filters.pick('role') ?? u.role) === u.role &&
          (filters.pick('status') ?? u.status) === u.status,
      ),
    [all, filters],
  )

  const sort = useSort(
    items,
    {
      fullName: (u) => u.fullName,
      email: (u) => u.email,
      status: (u) => USER_STATUS_LABEL[u.status],
      createdAt: { get: (u) => u.createdAt, defaultDirection: 'desc' },
    },
    { key: 'createdAt' },
  )

  const pagination = usePagination(sort.sorted, 10, `${filters.token}|${sort.token}`)
  const selection = useSelection(
    pagination.pageItems.map((u) => u.id),
    sort.sorted.map((u) => u.id),
  )
  const deleteUser = useDeleteUser()
  const myId = useSession((state) => state.userId)
  const [bulkBusy, setBulkBusy] = useState(false)

  /** دو حساب دست‌نخوردنی‌اند: حساب خودِ ادمین و مدیر کل. سرور هم همین را می‌گوید */
  const locked = (user: User) =>
    user.id === myId ? 'حساب خودتان' : user.role === 'admin_super' ? 'حساب مدیر کل' : null

  /** حساب دارای سفارش یا تعمیر پاک نمی‌شود؛ سرور به‌جایش مسدودش می‌کند */
  const afterDelete = (name: string, result: unknown) =>
    (result as { deleted?: boolean })?.deleted === false
      ? toast.success(`«${name}» سابقه‌ی سفارش دارد؛ به‌جای حذف مسدود شد`)
      : toast.success(`«${name}» حذف شد`)

  const removeUser = (user: User) => {
    if (locked(user)) return
    if (!confirm(`آیا «${user.fullName}» حذف شود؟ اگر سفارش یا تعمیری داشته باشد، به‌جای حذف مسدود می‌شود.`)) return
    deleteUser.mutate(user.id, {
      onSuccess: (result) => afterDelete(user.fullName, result),
      onError: (error: Error) => toast.error(error.message),
    })
  }

  const removeSelected = async () => {
    const ids = selection.selected.filter((id) => {
      const user = all.find((u) => u.id === id)
      return user && !locked(user)
    })
    if (!ids.length) return
    if (!confirm(`آیا ${toFaDigits(ids.length)} کاربر حذف شوند؟ حساب‌های دارای سفارش به‌جای حذف مسدود می‌شوند.`)) return

    setBulkBusy(true)
    const { done, failed, firstError } = await runBulk(ids, (id) => deleteUser.mutateAsync(id))
    setBulkBusy(false)
    selection.clear()
    if (done) toast.success(`${toFaDigits(done)} کاربر حذف یا مسدود شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} مورد انجام نشد`)
  }

  return (
    <PermissionGate permission="user.manage">
      <div className="space-y-5">
        <TableTitle title="کاربران" unit="کاربر" total={all.length} shown={items.length} filters={filters} />

        <FilterBar
          filters={filters}
          placeholder="نام، موبایل یا ایمیل…"
          action={
            <Button onClick={() => setCreating(true)}>
              <UserPlus className="size-4" />
              کاربر جدید
            </Button>
          }
          selects={[
            {
              id: 'role',
              label: 'نقش',
              options: (Object.keys(ROLE_LABEL) as UserRole[]).map((role) => ({
                value: role,
                label: ROLE_LABEL[role],
              })),
            },
            {
              id: 'status',
              label: 'وضعیت',
              options: (Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((status) => ({
                value: status,
                label: USER_STATUS_LABEL[status],
              })),
            },
          ]}
        />

        <AdminCard>
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !items.length ? (
            <EmptyRows filters={filters} icon={Users} title="کاربری ثبت نشده" />
          ) : (
            <>
            <BulkBar selection={selection} unit="کاربر">
              <Button
                variant="ghost"
                size="sm"
                loading={bulkBusy}
                className="text-red-600 hover:text-red-700"
                onClick={() => void removeSelected()}
              >
                <Trash2 className="size-3.5" />
                حذف انتخاب‌شده‌ها
              </Button>
            </BulkBar>
            <Table
              selection={selection}
              sort={sort}
              head={[
                { label: 'نام', sortKey: 'fullName' },
                'موبایل',
                { label: 'ایمیل', sortKey: 'email' },
                { label: 'وضعیت', sortKey: 'status' },
                'آدرس‌ها',
                { label: 'عضویت', sortKey: 'createdAt' },
                '',
              ]}
            >
              {pagination.pageItems.map((user) => (
                <tr
                  key={user.id}
                  className={cn(
                    'transition-colors hover:bg-surface-2/40',
                    user.phone === focused && 'bg-brand-500/[0.07]',
                  )}
                >
                  <SelectCell
                    selection={selection}
                    id={user.id}
                    label={user.fullName}
                    disabled={Boolean(locked(user))}
                    reason={locked(user) ? `${locked(user)} حذف نمی‌شود` : undefined}
                  />
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-full bg-brand-500/10 text-[11px] font-bold text-brand-600 dark:text-brand-400">
                        {user.fullName.charAt(0)}
                      </span>
                      <span className="font-medium">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="num p-3.5 text-muted" dir="ltr">
                    {formatPhone(user.phone)}
                  </td>
                  <td className="p-3.5 text-muted" dir="ltr">
                    {user.email}
                  </td>
                  <td className="p-3.5">
                    <Badge tone={USER_STATUS_TONE[user.status]}>
                      {USER_STATUS_LABEL[user.status]}
                    </Badge>
                  </td>
                  <td className="num p-3.5 text-muted">{toFaDigits(user.addresses.length)}</td>
                  <td className="p-3.5 text-muted">{formatDate(user.createdAt)}</td>
                  <td className="p-3.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`ویرایش ${user.fullName}`}
                        onClick={() => setOpenUser(user.id)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`حذف ${user.fullName}`}
                        className="text-muted hover:text-red-500"
                        disabled={Boolean(locked(user))}
                        title={locked(user) ? `${locked(user)} حذف نمی‌شود` : undefined}
                        onClick={() => removeUser(user)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            </>
          )}
          {!isLoading && <Pagination state={pagination} label="کاربر" />}
        </AdminCard>

        <UserCreateDrawer open={creating} onClose={() => setCreating(false)} />
        <UserRecordDrawer userId={openUser} onClose={() => setOpenUser(null)} />
      </div>
    </PermissionGate>
  )
}
