'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import {
  ADMIN_PRESETS,
  PERMISSION_GROUPS,
  PERMISSION_LABEL,
  permissionsFor,
  sanitizeAdminPermissions,
  type Permission,
  type User,
} from '@/types/user'
import { useAdmins, useCreateAdmin, useDeleteAdmin } from '@/lib/api/queries'
import { useSession } from '@/store/session'
import { PermissionGate } from '@/components/admin/admin-shell'
import { TableTitle } from '@/components/admin/filters'
import { AdminCard, Table } from '@/components/admin/data-table'
import { Pagination, usePagination } from '@/components/admin/pagination'
import { useSort } from '@/components/admin/sorting'
import { BulkBar, SelectCell, runBulk, useSelection } from '@/components/admin/selection'
import { PermissionCheck } from '@/components/admin/permission-check'
import { UserRecordDrawer } from '@/components/admin/user-record-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field, Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useForm } from '@/lib/use-form'
import { mobileSchema, optionalEmailSchema, optionalText, requiredText } from '@/lib/validation'
import { formatDate, formatPhone, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Draft {
  fullName: string
  adminTitle: string
  phone: string
  email: string
  permissions: Permission[]
}

const emptyDraft: Draft = { fullName: '', adminTitle: '', phone: '', email: '', permissions: [] }

const adminSchema = z.object({
  fullName: requiredText('نام و نام خانوادگی'),
  adminTitle: optionalText(30, 'عنوان ادمین'),
  phone: mobileSchema,
  email: optionalEmailSchema,
  permissions: z
    .array(z.string())
    .min(1, { message: 'حداقل یک دسترسی برای این ادمین انتخاب کنید' }),
})

export default function AdminAdminsPage() {
  const { data, isLoading } = useAdmins()
  const createAdmin = useCreateAdmin()
  const deleteAdmin = useDeleteAdmin()
  const { userId } = useSession()

  const [draft, setDraft] = useState<Draft | null>(null)
  /** null یعنی کشوی پرونده بسته است */
  const [openUser, setOpenUser] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [presetId, setPresetId] = useState('catalog')
  const form = useForm(adminSchema)

  /** هر تغییری در فرم، بعد از اولین تلاش برای ثبت، خطاها را دوباره حساب می‌کند */
  const update = (patch: Partial<Draft>) => {
    if (!draft) return
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  const admins = data ?? []
  const sort = useSort(
    admins,
    {
      fullName: (u) => u.fullName,
      access: { get: (u) => permissionsFor(u).length, defaultDirection: 'desc' },
      createdAt: { get: (u) => u.createdAt, defaultDirection: 'desc' },
    },
    { key: 'createdAt' },
  )
  const pagination = usePagination(sort.sorted, 10, sort.token)
  const selection = useSelection(
    pagination.pageItems.map((a) => a.id),
    sort.sorted.map((a) => a.id),
  )

  /** مدیر کل و حساب خودِ کاربر حذف نمی‌شوند تا پنل بی‌صاحب نماند */
  const locked = (admin: User) =>
    admin.id === userId ? 'حساب خودتان' : admin.role === 'admin_super' ? 'حساب مدیر کل' : null

  const removeSelected = async () => {
    const ids = selection.selected.filter((id) => {
      const admin = admins.find((a) => a.id === id)
      return admin && !locked(admin)
    })
    if (!ids.length) return
    if (!confirm(`آیا دسترسی ${toFaDigits(ids.length)} ادمین حذف شود؟`)) return

    setBulkBusy(true)
    const { done, failed, firstError } = await runBulk(ids, (id) => deleteAdmin.mutateAsync(id))
    setBulkBusy(false)
    selection.clear()
    if (done) toast.success(`${toFaDigits(done)} ادمین حذف شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} مورد انجام نشد`)
  }

  const openDraft = () => {
    const preset = ADMIN_PRESETS[0]
    setPresetId(preset.id)
    form.reset()
    setDraft({ ...emptyDraft, adminTitle: preset.title, permissions: [...preset.permissions] })
  }

  const applyPreset = (id: string) => {
    const preset = ADMIN_PRESETS.find((p) => p.id === id)
    if (!draft || !preset) return
    setPresetId(id)
    update({
      permissions: [...preset.permissions],
      // عنوان دست‌نویس کاربر با عوض کردن قالب پاک نمی‌شود
      adminTitle: ADMIN_PRESETS.some((p) => p.title === draft.adminTitle) ? preset.title : draft.adminTitle,
    })
  }

  const togglePermission = (permission: Permission) => {
    if (!draft) return
    setPresetId('custom')
    update({
      permissions: draft.permissions.includes(permission)
        ? draft.permissions.filter((p) => p !== permission)
        : [...draft.permissions, permission],
    })
  }

  const save = () => {
    if (!draft) return
    const values = form.validate(draft)
    if (!values) return

    createAdmin.mutate(
      {
        fullName: values.fullName,
        adminTitle: values.adminTitle || 'ادمین',
        phone: values.phone,
        email: values.email,
        permissions: sanitizeAdminPermissions(values.permissions),
      },
      {
        onSuccess: (admin: User) => {
          toast.success(`«${admin.fullName}» به‌عنوان ${admin.adminTitle} اضافه شد`)
          setDraft(null)
        },
        onError: (error: Error) => toast.error(error.message),
      },
    )
  }

  return (
    <PermissionGate permission="admin.manage">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TableTitle title="ادمین‌ها" unit="ادمین" total={admins.length} description="حساب‌هایی که به پنل مدیریت دسترسی دارند" />
          <Button onClick={openDraft}>
            <Plus className="size-4" />
            ادمین جدید
          </Button>
        </div>

        <AdminCard>
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
            <BulkBar selection={selection} unit="ادمین">
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
                { label: 'دسترسی‌ها', sortKey: 'access' },
                { label: 'تاریخ ساخت', sortKey: 'createdAt' },
                '',
              ]}
            >
              {pagination.pageItems.map((admin) => {
                const permissions = permissionsFor(admin)
                const isSuper = admin.role === 'admin_super'

                return (
                  <tr key={admin.id} className="transition-colors hover:bg-surface-2/40">
                    <SelectCell
                      selection={selection}
                      id={admin.id}
                      label={admin.fullName}
                      disabled={Boolean(locked(admin))}
                      reason={locked(admin) ? `${locked(admin)} حذف نمی‌شود` : undefined}
                    />
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/10 text-[11px] font-bold text-brand-600 dark:text-brand-400">
                          {admin.fullName.charAt(0)}
                        </span>
                        <span className="font-medium">{admin.fullName}</span>
                        {admin.id === userId && <Badge tone="neutral">خودت</Badge>}
                      </div>
                    </td>
                    <td className="num p-3.5 text-muted" dir="ltr">
                      {formatPhone(admin.phone)}
                    </td>
                    <td className="p-3.5">
                      {isSuper ? (
                        <span className="text-muted">دسترسی کامل</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {permissions.slice(0, 3).map((permission) => (
                            <Badge key={permission} tone="neutral">
                              {PERMISSION_LABEL[permission].label}
                            </Badge>
                          ))}
                          {permissions.length > 3 && (
                            <Badge tone="neutral" className="num">
                              +{toFaDigits(permissions.length - 3)}
                            </Badge>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-muted">{formatDate(admin.createdAt)}</td>
                    <td className="p-3.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`ویرایش ${admin.fullName}`}
                          onClick={() => setOpenUser(admin.id)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="حذف ادمین"
                          className="text-muted hover:text-red-500"
                          disabled={Boolean(locked(admin))}
                          title={locked(admin) ? `${locked(admin)} حذف نمی‌شود` : undefined}
                          onClick={() => {
                            if (confirm(`آیا دسترسی «${admin.fullName}» به پنل حذف شود؟`))
                              deleteAdmin.mutate(admin.id, {
                                onSuccess: () => toast.success('ادمین حذف شد'),
                                onError: (error: Error) => toast.error(error.message),
                              })
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Table>
            </>
          )}
          {!isLoading && <Pagination state={pagination} label="ادمین" />}
        </AdminCard>

        <AdminCard>
          <div className="flex gap-3 p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <ShieldCheck className="size-4.5" />
            </span>
            <div className="space-y-2 text-[12.5px] leading-7 text-muted">
              <p>
                ادمینی که می‌سازید تنها به بخش‌های انتخاب‌شده دسترسی دارد؛ سایر صفحه‌ها برای او در منو نیز نمایش داده
                نمی‌شود.
              </p>
              <p>
                «{PERMISSION_LABEL['admin.manage'].label}» قابل واگذاری نیست — فقط مدیر کل می‌تواند ادمین بسازد یا حذف
                کند. این محدودیت سمت سرور هم دوباره اعمال می‌شود.
              </p>
            </div>
          </div>
        </AdminCard>

        <UserRecordDrawer userId={openUser} onClose={() => setOpenUser(null)} />

        <Drawer
          open={draft !== null}
          onClose={() => setDraft(null)}
          title="ادمین جدید"
          widthClass="w-full max-w-lg"
          footer={
            <div className="flex gap-2">
              <Button block loading={createAdmin.isPending} onClick={save}>
                ساخت ادمین
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                انصراف
              </Button>
            </div>
          }
        >
          {draft && (
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="block text-[13px] font-medium">نوع ادمین</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ADMIN_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={cn(
                        'rounded-2xl border p-3 text-start transition-all',
                        presetId === preset.id
                          ? 'border-brand-500 bg-brand-500/5'
                          : 'border-border hover:border-brand-400',
                      )}
                    >
                      <span className="block text-[12.5px] font-bold">{preset.title}</span>
                      <span className="mt-0.5 block text-[10.5px] leading-5 text-muted">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Field label="نام و نام خانوادگی" required error={form.errors.fullName}>
                <Input
                  value={draft.fullName}
                  onChange={(e) => update({ fullName: e.target.value })}
                  invalid={Boolean(form.errors.fullName)}
                  placeholder="نیما کاظمی"
                />
              </Field>

              <Field
                label="عنوان ادمین"
                hint="این عنوان کنار نام ادمین در فهرست نمایش داده می‌شود."
                error={form.errors.adminTitle}
              >
                <Input
                  value={draft.adminTitle}
                  onChange={(e) => update({ adminTitle: e.target.value })}
                  invalid={Boolean(form.errors.adminTitle)}
                  placeholder="ادمین کاتالوگ"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="موبایل"
                  required
                  error={form.errors.phone}
                  hint="۱۱ رقم، با ۰۹ شروع شود"
                >
                  <Input
                    value={draft.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    invalid={Boolean(form.errors.phone)}
                    inputMode="numeric"
                    maxLength={13}
                    dir="ltr"
                    className="num"
                    placeholder="09120000000"
                  />
                </Field>
                <Field label="ایمیل" error={form.errors.email}>
                  <Input
                    value={draft.email}
                    onChange={(e) => update({ email: e.target.value })}
                    invalid={Boolean(form.errors.email)}
                    dir="ltr"
                    placeholder="name@sinner.shop"
                  />
                </Field>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium">دسترسی‌ها</span>
                  <span className="num text-[11px] text-muted">
                    {toFaDigits(draft.permissions.length)} مورد انتخاب شده
                  </span>
                </div>
                {form.errors.permissions && (
                  <p role="alert" className="text-xs text-red-500">
                    {form.errors.permissions}
                  </p>
                )}

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
            </div>
          )}
        </Drawer>
      </div>
    </PermissionGate>
  )
}
