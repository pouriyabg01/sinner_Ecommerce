'use client'

import { useState } from 'react'
import { Info, LayoutTemplate, Megaphone, PanelBottom, Sparkles } from 'lucide-react'
import { PermissionGate } from '@/components/admin/admin-shell'
import { BrandEditor } from '@/components/admin/brand-editor'
import { HomeSectionsEditor } from '@/components/admin/home-sections-editor'
import { AboutEditor } from '@/components/admin/about-editor'
import { FooterEditor } from '@/components/admin/footer-editor'
import { AnnouncementEditor } from '@/components/admin/announcement-editor'
import { cn } from '@/lib/utils'

/**
 * تنها جایی که محتوای بخش‌های سایت ویرایش می‌شود. هر بخشِ قابل‌ویرایشِ جدید
 * یک تب اینجا می‌گیرد، نه یک صفحه‌ی جدا در منوی پنل.
 */
const tabs = [
  {
    id: 'brand',
    label: 'نشان و نام',
    icon: Sparkles,
    description:
      'نشان سایت، متن کنارش و آیکونی که در تب مرورگر دیده می‌شود. تا وقتی تصویری آپلود نکرده‌اید، نشان پیش‌فرض سایت استفاده می‌شود.',
    render: () => <BrandEditor />,
  },
  {
    id: 'home',
    label: 'صفحه اصلی',
    icon: LayoutTemplate,
    description:
      'سکشن‌ها را بکش و جابه‌جا کن، خاموش/روشن کن یا محتوایشان را ویرایش کن. صفحه‌ی اصلی دقیقاً از روی همین چیدمان ساخته می‌شود.',
    render: () => <HomeSectionsEditor />,
  },
  {
    id: 'about',
    label: 'درباره ما',
    icon: Info,
    description:
      'سربرگ، آمارها، ارزش‌ها، بلوک تماس و قوانین صفحه‌ی «درباره ما». هر بلوک را می‌توانی بدون حذف محتوا خاموش کنی.',
    render: () => <AboutEditor />,
  },
  {
    id: 'footer',
    label: 'فوتر',
    icon: PanelBottom,
    description:
      'نشان‌های اعتماد، متن معرفی و ستون‌های لینکِ پایین همه‌ی صفحه‌ها. آدرس و شبکه‌های اجتماعی از تنظیمات سایت می‌آید.',
    render: () => <FooterEditor />,
  },
  {
    id: 'announcement',
    label: 'نوار اعلان',
    icon: Megaphone,
    description: 'متن و لینک نوار بالای سایت.',
    render: () => <AnnouncementEditor />,
  },
] as const

export default function AppearancePage() {
  // پیش‌فرض همان ویرایشگر صفحه‌ی اصلی می‌ماند؛ پرکاربردترین تب است
  const [active, setActive] = useState<(typeof tabs)[number]['id']>('home')
  const tab = tabs.find((t) => t.id === active)!

  return (
    <PermissionGate permission="appearance.manage">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">طراحی سایت</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-7 text-muted">{tab.description}</p>
        </div>

        <div
          role="tablist"
          aria-label="بخش‌های قابل ویرایش سایت"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5 no-scrollbar"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={item.id === active}
              onClick={() => setActive(item.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium transition-colors',
                item.id === active
                  ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                  : 'text-muted hover:bg-surface-2 hover:text-foreground',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* هر تب پیش‌نویس و دکمه‌ی ذخیره‌ی خودش را دارد؛ با سوییچ‌کردن تب، ویرایش‌نشده‌ها از بین می‌روند */}
        {tab.render()}
      </div>
    </PermissionGate>
  )
}
