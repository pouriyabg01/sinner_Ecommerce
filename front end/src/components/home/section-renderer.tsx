'use client'

import DOMPurify from 'isomorphic-dompurify'
import type { Section } from '@/types/cms'
import { HeroSlider } from './hero-slider'
import { FeaturesBar } from './features-bar'
import { CategoryGrid } from './category-grid'
import { ProductCarousel } from './product-carousel'
import { BannerDuo } from './banner-duo'
import { CountdownDeal } from './countdown-deal'
import { RepairCta } from './repair-cta'
import { BrandStrip } from './brand-strip'
import { Testimonials } from './testimonials'
import { Newsletter } from './newsletter'
import { cn } from '@/lib/utils'

const spacingClass = {
  none: 'py-0',
  sm: 'py-4',
  md: 'py-8',
  lg: 'py-14',
} as const

const backgroundClass = {
  default: '',
  surface: 'bg-surface',
  brand: '',
  ink: '',
} as const

/**
 * رجیستری سکشن‌ها. برای افزودن یک نوع سکشن جدید کافی است
 * ۱) به SectionType در types/cms.ts اضافه شود ۲) props آن تعریف شود
 * ۳) کامپوننتش اینجا ثبت شود. پنل ادمین خودکار پشتیبانی می‌کند.
 */
export function SectionRenderer({ section }: { section: Section }) {
  if (!section.enabled) return null

  const body = (() => {
    switch (section.type) {
      case 'hero_slider':
        return <HeroSlider {...section.props} />
      case 'features_bar':
        return <FeaturesBar {...section.props} />
      case 'category_grid':
        return <CategoryGrid {...section.props} />
      case 'product_carousel':
        return <ProductCarousel {...section.props} />
      case 'banner_duo':
        return <BannerDuo {...section.props} />
      case 'countdown_deal':
        return <CountdownDeal {...section.props} />
      case 'repair_cta':
        return <RepairCta {...section.props} />
      case 'brand_strip':
        return <BrandStrip {...section.props} />
      case 'testimonials':
        return <Testimonials {...section.props} />
      case 'newsletter':
        return <Newsletter {...section.props} />
      case 'rich_text':
        return (
          <div className="container-page">
            <h2 className="mb-4 text-xl font-bold">{section.props.title}</h2>
            <div
              className="max-w-3xl text-sm leading-8 text-muted"
              // بک‌اند هم پاک می‌کند؛ این لایه‌ی دوم برای پیش‌نمایش ادمین و داده‌ی قدیمی است
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.props.html ?? '') }}
            />
          </div>
        )
      default:
        return null
    }
  })()

  return (
    <section
      data-section-id={section.id}
      data-section-type={section.type}
      className={cn(spacingClass[section.spacing], backgroundClass[section.background])}
    >
      {body}
    </section>
  )
}

export const SECTION_LABELS: Record<Section['type'], string> = {
  hero_slider: 'اسلایدر اصلی',
  features_bar: 'نوار مزیت‌ها',
  category_grid: 'شبکه دسته‌بندی‌ها',
  product_carousel: 'کروسل محصولات',
  banner_duo: 'بنر دوتایی',
  countdown_deal: 'پیشنهاد شگفت‌انگیز',
  repair_cta: 'بخش تعمیرات',
  brand_strip: 'نوار برندها',
  testimonials: 'نظرات مشتریان',
  rich_text: 'متن آزاد',
  newsletter: 'خبرنامه',
}
