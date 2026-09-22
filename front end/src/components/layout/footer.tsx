'use client'

import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Logo } from './logo'
import { useCategories, useRepairIssues, useSiteSettings } from '@/lib/api/queries'
import type { FooterColumn, FooterLink } from '@/types/cms'
import { DEVICE_KIND_LABEL, type DeviceKind } from '@/types/repair'
import { getIcon } from '@/lib/icons'
import { toFaDigits } from '@/lib/format'

const serviceLabel = (kind: DeviceKind) => (kind === 'other' ? 'تعمیر سایر دستگاه‌ها' : `تعمیر ${DEVICE_KIND_LABEL[kind]}`)

/**
 * لینک‌های ستون‌های خودکار فوتر، از خود داده‌ی سایت:
 * - دسته‌بندی‌ها: هر دسته‌ای که کالای قابل نمایش دارد (دسته‌ی خالی لینک مرده می‌شد)
 * - خدمات: هر نوع دستگاهی که در بخش تعمیرات مشکلی برایش تعریف شده، به‌علاوه‌ی پیگیری
 * پس با ساختن، حذف یا تغییر نام دسته یا مشکل‌های تعمیر، فوتر خودش به‌روز می‌شود.
 */
export function useFooterLinks() {
  const { data: categories } = useCategories()
  const { data: issues } = useRepairIssues()

  return (column: FooterColumn): FooterLink[] => {
    if (column.source === 'categories') {
      return (categories ?? [])
        .filter((c) => c.productCount > 0)
        .map((c) => ({ id: `auto_cat_${c.slug}`, label: c.title, href: `/products?category=${c.slug}` }))
    }
    if (column.source === 'services') {
      const kinds = (Object.keys(DEVICE_KIND_LABEL) as DeviceKind[]).filter((kind) =>
        issues?.some((issue) => issue.deviceKinds.includes(kind)),
      )
      if (!issues) return []
      return [
        ...kinds.map((kind) => ({ id: `auto_srv_${kind}`, label: serviceLabel(kind), href: `/repair?device=${kind}#repair-form` })),
        { id: 'auto_srv_track', label: 'پیگیری تعمیر', href: '/repair/track' },
      ]
    }
    return column.links
  }
}

export function Footer() {
  const { data: settings } = useSiteSettings()
  const footer = settings?.footer
  const linksOf = useFooterLinks()

  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-page">
        {footer?.badges?.enabled && footer.badges.items.length > 0 && (
          <div className="grid gap-4 border-b border-border py-8 sm:grid-cols-2 lg:grid-cols-4">
            {footer.badges.items.map((badge) => {
              const Icon = getIcon(badge.icon)
              return (
                <div key={badge.id} className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-bold">{badge.title}</span>
                    <span className="block text-xs text-muted">{badge.text}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid gap-10 py-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-sm text-[13px] leading-7 text-muted">{footer?.description}</p>
            <ul className="space-y-2.5 text-[13px] text-muted">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" />
                <span className="leading-6">{settings?.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-brand-500" />
                <span className="num" dir="ltr">
                  {settings ? toFaDigits(settings.phone) : ''}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-brand-500" />
                <span dir="ltr">{settings?.email}</span>
              </li>
            </ul>
          </div>

          {footer?.columns.map((col) => {
            const links = linksOf(col)
            // ستون خودکاری که هنوز داده‌ای ندارد (یا چیزی برای نشان دادن ندارد) عنوان خالی نمی‌گذارد
            if (!links.length) return null
            return (
            <nav key={col.id}>
              <h3 className="mb-4 text-sm font-bold">{col.title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-muted transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            )
          })}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
          <p className="text-xs text-muted">
            © {toFaDigits(new Date().getFullYear())} — تمام حقوق برای {settings?.siteName ?? 'سینر'} محفوظ است.
          </p>
          <div className="flex items-center gap-2">
            {settings?.socials.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
