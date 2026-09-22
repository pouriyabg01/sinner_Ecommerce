'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import type { Tag } from '@/types/catalog'
import { useAdminTags, useCreateTag, useDeleteTag, useUpdateTag } from '@/lib/api/queries'
import { PermissionGate } from '@/components/admin/admin-shell'
import { AdminCard, Table } from '@/components/admin/data-table'
import { BulkBar, SelectCell, runBulk, useSelection } from '@/components/admin/selection'
import { EmptyRows, FilterBar, TableTitle, matches, useTableFilters } from '@/components/admin/filters'
import { TagDrawer } from '@/components/admin/taxonomy-forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { toFaDigits } from '@/lib/format'

export default function AdminTagsPage() {
  const tags = useAdminTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  // null یعنی «برچسب جدید»؛ undefined یعنی کشو بسته است
  const [editing, setEditing] = useState<Tag | null | undefined>(undefined)
  const filters = useTableFilters(['usage'])

  const all = useMemo(() => tags.data ?? [], [tags.data])
  const items = useMemo(
    () =>
      all.filter((tag) => {
        const usage = filters.pick('usage')
        return (
          matches(filters.term, tag.title) &&
          (usage === undefined || (usage === 'used' ? tag.productCount > 0 : tag.productCount === 0))
        )
      }),
    [all, filters],
  )

  // جدول برچسب‌ها صفحه‌بندی ندارد، پس «این صفحه» یعنی همه‌ی ردیف‌های فیلترشده
  const ids = items.map((tag) => tag.id)
  const selection = useSelection(ids, ids)
  const [bulkBusy, setBulkBusy] = useState(false)

  const removeSelected = async () => {
    const removable = selection.selected.filter((id) => !all.find((t) => t.id === id)?.productCount)
    if (!removable.length) return
    if (!confirm(`آیا ${toFaDigits(removable.length)} برچسب حذف شوند؟`)) return

    setBulkBusy(true)
    const { done, failed, firstError } = await runBulk(removable, (id) => deleteTag.mutateAsync(id))
    setBulkBusy(false)
    selection.clear()
    if (done) toast.success(`${toFaDigits(done)} برچسب حذف شد`)
    if (failed) toast.error(firstError ?? `${toFaDigits(failed)} برچسب حذف نشد`)
  }

  const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : 'عملیات ناموفق بود')

  return (
    <PermissionGate permission="tag.manage">
      <div className="space-y-5">
        <TableTitle
          title="برچسب‌ها"
          unit="برچسب"
          total={all.length}
          shown={items.length}
          filters={filters}
          description="برچسب‌ها در فیلتر فروشگاه و روی کارت کالا دیده می‌شوند. تغییر نام روی همه‌ی کالاها اعمال می‌شود."
        />

        <FilterBar
          filters={filters}
          placeholder="جست‌وجوی برچسب…"
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              برچسب جدید
            </Button>
          }
          selects={[
            {
              id: 'usage',
              label: 'استفاده',
              options: [
                { value: 'used', label: 'روی کالا هست' },
                { value: 'unused', label: 'بدون کالا' },
              ],
            },
          ]}
        />

        <AdminCard>
          {tags.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : !items.length ? (
            <EmptyRows
              filters={filters}
              icon={Tags}
              title="برچسبی ثبت نشده"
              description="برچسب‌ها کالاها را دسته‌بندی نرم می‌کنند — مثل «پرفروش» یا «گیمینگ»."
            />
          ) : (
            <>
            <BulkBar selection={selection} unit="برچسب">
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
            <Table selection={selection} head={['برچسب', 'تعداد کالا', '']}>
              {items.map((tag) => (
                <tr key={tag.id} className="transition-colors hover:bg-surface-2/40">
                  <SelectCell
                    selection={selection}
                    id={tag.id}
                    label={tag.title}
                    disabled={tag.productCount > 0}
                    reason="برچسب نشسته روی کالا حذف نمی‌شود"
                  />
                  <td className="p-3.5">
                    <Badge tone={tag.productCount ? 'brand' : 'neutral'}>{tag.title}</Badge>
                  </td>
                  <td className="num p-3.5 font-medium">{toFaDigits(tag.productCount)}</td>
                  <td className="p-3.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="ویرایش" onClick={() => setEditing(tag)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف"
                        className="text-muted hover:text-red-500"
                        // برچسبی که روی کالا نشسته حذف نمی‌شود؛ دکمه هم نباید امیدوارکننده باشد
                        disabled={tag.productCount > 0}
                        title={tag.productCount > 0 ? 'ابتدا این برچسب را از کالاها بردارید' : undefined}
                        onClick={() =>
                          deleteTag.mutate(tag.id, {
                            onSuccess: () => toast.success('برچسب حذف شد'),
                            onError: fail,
                          })
                        }
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
        </AdminCard>

        <TagDrawer
          open={editing !== undefined}
          editing={editing ?? null}
          saving={createTag.isPending || updateTag.isPending}
          onClose={() => setEditing(undefined)}
          onSubmit={(body, onFieldError) => {
            const done = {
              onSuccess: () => {
                toast.success(editing ? 'برچسب به‌روز شد' : 'برچسب افزوده شد')
                setEditing(undefined)
              },
              onError: (error: unknown) => {
                onFieldError(error)
                fail(error)
              },
            }
            if (editing) updateTag.mutate({ id: editing.id, body }, done)
            else createTag.mutate(body, done)
          }}
        />
      </div>
    </PermissionGate>
  )
}
