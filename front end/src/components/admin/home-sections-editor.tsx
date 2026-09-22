'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, ExternalLink, GripVertical, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import type { HomePageConfig, Section, SectionType } from '@/types/cms'
import { useHomeConfig, useSaveHomeConfig } from '@/lib/api/queries'
import { SECTION_LABELS } from '@/components/home/section-renderer'
import { SectionEditor } from '@/components/admin/section-editor'
import { AdminCard } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Drawer } from '@/components/ui/drawer'
import { Field, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/components/ui/load-error'
import { toast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { cn } from '@/lib/utils'

/** الگوی پیش‌فرض برای هر نوع سکشن که ادمین اضافه می‌کند */
const templates: Record<SectionType, () => Section> = {
  hero_slider: () => ({
    id: uid('sec'),
    type: 'hero_slider',
    enabled: true,
    spacing: 'sm',
    background: 'default',
    props: {
      autoplayMs: 6000,
      showThumbnails: true,
      slides: [
        {
          id: uid('sl'),
          title: 'عنوان اسلاید',
          subtitle: 'توضیح کوتاه اسلاید',
          image: '/img/banners/hero-1.svg',
          ctaLabel: 'مشاهده',
          ctaHref: '/products',
          accent: '#00b392',
        },
      ],
    },
  }),
  features_bar: () => ({
    id: uid('sec'),
    type: 'features_bar',
    enabled: true,
    spacing: 'sm',
    background: 'default',
    props: {
      items: [
        { id: uid('f'), icon: 'shield-check', title: 'مزیت اول', subtitle: 'توضیح' },
        { id: uid('f'), icon: 'truck', title: 'مزیت دوم', subtitle: 'توضیح' },
      ],
    },
  }),
  category_grid: () => ({
    id: uid('sec'),
    type: 'category_grid',
    enabled: true,
    spacing: 'lg',
    background: 'default',
    props: { title: 'دسته‌بندی‌ها', categorySlugs: ['mobile', 'laptop', 'console'] },
  }),
  product_carousel: () => ({
    id: uid('sec'),
    type: 'product_carousel',
    enabled: true,
    spacing: 'lg',
    background: 'default',
    props: { title: 'محصولات', source: 'newest', limit: 8, href: '/products' },
  }),
  banner_duo: () => ({
    id: uid('sec'),
    type: 'banner_duo',
    enabled: true,
    spacing: 'md',
    background: 'default',
    props: {
      banners: [
        // بنر تازه با رنگ و الگو شروع می‌شود، نه با تصویر جانگهدار
        { id: uid('bn'), title: 'بنر اول', subtitle: '', image: '/img/banners/banner-1.svg', href: '/products', accent: '#c85cff', ctaLabel: 'مشاهده', backgroundType: 'pattern', pattern: 'rings' },
        { id: uid('bn'), title: 'بنر دوم', subtitle: '', image: '/img/banners/banner-2.svg', href: '/products', accent: '#26c6da', ctaLabel: 'مشاهده', backgroundType: 'pattern', pattern: 'dots' },
      ],
    },
  }),
  countdown_deal: () => ({
    id: uid('sec'),
    type: 'countdown_deal',
    enabled: true,
    spacing: 'md',
    background: 'ink',
    props: {
      title: 'پیشنهاد شگفت‌انگیز',
      productId: 'prd_008',
      endsAt: new Date(Date.now() + 12 * 3600_000).toISOString(),
      note: 'تعداد محدود',
    },
  }),
  repair_cta: () => ({
    id: uid('sec'),
    type: 'repair_cta',
    enabled: true,
    spacing: 'lg',
    background: 'brand',
    props: {
      title: 'تعمیر بدون دردسر',
      subtitle: 'توضیح خدمات تعمیر',
      bullets: ['عیب‌یابی رایگان', 'قطعه اورجینال'],
      ctaLabel: 'ثبت درخواست',
      ctaHref: '/repair',
      image: '/img/banners/repair.svg',
    },
  }),
  brand_strip: () => ({
    id: uid('sec'),
    type: 'brand_strip',
    enabled: true,
    spacing: 'md',
    background: 'default',
    props: { title: 'برندها', brandSlugs: ['apple', 'samsung', 'sony', 'asus'] },
  }),
  testimonials: () => ({
    id: uid('sec'),
    type: 'testimonials',
    enabled: true,
    spacing: 'lg',
    background: 'default',
    props: {
      title: 'نظرات مشتریان',
      items: [{ id: uid('t'), name: 'نام مشتری', role: 'شغل', avatar: null, body: 'متن نظر', rating: 5 }],
    },
  }),
  rich_text: () => ({
    id: uid('sec'),
    type: 'rich_text',
    enabled: true,
    spacing: 'md',
    background: 'default',
    props: { title: 'عنوان', html: '<p>متن دلخواه</p>' },
  }),
  newsletter: () => ({
    id: uid('sec'),
    type: 'newsletter',
    enabled: true,
    spacing: 'md',
    background: 'surface',
    props: { title: 'خبرنامه', subtitle: '', placeholder: 'ایمیل', ctaLabel: 'عضویت' },
  }),
}

function SortableRow({
  section,
  onToggle,
  onEdit,
  onDelete,
}: {
  section: Section
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-shadow',
        isDragging && 'z-10 shadow-lift',
        !section.enabled && 'opacity-55',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="جابه‌جایی"
        className="cursor-grab touch-none text-muted transition-colors hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4.5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold">{SECTION_LABELS[section.type]}</p>
        <p className="num truncate text-[10.5px] text-muted" dir="ltr">
          {section.id}
        </p>
      </div>

      <Badge tone={section.enabled ? 'success' : 'neutral'}>{section.enabled ? 'فعال' : 'غیرفعال'}</Badge>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="نمایش/مخفی" onClick={onToggle}>
          {section.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="ویرایش" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="حذف"
          className="text-muted hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  )
}

/** چیدمان و محتوای سکشن‌های صفحه‌ی اصلی — داخل تب طراحی سایت رندر می‌شود */
export function HomeSectionsEditor() {
  const { data, isLoading, isError, refetch } = useHomeConfig()
  const saveHome = useSaveHomeConfig()
  const [draft, setDraft] = useState<HomePageConfig | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addType, setAddType] = useState<SectionType>('product_carousel')

  useEffect(() => {
    if (data && !draft) setDraft(structuredClone(data))
  }, [data, draft])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (isError) return <LoadError onRetry={() => refetch()} />

  if (isLoading || !draft) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    )
  }

  const editing = draft.sections.find((s) => s.id === editingId) ?? null
  const dirty = JSON.stringify(draft.sections) !== JSON.stringify(data?.sections)

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = draft.sections.findIndex((s) => s.id === active.id)
    const newIndex = draft.sections.findIndex((s) => s.id === over.id)
    setDraft({ ...draft, sections: arrayMove(draft.sections, oldIndex, newIndex) })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/" target="_blank" className="contents">
          <Button variant="outline">
            <ExternalLink className="size-4" />
            پیش‌نمایش
          </Button>
        </Link>
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(structuredClone(data!))}>
          <RotateCcw className="size-4" />
          بازگردانی
        </Button>
        <Button
          loading={saveHome.isPending}
          disabled={!dirty}
          onClick={() => saveHome.mutate(draft, { onSuccess: () => toast.success('چیدمان صفحه اصلی ذخیره شد') })}
        >
          <Save className="size-4" />
          ذخیره
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={draft.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2.5">
            {draft.sections.map((section) => (
              <SortableRow
                key={section.id}
                section={section}
                onToggle={() =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.map((s) =>
                      s.id === section.id ? { ...s, enabled: !s.enabled } : s,
                    ),
                  })
                }
                onEdit={() => setEditingId(section.id)}
                onDelete={() =>
                  setDraft({ ...draft, sections: draft.sections.filter((s) => s.id !== section.id) })
                }
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <AdminCard title="افزودن سکشن جدید">
        <div className="flex flex-wrap items-end gap-3 p-5">
          <Field label="نوع سکشن" className="min-w-56 flex-1">
            <Select value={addType} onChange={(e) => setAddType(e.target.value as SectionType)}>
              {(Object.keys(SECTION_LABELS) as SectionType[]).map((type) => (
                <option key={type} value={type}>
                  {SECTION_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            onClick={() => {
              const section = templates[addType]()
              setDraft({ ...draft, sections: [...draft.sections, section] })
              setEditingId(section.id)
            }}
          >
            <Plus className="size-4" />
            افزودن
          </Button>
        </div>
      </AdminCard>

      <Drawer
        open={editing !== null}
        onClose={() => setEditingId(null)}
        title={editing ? `ویرایش: ${SECTION_LABELS[editing.type]}` : ''}
        widthClass="w-full max-w-xl"
        footer={
          <Button block onClick={() => setEditingId(null)}>
            تمام
          </Button>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="فاصله عمودی">
                <Select
                  value={editing.spacing}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((s) =>
                        s.id === editing.id ? { ...s, spacing: e.target.value as Section['spacing'] } : s,
                      ),
                    })
                  }
                >
                  <option value="none">بدون فاصله</option>
                  <option value="sm">کم</option>
                  <option value="md">متوسط</option>
                  <option value="lg">زیاد</option>
                </Select>
              </Field>
              <Field label="پس‌زمینه">
                <Select
                  value={editing.background}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((s) =>
                        s.id === editing.id ? { ...s, background: e.target.value as Section['background'] } : s,
                      ),
                    })
                  }
                >
                  <option value="default">پیش‌فرض</option>
                  <option value="surface">کارتی</option>
                </Select>
              </Field>
            </div>

            <div className="border-t border-border pt-5">
              <SectionEditor
                section={editing}
                onChange={(props) =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.map((s) =>
                      s.id === editing.id ? ({ ...s, props } as Section) : s,
                    ),
                  })
                }
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
