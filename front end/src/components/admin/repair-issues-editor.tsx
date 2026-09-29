'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import type { CommonIssue, DeviceKind } from '@/types/repair'
import { DEVICE_KIND_LABEL } from '@/types/repair'
import {
  useAdminRepairIssues,
  useCreateRepairIssue,
  useDeleteRepairIssue,
  useUpdateRepairIssue,
} from '@/lib/api/queries'
import { AdminCard, Table } from '@/components/admin/data-table'
import { IconPicker } from '@/components/admin/editor-bits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, PriceInput, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { confirmDelete } from '@/components/ui/confirm'
import { useForm } from '@/lib/use-form'
import { amountSchema, optionalText, requiredText } from '@/lib/validation'
import { getIcon } from '@/lib/icons'
import { formatPrice, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

const DEVICE_KINDS = Object.keys(DEVICE_KIND_LABEL) as DeviceKind[]

const issueSchema = z
  .object({
    title: requiredText('عنوان مشکل', 3),
    hint: optionalText(160, 'توضیح کوتاه'),
    icon: z.string(),
    deviceKinds: z.array(z.string()).min(1, { message: 'حداقل یک نوع دستگاه انتخاب کنید' }),
    // هر سه دلخواه‌اند؛ خالی که بمانند، در سایت اصلاً نمایش داده نمی‌شوند
    estimatedMin: amountSchema({ label: 'حداقل هزینه', min: 0, required: false }),
    estimatedMax: amountSchema({ label: 'حداکثر هزینه', min: 0, required: false }),
    estimatedDays: amountSchema({ label: 'زمان تقریبی', min: 1, max: 60, required: false }),
  })
  .refine((v) => v.estimatedMax === null || v.estimatedMin === null || v.estimatedMax >= v.estimatedMin, {
    message: 'حداکثر هزینه نباید کمتر از حداقل باشد',
    path: ['estimatedMax'],
  })

interface Draft {
  title: string
  hint: string
  icon: string
  deviceKinds: DeviceKind[]
  estimatedMin: string
  estimatedMax: string
  estimatedDays: string
}

const EMPTY: Draft = {
  title: '',
  hint: '',
  icon: 'wrench',
  deviceKinds: ['mobile'],
  estimatedMin: '',
  estimatedMax: '',
  estimatedDays: '',
}

const toDraft = (issue: CommonIssue): Draft => ({
  title: issue.title,
  hint: issue.hint,
  icon: issue.icon,
  deviceKinds: [...issue.deviceKinds],
  // صفر در پایگاه داده یعنی «تعیین نشده»، پس کادر خالی باز می‌شود نه با ۰
  estimatedMin: issue.estimatedMin ? String(issue.estimatedMin) : '',
  estimatedMax: issue.estimatedMax ? String(issue.estimatedMax) : '',
  estimatedDays: issue.estimatedDays ? String(issue.estimatedDays) : '',
})

/**
 * مشکلات رایجی که در فرم ثبت تعمیر به کاربر نشان داده می‌شود.
 * هر مشکل به یک یا چند نوع دستگاه وصل است و فرم سایت فقط مشکلات
 * همان دستگاهِ انتخاب‌شده را می‌آورد؛ پس تغییر اینجا مستقیم روی /repair اثر دارد.
 */
export function RepairIssuesEditor() {
  const { data, isLoading } = useAdminRepairIssues()
  const createIssue = useCreateRepairIssue()
  const updateIssue = useUpdateRepairIssue()
  const deleteIssue = useDeleteRepairIssue()

  // undefined = کشو بسته، null = ساخت جدید
  const [editing, setEditing] = useState<CommonIssue | null | undefined>(undefined)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [kindFilter, setKindFilter] = useState<DeviceKind | 'all'>('all')
  const form = useForm(issueSchema)

  useEffect(() => {
    if (editing === undefined) return
    form.reset()
    setDraft(editing ? toDraft(editing) : EMPTY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    form.revalidate(next)
  }

  const toggleKind = (kind: DeviceKind) =>
    update({
      deviceKinds: draft.deviceKinds.includes(kind)
        ? draft.deviceKinds.filter((k) => k !== kind)
        : [...draft.deviceKinds, kind],
    })

  const items = (data ?? []).filter((i) => kindFilter === 'all' || i.deviceKinds.includes(kindFilter))

  const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : 'عملیات ناموفق بود')

  const submit = () => {
    const clean = form.validate(draft)
    if (!clean) return toast.error('چند فیلد ایراد دارد — پیام‌های قرمز را بررسی کنید')

    const body = {
      title: clean.title,
      hint: clean.hint,
      icon: clean.icon,
      deviceKinds: clean.deviceKinds as DeviceKind[],
      estimatedMin: clean.estimatedMin ?? 0,
      estimatedMax: clean.estimatedMax ?? 0,
      estimatedDays: clean.estimatedDays ?? 0,
    }

    const done = (message: string) => () => {
      toast.success(message)
      setEditing(undefined)
    }

    if (editing) {
      updateIssue.mutate({ id: editing.id, body }, { onSuccess: done('مشکل به‌روزرسانی شد'), onError: fail })
    } else {
      createIssue.mutate(body, { onSuccess: done('مشکل جدید اضافه شد'), onError: fail })
    }
  }

  return (
    <>
      <AdminCard
        title="مشکلات رایج فرم تعمیر"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as DeviceKind | 'all')}
              aria-label="فیلتر بر اساس نوع دستگاه"
              className="h-9 cursor-pointer appearance-none rounded-xl border border-border bg-surface px-3 text-[12.5px] outline-none transition-[border-color,box-shadow] focus:border-brand-400"
            >
              <option value="all">همه‌ی دستگاه‌ها</option>
              {DEVICE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {DEVICE_KIND_LABEL[kind]}
                </option>
              ))}
            </select>
            <Button size="sm" variant="soft" onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              مشکل جدید
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={Wrench}
            title="مشکلی برای این دستگاه ثبت نشده"
            description="با دکمه‌ی «مشکل جدید» گزینه‌ای اضافه کنید تا در فرم ثبت تعمیر نمایش داده شود."
          />
        ) : (
          <Table head={['مشکل', 'دستگاه‌ها', 'بازه هزینه', 'زمان', '']}>
            {items.map((issue) => {
              const Icon = getIcon(issue.icon)
              return (
                <tr key={issue.id} className="transition-colors hover:bg-surface-2/40">
                  <td className="p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{issue.title}</span>
                        <span className="mt-0.5 block text-[10.5px] leading-5 text-muted">{issue.hint}</span>
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="flex flex-wrap gap-1">
                      {issue.deviceKinds.map((kind) => (
                        <Badge key={kind} tone="neutral">
                          {DEVICE_KIND_LABEL[kind]}
                        </Badge>
                      ))}
                    </span>
                  </td>
                  <td className="num whitespace-nowrap p-3.5">
                    {issue.estimatedMax ? (
                      `${formatPrice(issue.estimatedMin, false)} تا ${formatPrice(issue.estimatedMax, false)}`
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="num whitespace-nowrap p-3.5 text-muted">
                    {issue.estimatedDays ? `${toFaDigits(issue.estimatedDays)} روز` : '—'}
                  </td>
                  <td className="p-3.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="ویرایش" onClick={() => setEditing(issue)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف"
                        className="text-muted hover:text-red-500"
                        onClick={async () => {
                          const how = await confirmDelete({ what: issue.title, kind: 'مشکل تعمیر' })
                          if (!how) return
                          deleteIssue.mutate(
                            { id: issue.id, permanent: how === 'permanent' },
                            {
                              onSuccess: () =>
                                toast.success(how === 'permanent' ? 'مشکل برای همیشه حذف شد' : 'مشکل به سطل زباله رفت'),
                              onError: fail,
                            },
                          )
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
        )}
      </AdminCard>

      <Drawer
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'ویرایش مشکل' : 'مشکل جدید'}
        widthClass="w-full max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button block loading={createIssue.isPending || updateIssue.isPending} onClick={submit}>
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setEditing(undefined)}>
              انصراف
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="عنوان مشکل" required error={form.errors.title}>
            <Input
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              invalid={Boolean(form.errors.title)}
              placeholder="مثلاً: شکستگی صفحه"
            />
          </Field>

          <Field label="توضیح کوتاه" hint="زیر عنوان، در کارت انتخاب مشکل دیده می‌شود." error={form.errors.hint}>
            <Textarea
              value={draft.hint}
              onChange={(e) => update({ hint: e.target.value })}
              invalid={Boolean(form.errors.hint)}
              className="min-h-20"
            />
          </Field>

          <IconPicker value={draft.icon} onChange={(icon) => update({ icon })} />

          <div className="space-y-2">
            <span className="flex items-center gap-1 text-[13px] font-medium">
              دستگاه‌های مرتبط
              <span className="text-ember-500">*</span>
            </span>
            <p className="text-xs text-muted">
              این مشکل فقط در فرم همین دستگاه‌ها نشان داده می‌شود.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {DEVICE_KINDS.map((kind) => {
                const active = draft.deviceKinds.includes(kind)
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggleKind(kind)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-[12.5px] transition-all',
                      active
                        ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                        : 'border-border text-muted hover:border-brand-400',
                    )}
                  >
                    {DEVICE_KIND_LABEL[kind]}
                  </button>
                )
              })}
            </div>
            {form.errors.deviceKinds && (
              <p role="alert" className="text-xs text-red-500">
                {form.errors.deviceKinds}
              </p>
            )}
          </div>

          {/*
            هزینه و زمان دلخواه‌اند. خالی که بمانند، در سایت نه بازه‌ی قیمت این
            مشکل دیده می‌شود و نه در برآورد اولیه حساب می‌شود — همان حالتی که
            هزینه‌اش پیش از دیدن دستگاه معلوم نیست.
          */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="حداقل هزینه (تومان)"
              hint="دلخواه — خالی بگذارید تا قیمتی نمایش داده نشود"
              error={form.errors.estimatedMin}
            >
              <PriceInput
                value={draft.estimatedMin}
                onChange={(estimatedMin) => update({ estimatedMin })}
                invalid={Boolean(form.errors.estimatedMin)}
              />
            </Field>
            <Field label="حداکثر هزینه (تومان)" hint="دلخواه" error={form.errors.estimatedMax}>
              <PriceInput
                value={draft.estimatedMax}
                onChange={(estimatedMax) => update({ estimatedMax })}
                invalid={Boolean(form.errors.estimatedMax)}
              />
            </Field>
          </div>

          <Field
            label="زمان تقریبی (روز)"
            hint="دلخواه — خالی بگذارید تا زمانی اعلام نشود"
            error={form.errors.estimatedDays}
          >
            <Input
              value={draft.estimatedDays}
              onChange={(e) => update({ estimatedDays: e.target.value })}
              invalid={Boolean(form.errors.estimatedDays)}
              inputMode="numeric"
              className="num"
            />
          </Field>
        </div>
      </Drawer>
    </>
  )
}
