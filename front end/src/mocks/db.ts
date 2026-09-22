import type { Discount, Product, Review } from '@/types/catalog'
import type { Order } from '@/types/order'
import type { CommonIssue, RepairRequest } from '@/types/repair'
import type { User } from '@/types/user'
import type { AboutPageConfig, HomePageConfig, SiteSettings } from '@/types/cms'

import { products as seedProducts } from './data/products'
import { reviews as seedReviews } from './data/reviews'
import { discounts as seedDiscounts } from './data/discounts'
import { orders as seedOrders } from './data/orders'
import { repairRequests as seedRepairs, commonIssues as seedRepairIssues } from './data/repair'
import { users as seedUsers } from './data/users'
import { aboutConfig as seedAbout, homeConfig as seedHome, siteSettings as seedSettings } from './data/site'
import { brands, categories, tags } from './data/taxonomy'

/**
 * پایگاه داده‌ی درون‌حافظه‌ای. تغییرات پنل ادمین اینجا اعمال می‌شود تا
 * رفتار سایت واقعی حس شود. با رفرش صفحه به مقدار اولیه برمی‌گردد.
 */
export const db = {
  products: structuredClone(seedProducts) as Product[],
  reviews: structuredClone(seedReviews) as Review[],
  discounts: structuredClone(seedDiscounts) as Discount[],
  orders: structuredClone(seedOrders) as Order[],
  repairs: structuredClone(seedRepairs) as RepairRequest[],
  repairIssues: structuredClone(seedRepairIssues) as CommonIssue[],
  users: structuredClone(seedUsers) as User[],
  home: structuredClone(seedHome) as HomePageConfig,
  about: structuredClone(seedAbout) as AboutPageConfig,
  settings: structuredClone(seedSettings) as SiteSettings,
  categories: structuredClone(categories),
  brands: structuredClone(brands),
  tags: structuredClone(tags),
  /** شناسه‌ی کاربر → شناسه‌ی کالاهای علاقه‌مندی، جدیدترین اول */
  wishlist: {} as Record<string, string[]>,
}

export function resetDb() {
  db.products = structuredClone(seedProducts)
  db.reviews = structuredClone(seedReviews)
  db.discounts = structuredClone(seedDiscounts)
  db.orders = structuredClone(seedOrders)
  db.repairs = structuredClone(seedRepairs)
  db.repairIssues = structuredClone(seedRepairIssues)
  db.users = structuredClone(seedUsers)
  db.home = structuredClone(seedHome)
  db.about = structuredClone(seedAbout)
  db.settings = structuredClone(seedSettings)
  db.categories = structuredClone(categories)
  db.brands = structuredClone(brands)
  db.tags = structuredClone(tags)
  db.wishlist = {}
}
