'use client'

import type { BannerItem, Section, SectionProps } from '@/types/cms'
import { categories } from '@/mocks/data/taxonomy'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker'
import { toLocalDateTime } from '@/lib/format'
import { amountSchema, checkField, imageSourceSchema, linkSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { SingleImageField } from '@/components/admin/image-field'
import { LinkField, LINK_HINT } from '@/components/admin/link-field'
import { ProductPicker } from '@/components/admin/product-picker'
import { BannerPatternPicker, ColorInput } from '@/components/admin/banner-pattern-picker'
import { defaultBannerColor } from '@/components/home/banner-background'
import { ChipPicker } from '@/components/ui/chip-picker'
import { Plus, Trash2 } from 'lucide-react'
import { uid } from '@/lib/utils'

/** ویرایشگر ظاهر بلافاصله در پیش‌نویس می‌نویسد، پس هر فیلد لحظه‌ای سنجیده می‌شود */
const autoplaySchema = amountSchema({ label: 'فاصله بین اسلایدها', min: 1_000, max: 60_000 })
const limitSchema = amountSchema({ label: 'تعداد نمایش', min: 1, max: 24 })


type Patch = (props: Section['props']) => void

/** ویرایشگر مخصوص هر نوع سکشن — همان جایی که ادمین محتوای لندینگ را عوض می‌کند */
export function SectionEditor({ section, onChange }: { section: Section; onChange: Patch }) {
  switch (section.type) {
    case 'hero_slider': {
      const props = section.props
      const patchSlide = (id: string, patch: Partial<(typeof props.slides)[number]>) =>
        onChange({ ...props, slides: props.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="فاصله بین اسلایدها (میلی‌ثانیه)"
              hint="بین ۱۰۰۰ تا ۶۰۰۰۰"
              error={checkField(autoplaySchema, String(props.autoplayMs))}
            >
              <Input
                value={String(props.autoplayMs)}
                onChange={(e) => onChange({ ...props, autoplayMs: Number(e.target.value) || 0 })}
                invalid={Boolean(checkField(autoplaySchema, String(props.autoplayMs)))}
                inputMode="numeric"
                className="num"
              />
            </Field>
            <Field label="نمایش نقطه‌های پایین">
              <Select
                value={props.showThumbnails ? 'yes' : 'no'}
                onChange={(e) => onChange({ ...props, showThumbnails: e.target.value === 'yes' })}
              >
                <option value="yes">بله</option>
                <option value="no">خیر</option>
              </Select>
            </Field>
          </div>

          <div className="space-y-3">
            {props.slides.map((slide, i) => (
              <div key={slide.id} className="space-y-3 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold">اسلاید {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="حذف اسلاید"
                    className="text-muted hover:text-red-500"
                    onClick={() => onChange({ ...props, slides: props.slides.filter((s) => s.id !== slide.id) })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <Field label="عنوان">
                  <Input value={slide.title} onChange={(e) => patchSlide(slide.id, { title: e.target.value })} />
                </Field>
                <Field label="زیرعنوان">
                  <Textarea
                    value={slide.subtitle}
                    onChange={(e) => patchSlide(slide.id, { subtitle: e.target.value })}
                    className="min-h-16"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="متن دکمه">
                    <Input value={slide.ctaLabel} onChange={(e) => patchSlide(slide.id, { ctaLabel: e.target.value })} />
                  </Field>
                  <Field label="رنگ تأکیدی">
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={slide.accent}
                        onChange={(e) => patchSlide(slide.id, { accent: e.target.value })}
                        className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-surface p-1"
                      />
                      <Input
                        value={slide.accent}
                        onChange={(e) => patchSlide(slide.id, { accent: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                  </Field>
                </div>
                {/* لینک تمام‌عرض است چون با پیشوند ریشه‌ی سایت، در نصفِ عرض بریده می‌شد */}
                <Field label="لینک دکمه" hint={LINK_HINT} error={checkField(linkSchema, slide.ctaHref)}>
                  <LinkField
                    value={slide.ctaHref}
                    onChange={(ctaHref) => patchSlide(slide.id, { ctaHref })}
                    invalid={Boolean(checkField(linkSchema, slide.ctaHref))}
                  />
                </Field>
                <SingleImageField
                  value={slide.image}
                  onChange={(image) => patchSlide(slide.id, { image })}
                  label="تصویر لپ‌تاپ و دسکتاپ"
                  hint="قاب عریض ۲۱ به ۹؛ مثلاً ۲۱۰۰ در ۹۰۰ پیکسل. حداکثر ۲ مگابایت."
                  error={checkField(imageSourceSchema, slide.image)}
                />
                <SingleImageField
                  value={slide.mobileImage ?? ''}
                  onChange={(mobileImage) => patchSlide(slide.id, { mobileImage })}
                  label="تصویر گوشی (اختیاری)"
                  hint="قاب تقریباً مربع؛ مثلاً ۱۰۸۰ در ۱۰۸۰ پیکسل. اگر خالی بماند، در گوشی همان تصویر لپ‌تاپ با برش دو طرف نمایش داده می‌شود."
                  error={checkField(imageSourceSchema, slide.mobileImage ?? '')}
                />
              </div>
            ))}

            <Button
              variant="outline"
              block
              onClick={() =>
                onChange({
                  ...props,
                  slides: [
                    ...props.slides,
                    {
                      id: uid('sl'),
                      title: 'عنوان اسلاید جدید',
                      subtitle: 'توضیح کوتاه',
                      image: '/img/banners/hero-1.svg',
                      ctaLabel: 'مشاهده',
                      ctaHref: '/products',
                      accent: '#00b392',
                    },
                  ],
                })
              }
            >
              <Plus className="size-4" />
              افزودن اسلاید
            </Button>
          </div>
        </div>
      )
    }

    case 'features_bar': {
      const props = section.props
      return (
        <div className="space-y-3">
          {props.items.map((item, i) => (
            <div key={item.id} className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
              <Field label={`عنوان ${i + 1}`}>
                <Input
                  value={item.title}
                  onChange={(e) =>
                    onChange({
                      ...props,
                      items: props.items.map((x) => (x.id === item.id ? { ...x, title: e.target.value } : x)),
                    })
                  }
                />
              </Field>
              <Field label="زیرعنوان">
                <Input
                  value={item.subtitle}
                  onChange={(e) =>
                    onChange({
                      ...props,
                      items: props.items.map((x) => (x.id === item.id ? { ...x, subtitle: e.target.value } : x)),
                    })
                  }
                />
              </Field>
            </div>
          ))}
        </div>
      )
    }

    case 'category_grid': {
      const props = section.props
      return (
        <div className="space-y-4">
          <Field label="عنوان">
            <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
          </Field>
          <Field label="دسته‌های نمایش‌داده‌شده">
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => {
                const active = props.categorySlugs.includes(cat.slug)
                return (
                  <button
                    key={cat.slug}
                    onClick={() =>
                      onChange({
                        ...props,
                        categorySlugs: active
                          ? props.categorySlugs.filter((s) => s !== cat.slug)
                          : [...props.categorySlugs, cat.slug],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-[11.5px] transition-all ${
                      active
                        ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                        : 'border-border text-muted hover:border-brand-400'
                    }`}
                  >
                    {cat.title}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      )
    }

    case 'product_carousel': {
      const props = section.props
      return (
        <div className="space-y-4">
          <Field label="عنوان">
            <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="منبع محصولات">
              <Select
                value={props.source}
                onChange={(e) => onChange({ ...props, source: e.target.value as SectionProps['product_carousel']['source'] })}
              >
                <option value="featured">پیشنهاد سردبیر</option>
                <option value="newest">جدیدترین‌ها</option>
                <option value="discounted">تخفیف‌دارها</option>
                <option value="category">یک دسته خاص</option>
                <option value="manual">انتخاب دستی</option>
              </Select>
            </Field>
            <Field
              label="تعداد نمایش"
              hint={props.source === 'manual' ? 'سقف نمایش از فهرست زیر' : 'بین ۱ تا ۲۴'}
              error={checkField(limitSchema, String(props.limit))}
            >
              <Input
                value={String(props.limit)}
                onChange={(e) => onChange({ ...props, limit: Number(e.target.value) || 8 })}
                invalid={Boolean(checkField(limitSchema, String(props.limit)))}
                inputMode="numeric"
                className="num"
              />
            </Field>
          </div>
          {props.source === 'manual' && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium">کالاهای این کروسل</p>
              <ProductPicker
                value={props.productIds ?? []}
                onChange={(productIds) => onChange({ ...props, productIds })}
              />
              <p className="text-xs text-muted">ترتیب انتخاب، همان ترتیب نمایش در صفحه‌ی اصلی است.</p>
            </div>
          )}

          {props.source === 'category' && (
            <Field label="دسته">
              <Select
                value={props.categorySlug ?? 'mobile'}
                onChange={(e) => onChange({ ...props, categorySlug: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="لینک «مشاهده همه»" hint={LINK_HINT} error={checkField(linkSchema, props.href ?? '')}>
            <LinkField
              value={props.href ?? ''}
              onChange={(href) => onChange({ ...props, href })}
              invalid={Boolean(checkField(linkSchema, props.href ?? ''))}
              placeholder="/products"
            />
          </Field>
        </div>
      )
    }

    case 'banner_duo': {
      const props = section.props
      const patchBanner = (id: string, patch: Partial<BannerItem>) =>
        onChange({ ...props, banners: props.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
      return (
        <div className="space-y-3">
          {props.banners.map((banner, i) => {
            const backgroundType = banner.backgroundType ?? 'image'
            const color = banner.backgroundColor || defaultBannerColor(banner.accent)
            return (
              <div key={banner.id} className="space-y-3 rounded-2xl border border-border p-4">
                <span className="text-[12px] font-bold">بنر {i + 1}</span>
                <Field label="عنوان">
                  <Input value={banner.title} onChange={(e) => patchBanner(banner.id, { title: e.target.value })} />
                </Field>
                <Field label="توضیح">
                  <Input value={banner.subtitle} onChange={(e) => patchBanner(banner.id, { subtitle: e.target.value })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="متن دکمه" hint="خالی یعنی «مشاهده»">
                    <Input
                      value={banner.ctaLabel ?? ''}
                      placeholder="مشاهده"
                      onChange={(e) => patchBanner(banner.id, { ctaLabel: e.target.value })}
                    />
                  </Field>
                  <Field label="رنگ تأکیدی" hint="خط بالای عنوان و رنگ الگو">
                    <ColorInput value={banner.accent} onChange={(accent) => patchBanner(banner.id, { accent })} />
                  </Field>
                </div>
                <Field label="لینک" hint={LINK_HINT} error={checkField(linkSchema, banner.href)}>
                  <LinkField
                    value={banner.href}
                    invalid={Boolean(checkField(linkSchema, banner.href))}
                    onChange={(href) => patchBanner(banner.id, { href })}
                  />
                </Field>

                <div className="space-y-2">
                  <span className="block text-[13px] font-medium">پس‌زمینه</span>
                  <ChipPicker
                    label="نوع پس‌زمینه"
                    value={backgroundType}
                    options={[
                      { value: 'image', label: 'تصویر' },
                      { value: 'pattern', label: 'رنگ و الگو' },
                    ]}
                    onChange={(next) =>
                      // تصویر پاک نمی‌شود تا برگشتن به حالت تصویر، همان را برگرداند
                      patchBanner(
                        banner.id,
                        next === 'pattern'
                          ? { backgroundType: next, backgroundColor: color, pattern: banner.pattern ?? 'rings' }
                          : { backgroundType: next },
                      )
                    }
                  />
                </div>

                {backgroundType === 'image' ? (
                  <SingleImageField
                    value={banner.image}
                    label="تصویر بنر"
                    error={checkField(imageSourceSchema, banner.image)}
                    onChange={(image) => patchBanner(banner.id, { image })}
                  />
                ) : (
                  <>
                    <Field label="رنگ پس‌زمینه" hint="متن روی رنگ روشن خودکار تیره می‌شود">
                      <ColorInput
                        value={color}
                        onChange={(backgroundColor) => patchBanner(banner.id, { backgroundColor })}
                      />
                    </Field>
                    <BannerPatternPicker
                      value={banner.pattern ?? 'rings'}
                      color={color}
                      accent={banner.accent}
                      onChange={(pattern) => patchBanner(banner.id, { pattern })}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    case 'countdown_deal': {
      const props = section.props
      return (
        <div className="space-y-4">
          <Field label="عنوان">
            <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
          </Field>
          <Field label="شناسه محصول" hint="مثلاً prd_008">
            <Input value={props.productId} onChange={(e) => onChange({ ...props, productId: e.target.value })} dir="ltr" />
          </Field>
          {/* قبلاً slice(0, 16) روی ISO، ساعت UTC را به‌جای وقت محلی نشان می‌داد (۳:۳۰ جابه‌جا) */}
          <JalaliDatePicker
            label="پایان شمارش"
            value={Number.isNaN(Date.parse(props.endsAt)) ? '' : toLocalDateTime(new Date(props.endsAt))}
            onChange={(local) => onChange({ ...props, endsAt: new Date(local).toISOString() })}
          />
          <Field label="یادداشت">
            <Input value={props.note} onChange={(e) => onChange({ ...props, note: e.target.value })} />
          </Field>
        </div>
      )
    }

    case 'repair_cta': {
      const props = section.props
      return (
        <div className="space-y-4">
          <Field label="عنوان">
            <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
          </Field>
          <Field label="زیرعنوان">
            <Textarea value={props.subtitle} onChange={(e) => onChange({ ...props, subtitle: e.target.value })} className="min-h-20" />
          </Field>
          <Field label="مزیت‌ها" hint="هر خط یک مورد">
            <Textarea
              value={props.bullets.join('\n')}
              onChange={(e) => onChange({ ...props, bullets: e.target.value.split('\n').filter(Boolean) })}
            />
          </Field>
          <Field label="متن دکمه">
            <Input value={props.ctaLabel} onChange={(e) => onChange({ ...props, ctaLabel: e.target.value })} />
          </Field>
          <Field label="لینک دکمه" hint={LINK_HINT} error={checkField(linkSchema, props.ctaHref)}>
            <LinkField
              value={props.ctaHref}
              onChange={(ctaHref) => onChange({ ...props, ctaHref })}
              invalid={Boolean(checkField(linkSchema, props.ctaHref))}
              placeholder="/repair"
            />
          </Field>
          <SingleImageField
            value={props.image}
            label="تصویر بخش"
            error={checkField(imageSourceSchema, props.image)}
            onChange={(image) => onChange({ ...props, image })}
          />
        </div>
      )
    }

    case 'testimonials': {
      const props = section.props
      return (
        <div className="space-y-3">
          <Field label="عنوان بخش">
            <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
          </Field>
          {props.items.map((item) => (
            <div key={item.id} className="space-y-3 rounded-2xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="نام">
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      onChange({
                        ...props,
                        items: props.items.map((x) => (x.id === item.id ? { ...x, name: e.target.value } : x)),
                      })
                    }
                  />
                </Field>
                <Field label="عنوان شغلی">
                  <Input
                    value={item.role}
                    onChange={(e) =>
                      onChange({
                        ...props,
                        items: props.items.map((x) => (x.id === item.id ? { ...x, role: e.target.value } : x)),
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="متن نظر">
                <Textarea
                  value={item.body}
                  onChange={(e) =>
                    onChange({
                      ...props,
                      items: props.items.map((x) => (x.id === item.id ? { ...x, body: e.target.value } : x)),
                    })
                  }
                  className="min-h-20"
                />
              </Field>
            </div>
          ))}
        </div>
      )
    }

    case 'brand_strip': {
      const props = section.props
      return (
        <Field label="عنوان">
          <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
        </Field>
      )
    }

    case 'newsletter': {
      const props = section.props
      return (
        <div className="space-y-4">
          <Field label="عنوان">
            <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
          </Field>
          <Field label="زیرعنوان">
            <Input value={props.subtitle} onChange={(e) => onChange({ ...props, subtitle: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="متن داخل فیلد">
              <Input value={props.placeholder} onChange={(e) => onChange({ ...props, placeholder: e.target.value })} />
            </Field>
            <Field label="متن دکمه">
              <Input value={props.ctaLabel} onChange={(e) => onChange({ ...props, ctaLabel: e.target.value })} />
            </Field>
          </div>
        </div>
      )
    }

    case 'rich_text': {
      const props = section.props
      return (
        <div className="space-y-4">
          <Field label="عنوان">
            <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} />
          </Field>
          <Field label="محتوا (HTML ساده)">
            <Textarea value={props.html} onChange={(e) => onChange({ ...props, html: e.target.value })} className="min-h-40" />
          </Field>
        </div>
      )
    }

    default:
      return <p className="text-[13px] text-muted">برای این نوع سکشن ویرایشگری تعریف نشده است.</p>
  }
}
