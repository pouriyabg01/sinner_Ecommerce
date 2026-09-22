'use client'

import { useState } from 'react'
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Address } from '@/types/user'
import { useDeleteAddress, useMe, useSaveAddress } from '@/lib/api/queries'
import { useSession } from '@/store/session'
import { AddressFormDrawer } from '@/components/profile/address-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadError } from '@/components/ui/load-error'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { formatPhone, toFaDigits } from '@/lib/format'

export default function AddressesPage() {
  const userId = useSession((s) => s.userId)
  const { data: user, isLoading, isError, refetch } = useMe(userId)
  const save = useSaveAddress()
  const remove = useDeleteAddress()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  // هر بار باز شدن فرم، از نو ساخته می‌شود تا ورودی‌های دفعه‌ی قبل نمانند
  const [formKey, setFormKey] = useState(0)

  const openForm = (address: Address | null) => {
    setEditing(address)
    setFormKey((k) => k + 1)
    setOpen(true)
  }

  if (isError) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <LoadError as="h1" onRetry={() => refetch()} />
      </div>
    )
  }

  if (isLoading || !user) return <Skeleton className="h-64 rounded-card" />

  const makeDefault = (address: Address) =>
    save.mutate(
      { id: address.id, body: { isDefault: true } },
      {
        onSuccess: () => toast.success(`«${address.title}» آدرس پیش‌فرض شد`),
        onError: (error) => toast.error(error.message),
      },
    )

  const deleteAddress = (address: Address) => {
    if (!window.confirm(`آدرس «${address.title}» حذف شود؟`)) return
    remove.mutate(address.id, {
      onSuccess: () => toast.success('آدرس حذف شد'),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">آدرس‌های من</h1>
        <Button size="sm" variant="soft" onClick={() => openForm(null)}>
          <Plus className="size-4" />
          آدرس جدید
        </Button>
      </div>

      {!user.addresses.length ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={MapPin}
            title="آدرسی ثبت نشده"
            description="برای تسریع در ثبت سفارش، آدرس خود را ذخیره کنید."
            action={
              <Button variant="soft" onClick={() => openForm(null)}>
                <Plus className="size-4" />
                افزودن اولین آدرس
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {user.addresses.map((address) => (
            <article key={address.id} className="flex flex-col rounded-card border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="size-4 text-brand-500" />
                <span className="text-[13px] font-bold">{address.title}</span>
                {address.isDefault && (
                  <Badge tone="brand">
                    <Star className="size-3" />
                    پیش‌فرض
                  </Badge>
                )}
              </div>
              <p className="text-[12.5px] leading-7 text-muted">
                {address.province}، {address.city}، {address.line}
              </p>
              <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-[11.5px] text-muted">
                <div className="flex gap-2">
                  <dt>گیرنده:</dt>
                  <dd>{address.receiver}</dd>
                </div>
                <div className="flex gap-2">
                  <dt>تلفن:</dt>
                  <dd className="num" dir="ltr">
                    {formatPhone(address.phone)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt>کد پستی:</dt>
                  <dd className="num">{toFaDigits(address.postalCode)}</dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap gap-1.5 border-t border-border pt-3">
                {!address.isDefault && (
                  <Button variant="ghost" size="sm" disabled={save.isPending} onClick={() => makeDefault(address)}>
                    <Star className="size-4" />
                    پیش‌فرض کن
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => openForm(address)}>
                  <Pencil className="size-4" />
                  ویرایش
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted hover:text-red-500"
                  disabled={remove.isPending}
                  onClick={() => deleteAddress(address)}
                >
                  <Trash2 className="size-4" />
                  حذف
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AddressFormDrawer
        key={formKey}
        open={open}
        onClose={() => setOpen(false)}
        address={editing}
        fallback={{ receiver: user.fullName, phone: user.phone }}
        isFirst={user.addresses.length === 0}
      />
    </div>
  )
}
