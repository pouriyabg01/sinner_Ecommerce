'use client'

import { useState } from 'react'
import type { MediaItem } from '@/types/media'
import { MediaBrowser, MediaDetails } from '@/components/admin/media-library'
import { AdminCard } from '@/components/admin/data-table'

/**
 * کتابخانه‌ی تصویرهای سایت — هر چیزی که تا امروز آپلود شده، یکجا.
 *
 * همین اجزا داخل پنجره‌ی «انتخاب تصویر» هم استفاده می‌شوند، پس هر تصویری که
 * اینجا حذف یا نام‌گذاری شود، همان‌جا هم دیده می‌شود.
 */
export default function AdminMediaPage() {
  const [selected, setSelected] = useState<MediaItem | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">کتابخانه‌ی تصویر</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          همه‌ی تصویرهای سایت — لوگو، کالاها، بنرها. هر جای پنل که تصویر بخواهید از همین‌جا انتخاب می‌شود.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <AdminCard>
          <div className="p-5">
            <MediaBrowser
              selected={selected ? [selected.url] : []}
              onToggle={(item) => setSelected((prev) => (prev?.id === item.id ? null : item))}
              onFirstLoad={(item) => setSelected(item)}
            />
          </div>
        </AdminCard>

        <AdminCard title="جزئیات تصویر" className="lg:sticky lg:top-5">
          <div className="p-5">
            {selected ? (
              <MediaDetails
                // با عوض شدن تصویر، فرم از نو با مقدارهای همان تصویر ساخته شود
                key={selected.id}
                item={selected}
                onDeleted={() => setSelected(null)}
              />
            ) : (
              <p className="rounded-xl bg-surface-2 p-4 text-[12.5px] leading-7 text-muted">
                روی یک تصویر بزنید تا ابعاد، حجم و متن جایگزینش اینجا بیاید.
              </p>
            )}
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
