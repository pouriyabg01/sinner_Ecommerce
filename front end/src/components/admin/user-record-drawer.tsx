'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { ArrowUpLeft, MapPin, Package, Trash2, Wrench } from 'lucide-react'
import {
  PERMISSION_GROUPS,
  ROLE_LABEL,
  USER_STATUS_HINT,
  USER_STATUS_LABEL,
  USER_STATUS_OPTIONS,
  USER_STATUS_TONE,
  sanitizeAdminPermissions,
  type Permission,
  type User,
  type UserStatus,
} from '@/types/user'
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order'
import { REPAIR_STATUS_LABEL, type RepairStatus } from '@/types/repair'
import { ApiError } from '@/lib/api/client'
import { useAdminUser, useDeleteUser, useUpdateOrder, useUpdateRepair, useUpdateUser } from '@/lib/api/queries'
import { AdminCard } from '@/components/admin/data-table'
import { PermissionCheck } from '@/components/admin/permission-check'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { ChipPicker } from '@/components/ui/chip-picker'
import { Field, Input, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { OrderStatusChip, RepairStatusChip } from '@/components/ui/status-chip'
import { toast } from '@/components/ui/toast'
import { useCan } from '@/lib/use-can'
import { useForm } from '@/lib/use-form'
import { emailSchema, mobileSchema, optionalText, requiredText } from '@/lib/validation'
import { formatDate, formatPhone, formatPrice, toFaDigits } from '@/lib/format'

const profileSchema = z.object({
  fullName: requiredText('نام و نام خانوادگی'),
  phone: mobileSchema,
  email: emailSchema,
  adminTitle: optionalText(60, 'عنوان ادمین'),
})

/** دسترسی‌ها فرم‌شان تیک است، نه ورودی متنی، پس بیرون از schema نگه داشته می‌شوند */
type Draft = z.input<typeof profileSchema> & { permissions: Permission[] }

export function UserRecordDrawer({
  userId,
  onClose,
}: {
  /** null یعنی کشو بسته است */
  userId: string | null
  onClose: () => void
}) {
  const { data, isLoading, isError, refetch } = useAdminUser(userId)
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const updateOrder = useUpdateOrder()
  const updateRepair = useUpdateRepair()
  const can = useCan()

  const [draft, setDraft] = useState<Draft>({ fullName: '', phone: '', email: '', adminTitle: '', permissions: [] })
  const form = useForm(profileSchema)

  const user = data?.user

  useEffect(() => {
    if (!user) return
    form.reset()
    setDraft({
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      adminTitle: user.adminTitle ?? '',
      permissions: sanitizeAdminPermissions(user.permissions),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  const isAdminAccount = user?.role === 'admin'
  const samePermissions =
    !user || sanitizeAdminPermissions(user.permissions).join() === draft.permissions.join()

  const dirty =
    Boolean(user) &&
    (draft.fullName !== user!.fullName ||
      draft.phone !== user!.phone ||
      draft.email !== user!.email ||
      (isAdminAccount && (draft.adminTitle !== (user!.adminTitle ?? '') || !samePermissions)))

  const togglePermission = (permission: Permission) =>
    setDraft((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }))

  const fail = (error: unknown) => {
    const field = error instanceof ApiError ? (error.payload as { field?: string })?.field : undefined
    if (field) form.setError(field, error instanceof Error ? error.message : '')
    toast.error(error instanceof Error ? error.message : 'عملیات ناموفق بود')
  }

  const save = () => {
    if (!user) return
    const clean = form.validate(draft)
    if (!clean) return toast.error('چند فیلد ایراد دارد — پیام‌های قرمز را بررسی کنید')

    // عنوان و دسترسی فقط برای ادمین معنا دارد؛ برای مشتری اصلاً فرستاده نمی‌شود
    const { adminTitle, ...profile } = clean
    if (isAdminAccount && draft.permissions.length === 0) {
      return toast.error('دست‌کم یک دسترسی برای این ادمین انتخاب کنید')
    }

    const body = isAdminAccount
      ? { ...profile, adminTitle, permissions: draft.permissions }
      : profile

    updateUser.mutate(
      { id: user.id, body },
      { onSuccess: () => toast.success('اطلاعات کاربر ذخیره شد'), onError: fail },
    )
  }

  const setUserStatus = (status: UserStatus) => {
    if (!user) return
    updateUser.mutate(
      { id: user.id, body: { status } },
      {
        onSuccess: () => toast.success(`وضعیت کاربر «${USER_STATUS_LABEL[status]}» شد`),
        onError: fail,
      },
    )
  }

  /** همان کاری که جدول سفارش‌ها و صفحه‌ی تعمیرات می‌کنند، بدون بیرون رفتن از پرونده */
  const setOrderStatus = (id: string, status: OrderStatus) =>
    updateOrder.mutate(
      { id, body: { status } },
      { onSuccess: () => toast.success('وضعیت سفارش به‌روز شد'), onError: fail },
    )

  const setRepairStatus = (id: string, status: RepairStatus) =>
    updateRepair.mutate(
      { id, body: { status } },
      { onSuccess: () => toast.success('وضعیت تعمیر به‌روز شد'), onError: fail },
    )

  const remove = () => {
    if (!user) return
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        toast.success('کاربر حذف شد')
        onClose()
      },
      onError: fail,
    })
  }

  const isSuper = user?.role === 'admin_super'
  /** دسترسی‌های پنل را فقط مدیر کل عوض می‌کند */
  const canAdmins = can('admin.manage')
  /** ادمینی که فقط کاربران را مدیریت می‌کند نباید وضعیت سفارش یا تعمیر را عوض کند */
  const canOrders = can('order.manage')
  const canRepairs = can('repair.manage')

  return (
    <Drawer
      open={Boolean(userId)}
      onClose={onClose}
      title={user ? `ویرایش ${user.fullName}` : 'ویرایش کاربر'}
      footer={
        user ? (
          <Button block loading={updateUser.isPending} disabled={!dirty} onClick={save}>
            ذخیره تغییرات
          </Button>
        ) : undefined
      }
    >
      {isError ? (
        <LoadError onRetry={() => refetch()} />
      ) : isLoading || !data || !user ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-lg font-bold text-brand-600 dark:text-brand-400">
              {user.fullName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="font-bold">{user.fullName}</p>
              <p className="num text-[11px] text-muted">عضویت {formatDate(user.createdAt)}</p>
            </div>
            <div className="ms-auto flex gap-1.5">
              <Badge tone={user.role === 'customer' ? 'neutral' : 'brand'}>
                {user.adminTitle ?? ROLE_LABEL[user.role]}
              </Badge>
              <Badge tone={USER_STATUS_TONE[user.status]}>
                {USER_STATUS_LABEL[user.status]}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border p-3.5">
            <p className="text-[11.5px] text-muted">وضعیت حساب</p>
            <ChipPicker
              label="تغییر وضعیت حساب کاربر"
              value={user.status}
              options={USER_STATUS_OPTIONS}
              disabled={isSuper || updateUser.isPending}
              onChange={setUserStatus}
            />
            <p className="text-[11px] leading-6 text-muted">
              {isSuper ? 'وضعیت حساب مدیر کل تغییر نمی‌کند.' : USER_STATUS_HINT[user.status]}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'سفارش‌ها', value: toFaDigits(data.stats.orderCount) },
              { label: 'مجموع خرید', value: formatPrice(data.stats.spent, false) },
              { label: 'تعمیرات باز', value: toFaDigits(data.stats.openRepairs) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border p-3 text-center">
                <p className="text-[10.5px] text-muted">{stat.label}</p>
                <p className="num mt-1 text-[13px] font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Field label="نام و نام خانوادگی" required error={form.errors.fullName}>
              <Input
                value={draft.fullName}
                invalid={Boolean(form.errors.fullName)}
                onChange={(e) => update({ fullName: e.target.value })}
              />
            </Field>
            <Field label="موبایل" required error={form.errors.phone}>
              <Input
                value={draft.phone}
                invalid={Boolean(form.errors.phone)}
                dir="ltr"
                inputMode="numeric"
                className="num text-start"
                onChange={(e) => update({ phone: e.target.value })}
              />
            </Field>
            <Field label="ایمیل" required error={form.errors.email}>
              <Input
                value={draft.email}
                invalid={Boolean(form.errors.email)}
                dir="ltr"
                className="text-start"
                onChange={(e) => update({ email: e.target.value })}
              />
            </Field>
          </div>

          {/* ادمین‌ها اینجا ویرایش می‌شوند؛ پیش‌تر فقط موقع ساخت می‌شد دسترسی داد */}
          {(isAdminAccount || isSuper) && canAdmins && (
            <div className="space-y-4 rounded-2xl border border-border p-3.5">
              <p className="text-[12.5px] font-bold">دسترسی‌های پنل</p>

              {isSuper ? (
                <p className="text-[11.5px] leading-6 text-muted">
                  مدیر کل به همه‌ی بخش‌ها دسترسی دارد و این فهرست برایش تغییر نمی‌کند.
                </p>
              ) : (
                <>
                  <Field label="عنوان ادمین" hint="مثل «ادمین کاتالوگ»" error={form.errors.adminTitle}>
                    <Input
                      value={draft.adminTitle}
                      invalid={Boolean(form.errors.adminTitle)}
                      onChange={(e) => update({ adminTitle: e.target.value })}
                    />
                  </Field>

                  <div className="space-y-3">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.title}>
                        <p className="mb-1 text-[11px] font-bold text-muted">{group.title}</p>
                        <div className="space-y-0.5">
                          {group.permissions.map((permission) => (
                            <PermissionCheck
                              key={permission}
                              permission={permission}
                              checked={draft.permissions.includes(permission)}
                              onChange={() => togglePermission(permission)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <Section icon={MapPin} title="آدرس‌ها" count={user.addresses.length}>
            {user.addresses.map((address) => (
              <div key={address.id} className="rounded-2xl border border-border p-3.5">
                <p className="flex items-center gap-2 text-[12.5px] font-bold">
                  {address.title}
                  {address.isDefault && <Badge tone="brand">پیش‌فرض</Badge>}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-6 text-muted">
                  {address.province}، {address.city}، {address.line}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {address.receiver} —{' '}
                  <span className="num" dir="ltr">
                    {formatPhone(address.phone)}
                  </span>
                </p>
              </div>
            ))}
          </Section>

          <Section icon={Package} title="سفارش‌ها" count={data.orders.length}>
            {data.orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {canOrders ? (
                    <Link
                      href={`/admin/orders?q=${encodeURIComponent(order.code)}`}
                      onClick={onClose}
                      className="en-code inline-flex items-center gap-1 text-[12.5px] font-bold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                      title="نمایش در جدول سفارش‌ها">
                      {order.code}
                      <ArrowUpLeft className="size-3.5 shrink-0" />
                    </Link>
                  ) : (
                    <span className="en-code text-[12.5px] font-bold">{order.code}</span>
                  )}
                  <OrderStatusChip status={order.status} />
                  <span className="num text-[11px] text-muted">{formatDate(order.createdAt)}</span>
                  <span className="num ms-auto text-[12.5px] font-bold">{formatPrice(order.total)}</span>
                </div>

                {canOrders && (
                  <label className="mt-2.5 flex items-center gap-2 text-[11px] text-muted">
                    <span className="whitespace-nowrap">تغییر وضعیت</span>
                    <Select
                      value={order.status}
                      disabled={updateOrder.isPending}
                      aria-label={`تغییر وضعیت سفارش ${order.code}`}
                      onChange={(e) => setOrderStatus(order.id, e.target.value as OrderStatus)}
                      className="h-9 w-full text-[12px]"
                    >
                      {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
              </div>
            ))}
          </Section>

          <Section icon={Wrench} title="تعمیرات" count={data.repairs.length}>
            {data.repairs.map((repair) => (
              <div key={repair.id} className="rounded-2xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {canRepairs ? (
                    <Link
                      href={`/admin/repairs?q=${encodeURIComponent(repair.code)}`}
                      onClick={onClose}
                      className="en-code inline-flex items-center gap-1 text-[12.5px] font-bold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                      title="باز کردن این درخواست در صفحه‌ی تعمیرات">
                      {repair.code}
                      <ArrowUpLeft className="size-3.5 shrink-0" />
                    </Link>
                  ) : (
                    <span className="en-code text-[12.5px] font-bold">{repair.code}</span>
                  )}
                  <RepairStatusChip status={repair.status} />
                  <span className="ms-auto text-[11.5px] text-muted">{repair.device}</span>
                </div>

                {canRepairs && (
                  <label className="mt-2.5 flex items-center gap-2 text-[11px] text-muted">
                    <span className="whitespace-nowrap">تغییر وضعیت</span>
                    <Select
                      value={repair.status}
                      disabled={updateRepair.isPending}
                      aria-label={`تغییر وضعیت تعمیر ${repair.code}`}
                      onChange={(e) => setRepairStatus(repair.id, e.target.value as RepairStatus)}
                      className="h-9 w-full text-[12px]"
                    >
                      {(Object.keys(REPAIR_STATUS_LABEL) as RepairStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {REPAIR_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
              </div>
            ))}
          </Section>

          <AdminCard title="حذف حساب" className="border-red-500/25">
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] text-muted">
                  {isSuper
                    ? 'حساب مدیر کل حذف نمی‌شود.'
                    : data.stats.orderCount || data.repairs.length
                      ? 'کاربری که سابقه‌ی سفارش یا تعمیر دارد حذف نمی‌شود.'
                      : 'حذف حساب برگشت‌پذیر نیست.'}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted hover:text-red-500"
                  loading={deleteUser.isPending}
                  disabled={isSuper || data.stats.orderCount > 0 || data.repairs.length > 0}
                  onClick={remove}
                >
                  <Trash2 className="size-4" />
                  حذف کاربر
                </Button>
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </Drawer>
  )
}

/** بخش تاشوی پرونده؛ وقتی چیزی ندارد، به‌جای فهرست خالی یک خط توضیح می‌ماند */
function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ElementType
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-[13px] font-bold">
        <Icon className="size-4 text-brand-500" />
        {title}
        <span className="num text-[11px] font-normal text-muted">({toFaDigits(count)})</span>
      </p>
      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-3 text-center text-[11.5px] text-muted">
          موردی ثبت نشده است
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}
