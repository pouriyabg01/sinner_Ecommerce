import type { SmsLogEntry, SmsProvider, SmsSettings } from '@/types/sms'
import type { StockAlert } from '@/types/catalog'
import { http, HttpResponse, delay } from 'msw'
import { API_BASE_URL, MOCK_LATENCY_MS } from '@/lib/api/config'
import { db } from './db'
import { buildFacets, filterProducts, paginate, parseProductQuery } from './query-products'
import {
  ORDER_TRANSITIONS,
  repairBlockedNext,
  repairNextForAdmin,
  repairRequirement,
} from './status-flow'

import { currentUserId } from './data/users'
import type { Brand, Category, Product, Review, Tag } from '@/types/catalog'
import type { Order, OrderStatus } from '@/types/order'
import type { CommonIssue, DeviceKind, RepairRequest, RepairStatus } from '@/types/repair'
import type { AboutPageConfig, HomePageConfig, SiteSettings } from '@/types/cms'
import type { Address, Permission, User } from '@/types/user'
import { sanitizeAdminPermissions, USER_STATUS_LABEL } from '@/types/user'
import { uid } from '@/lib/utils'
import { toEnDigits, toFaDigits } from '@/lib/format'
import { repairSettings } from '@/lib/repair-pickup'

const api = (path: string) => `${API_BASE_URL}${path}`
const lag = () => delay(MOCK_LATENCY_MS)

/** برآورد هزینه از روی مشکلات ذخیره‌شده در db حساب می‌شود، نه از seed ثابت */
function estimateCost(issueIds: string[]) {
  const picked = issueIds
    .map((id) => db.repairIssues.find((i) => i.id === id))
    .filter(Boolean) as CommonIssue[]
  if (!picked.length) return { min: 0, max: 0, days: 0 }
  return {
    min: picked.reduce((sum, i) => sum + i.estimatedMin, 0),
    max: picked.reduce((sum, i) => sum + i.estimatedMax, 0),
    days: Math.max(...picked.map((i) => i.estimatedDays)),
  }
}

function notFound(message = 'یافت نشد') {
  return HttpResponse.json({ message }, { status: 404 })
}

/**
 * تغییر اسلاگ باید در همه‌ی ارجاع‌ها بازتاب پیدا کند، وگرنه محصولات یتیم
 * می‌شوند و سکشن‌های صفحه‌ی اصلی به دسته‌ای اشاره می‌کنند که دیگر نیست.
 */
function renameCategorySlug(from: string, to: string) {
  if (from === to) return
  db.products.forEach((p) => {
    if (p.categorySlug === from) p.categorySlug = to
  })
  db.home.sections.forEach((section) => {
    if (section.type === 'category_grid')
      section.props.categorySlugs = section.props.categorySlugs.map((s) => (s === from ? to : s))
    if (section.type === 'product_carousel' && section.props.categorySlug === from)
      section.props.categorySlug = to
  })
}

function renameBrandSlug(from: string, to: string) {
  if (from === to) return
  db.products.forEach((p) => {
    if (p.brandSlug === from) p.brandSlug = to
  })
  db.home.sections.forEach((section) => {
    if (section.type === 'brand_strip')
      section.props.brandSlugs = section.props.brandSlugs.map((s) => (s === from ? to : s))
  })
}

/** محصول‌ها برچسب را با عنوان نگه می‌دارند، پس تغییر نام باید در همه‌شان اعمال شود */
function renameTag(from: string, to: string) {
  if (from === to) return
  db.products.forEach((p) => {
    p.tags = p.tags.map((t) => (t === from ? to : t))
  })
}

const tagTitleTaken = (title: string, exceptId?: string) =>
  db.tags.some((t) => t.id !== exceptId && t.title === title)

const slugTaken = (list: { id: string; slug: string }[], slug: string, exceptId?: string) =>
  list.some((item) => item.id !== exceptId && item.slug === slug)

const conflict = (message: string, field?: string) => HttpResponse.json({ message, field }, { status: 409 })

/**
 * قیمت و موجودی کالا هیچ‌وقت از کلاینت پذیرفته نمی‌شود؛ از روی مدل‌های همان
 * کالا ساخته می‌شود — ارزان‌ترین مدل قیمتِ «از» است و جمع موجودی‌ها موجودی کل.
 * بک‌اند واقعی هم باید دقیقاً همین کار را بکند، وگرنه با یک درخواست دستی
 * می‌شود قیمت کالا را هر چیزی گذاشت.
 */
function withDerivedPricing(product: Product): Product {
  if (!product.variants?.length) return product
  return {
    ...product,
    price: Math.min(...product.variants.map((v) => v.price)),
    stock: product.variants.reduce((sum, v) => sum + v.stock, 0),
  }
}

/** پیش‌فرض اول و بعد جدیدترین — همان ترتیبی که بک‌اند برمی‌گرداند */
/** پنل سفارش‌ها نام و شماره‌ی مشتری را همراه هر سفارش می‌خواهد */
const withCustomer = (order: Order) => {
  const user = db.users.find((u) => u.id === order.userId)
  return { ...order, customer: user ? { id: user.id, fullName: user.fullName, phone: user.phone } : null }
}

const withSortedAddresses = (user: User): User => ({
  ...user,
  addresses: [...user.addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
})

/** کالاهایی که مشتری اجازه‌ی دیدنشان را دارد؛ هر اندپوینت عمومی باید از این بخواند، نه از db.products */
// کالای بی‌دسته (دسته‌اش حذف شده) تا دسته‌ی تازه نگیرد در فروشگاه نیست
const published = () => db.products.filter((p) => p.status === 'active' && Boolean(p.categorySlug))

/** سفارش‌هایی که هنوز روی میز ادمین‌اند — بعد از ارسال دیگر کاری با آن‌ها نیست */
const OPEN_ORDER_STATUS: OrderStatus[] = ['pending_payment', 'processing', 'packing']

/** تعمیرهایی که پرونده‌شان هنوز باز است */
const isOpenRepair = (status: RepairStatus) => !['completed', 'rejected'].includes(status)

/**
 * آغاز ماهِ شمسیِ تاریخ داده‌شده. مرز ماه باید فارسی حساب شود نه میلادی، وگرنه
 * «این ماه» وسط شهریور می‌پرد. حداکثر ۳۱ قدم عقب می‌رود تا به روز اول برسد.
 */
function persianMonthStart(from: Date = new Date()): Date {
  const dayOf = (d: Date) => Number(new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric' }).format(d))
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  while (dayOf(d) !== 1) d.setDate(d.getDate() - 1)
  return d
}

/** ابتدای چند ماه شمسی اخیر، از قدیمی به جدید؛ آخرینش ماه جاری است */
function recentPersianMonths(count: number): Date[] {
  const starts: Date[] = []
  let cursor = persianMonthStart()
  for (let i = 0; i < count; i++) {
    starts.unshift(cursor)
    const lastDayOfPrevious = new Date(cursor)
    lastDayOfPrevious.setDate(lastDayOfPrevious.getDate() - 1)
    cursor = persianMonthStart(lastDayOfPrevious)
  }
  return starts
}

const faPart = (d: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fa-IR', options).format(d)

/** «شهریور ۱۴۰۵» — ماه و سال جدا گرفته می‌شوند چون Intl برای این ترکیب ترتیب را برعکس می‌دهد */
const persianMonthLabel = (d: Date) => `${faPart(d, { month: 'long' })} ${faPart(d, { year: 'numeric' })}`

/** تاریخی که تعمیر واقعاً تمام شد؛ درآمدش به همان ماه تعلق دارد، نه ماه ثبت درخواست */
const repairDoneAt = (r: RepairRequest) =>
  r.timeline.find((t) => t.status === 'completed')?.at ?? r.createdAt

/**
 * همان قاعده‌ی بک‌اند: کالایی که خودش در فهرست است یا دسته‌اش؛ هر دو خالی یعنی
 * روی همه‌ی کالاها.
 */
function discountAppliesTo(discount: import('@/types/catalog').Discount, productId: string) {
  if (!discount.productIds.length && !discount.categoryIds.length) return true
  if (discount.productIds.includes(productId)) return true
  const slug = db.products.find((p) => p.id === productId)?.categorySlug
  const categoryId = db.categories.find((c) => c.slug === slug)?.id
  return categoryId !== undefined && discount.categoryIds.includes(categoryId)
}


/* ----------------------------- پیامک و خبرم کن ------------------------------ */
/** همان فهرست رویدادهای بک‌اند (SmsSettings::EVENTS) */
const SMS_EVENTS = [
  { key: 'otp', label: 'کد ورود', hint: 'وقتی کاربر با کد پیامکی وارد می‌شود', placeholders: ['code', 'site'], template: 'کد ورود شما به {site}: {code}\nاین کد را در اختیار دیگران قرار ندهید.' },
  { key: 'order.placed', label: 'ثبت سفارش', hint: 'بعد از پرداخت موفق، یا بلافاصله برای پرداخت در محل و اقساطی', placeholders: ['name', 'code', 'total', 'site'], template: '{name} عزیز، سفارش {code} به مبلغ {total} تومان ثبت شد و در حال آماده‌سازی است.\n{site}' },
  { key: 'order.shipped', label: 'ارسال سفارش', hint: 'وقتی وضعیت سفارش «ارسال شده» می‌شود', placeholders: ['name', 'code', 'tracking', 'site'], template: 'سفارش {code} ارسال شد. کد رهگیری مرسوله: {tracking}\n{site}' },
  { key: 'order.delivered', label: 'تحویل سفارش', hint: 'وقتی وضعیت سفارش «تحویل داده شد» می‌شود', placeholders: ['name', 'code', 'site'], template: 'سفارش {code} تحویل داده شد. از خرید شما سپاسگزاریم.\n{site}' },
  { key: 'order.cancelled', label: 'لغو سفارش', hint: 'وقتی سفارش لغو می‌شود', placeholders: ['name', 'code', 'site'], template: 'سفارش {code} لغو شد. اگر مبلغی پرداخت کرده‌اید، به حساب شما بازگردانده می‌شود.\n{site}' },
  { key: 'repair.submitted', label: 'ثبت درخواست تعمیر', hint: 'بلافاصله بعد از ثبت درخواست', placeholders: ['name', 'code', 'site'], template: 'درخواست تعمیر شما با کد پیگیری {code} ثبت شد. به‌زودی برای هماهنگی تماس می‌گیریم.\n{site}' },
  { key: 'repair.quoted', label: 'اعلام هزینه‌ی تعمیر', hint: 'وقتی وضعیت تعمیر «در انتظار تأیید شما» می‌شود', placeholders: ['name', 'code', 'cost', 'site'], template: 'هزینه‌ی تعمیر {code}: {cost} تومان. برای تأیید به پنل کاربری سر بزنید.\n{site}' },
  { key: 'repair.ready', label: 'آماده بودن دستگاه', hint: 'وقتی وضعیت تعمیر «آماده تحویل» می‌شود', placeholders: ['name', 'code', 'site'], template: 'دستگاه شما ({code}) تعمیر شد و آماده‌ی تحویل است.\n{site}' },
  { key: 'repair.completed', label: 'تکمیل تعمیر', hint: 'وقتی وضعیت تعمیر «تکمیل شده» می‌شود', placeholders: ['name', 'code', 'warranty', 'site'], template: 'تعمیر {code} تکمیل و تحویل شد. گارانتی تعمیر: {warranty} روز.\n{site}' },
  { key: 'back_in_stock', label: 'موجود شدن کالا', hint: 'برای کسانی که «موجود شد خبرم کن» را زده‌اند', placeholders: ['name', 'product', 'link', 'site'], template: '{product} که منتظرش بودید موجود شد:\n{link}\n{site}' },
]

let smsState = {
  enabled: false,
  provider: 'log' as SmsProvider,
  sender: '',
  username: '',
  apiKey: '',
  password: '',
  events: Object.fromEntries(SMS_EVENTS.map((e) => [e.key, { enabled: true, template: e.template }])) as SmsSettings['events'],
}
const smsLog: SmsLogEntry[] = []

const smsForAdmin = (): SmsSettings => ({
  enabled: smsState.enabled,
  provider: smsState.provider,
  sender: smsState.sender,
  username: smsState.username,
  apiKeySet: Boolean(smsState.apiKey),
  passwordSet: Boolean(smsState.password),
  events: structuredClone(smsState.events),
  catalog: SMS_EVENTS.map(({ key, label, hint, placeholders }) => ({ key, label, hint, placeholders })),
})

type MockAlert = { id: string; userId: string; productId: string; variantTitle: string; notifiedAt: string | null; createdAt: string }
let stockAlerts: MockAlert[] = []

const presentAlert = (alert: MockAlert): StockAlert => {
  const product = db.products.find((p) => p.id === alert.productId)
  const variant = product?.variants.find((v) => v.title === alert.variantTitle)
  const inStock = variant ? variant.stock > 0 : Boolean(product?.variants.some((v) => v.stock > 0))
  return {
    id: alert.id,
    productId: alert.productId,
    slug: product?.slug ?? '',
    title: product?.title ?? 'کالای حذف‌شده',
    image: product?.images[0] ?? '',
    variantTitle: alert.variantTitle,
    available: Boolean(product && product.status === 'active' && product.categorySlug && inStock),
    notifiedAt: alert.notifiedAt,
    createdAt: alert.createdAt,
  }
}

export const handlers = [
  /* ---------------------------------- catalog --------------------------------- */
  http.get(api('/products'), async ({ request }) => {
    await lag()
    const url = new URL(request.url)
    const query = parseProductQuery(url)
    const filtered = filterProducts(published(), query)
    // کلیدهای مشخصات از خود دسته خوانده می‌شود تا ویرایش دسته در پنل فوری اثر کند
    const specKeys = query.category ? (db.categories.find((c) => c.slug === query.category)?.specKeys ?? []) : []
    return HttpResponse.json({
      ...paginate(filtered, query.page, query.perPage),
      facets: buildFacets(published(), query, specKeys),
    })
  }),

  http.get(api('/products/:slug'), async ({ params }) => {
    await lag()
    // کالای غیرفعال برای مشتری اصلاً وجود ندارد — حتی با لینک مستقیم
    const product = published().find((p) => p.slug === params.slug || p.id === params.slug)
    if (!product) return notFound('محصول یافت نشد')
    const related = published()
      .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
      .slice(0, 8)
    return HttpResponse.json({ product, related })
  }),

  http.get(api('/products/:slug/reviews'), async ({ params }) => {
    await lag()
    const product = db.products.find((p) => p.slug === params.slug)
    if (!product) return notFound()
    const items = db.reviews.filter((r) => r.productId === product.id && r.status === 'approved')
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: items.filter((r) => Math.round(r.rating) === star).length,
    }))
    return HttpResponse.json({ items, breakdown, average: product.rating, total: items.length })
  }),

  http.post(api('/products/:slug/reviews'), async ({ params, request }) => {
    await lag()
    const product = db.products.find((p) => p.slug === params.slug)
    if (!product) return notFound()
    const body = (await request.json()) as Partial<Review>
    const review: Review = {
      id: uid('rev'),
      productId: product.id,
      userName: body.userName ?? 'کاربر سینر',
      rating: body.rating ?? 5,
      title: body.title ?? '',
      body: body.body ?? '',
      pros: body.pros ?? [],
      cons: body.cons ?? [],
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
      notHelpfulCount: 0,
      status: 'pending',
      verifiedPurchase: true,
    }
    db.reviews.unshift(review)
    return HttpResponse.json({ review, message: 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.' }, { status: 201 })
  }),

  http.post(api('/products/:slug/reviews/:id/vote'), async ({ params, request }) => {
    await lag()
    const review = db.reviews.find((r) => r.id === params.id)
    if (!review) return notFound()
    const { vote } = (await request.json()) as { vote: 'up' | 'down' }
    // در حالت دمو رأی‌دهنده‌ای در کار نیست؛ فقط شمارنده جابه‌جا می‌شود
    if (vote === 'up') review.helpfulCount += 1
    else review.notHelpfulCount += 1

    return HttpResponse.json({
      helpfulCount: review.helpfulCount,
      notHelpfulCount: review.notHelpfulCount,
      myVote: vote,
    })
  }),

  http.get(api('/compare'), async ({ request }) => {
    await lag()
    const ids = new URL(request.url).searchParams.get('ids')?.split(',').filter(Boolean) ?? []
    const items = ids.map((id) => published().find((p) => p.id === id || p.slug === id)).filter(Boolean) as Product[]
    const specKeys: { key: string; label: string }[] = []
    items.forEach((p) =>
      p.specs.forEach((s) => {
        if (!specKeys.some((k) => k.key === s.key)) specKeys.push({ key: s.key, label: s.label })
      }),
    )
    return HttpResponse.json({ items, specKeys })
  }),

  http.get(api('/categories'), async () => {
    await lag()
    return HttpResponse.json(
      db.categories.map((c) => ({ ...c, productCount: published().filter((p) => p.categorySlug === c.slug).length })),
    )
  }),

  http.get(api('/brands'), async () => {
    await lag()
    return HttpResponse.json(db.brands)
  }),

  http.get(api('/tags'), async () => {
    await lag()
    // فروشگاه فقط عنوان‌ها را می‌خواهد؛ شکل قبلی پاسخ حفظ می‌شود
    return HttpResponse.json(db.tags.map((t) => t.title))
  }),

  /* --------------------------------- برچسب‌ها --------------------------------- */
  http.get(api('/admin/tags'), async () => {
    await lag()
    return HttpResponse.json(
      db.tags.map((t) => ({ ...t, productCount: db.products.filter((p) => p.tags.includes(t.title)).length })),
    )
  }),

  http.post(api('/admin/tags'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Omit<Tag, 'id'>
    const title = body.title.trim()
    if (tagTitleTaken(title)) return conflict('برچسبی با این نام وجود دارد', 'title')
    const tag: Tag = { id: uid('tg'), title }
    db.tags.push(tag)
    return HttpResponse.json(tag, { status: 201 })
  }),

  http.patch(api('/admin/tags/:id'), async ({ params, request }) => {
    await lag()
    const index = db.tags.findIndex((t) => t.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'برچسب پیدا نشد' }, { status: 404 })

    const body = (await request.json()) as Partial<Tag>
    const title = body.title?.trim()
    if (title && tagTitleTaken(title, String(params.id)))
      return conflict('برچسبی با این نام وجود دارد', 'title')

    if (title) renameTag(db.tags[index].title, title)
    db.tags[index] = { ...db.tags[index], ...(title ? { title } : {}) }
    return HttpResponse.json(db.tags[index])
  }),

  http.delete(api('/admin/tags/:id'), async ({ params }) => {
    await lag()
    const tag = db.tags.find((t) => t.id === params.id)
    if (!tag) return HttpResponse.json({ message: 'برچسب پیدا نشد' }, { status: 404 })

    const count = db.products.filter((p) => p.tags.includes(tag.title)).length
    if (count > 0)
      return conflict(`این برچسب روی ${toFaDigits(count)} کالا نشسته است. اول از آن کالاها بردارید.`)

    db.tags = db.tags.filter((t) => t.id !== params.id)
    return HttpResponse.json({ ok: true })
  }),

  /* ------------------------------- cms / appearance --------------------------- */
  http.get(api('/cms/home'), async () => {
    await lag()
    return HttpResponse.json(db.home)
  }),

  http.put(api('/cms/home'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as HomePageConfig
    db.home = { ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(db.home)
  }),

  http.get(api('/cms/about'), async () => {
    await lag()
    return HttpResponse.json(db.about)
  }),

  http.put(api('/cms/about'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as AboutPageConfig
    db.about = { ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(db.about)
  }),

  http.get(api('/cms/settings'), async () => {
    await lag()
    return HttpResponse.json(db.settings)
  }),

  http.put(api('/cms/settings'), async ({ request }) => {
    await lag()
    db.settings = (await request.json()) as SiteSettings
    return HttpResponse.json(db.settings)
  }),

  /* ------------------------- admin: دسته‌بندی و برند --------------------------- */

  http.get(api('/admin/categories'), async () => {
    await lag()
    return HttpResponse.json(
      db.categories.map((c) => ({ ...c, productCount: db.products.filter((p) => p.categorySlug === c.slug).length })),
    )
  }),

  http.post(api('/admin/categories'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Omit<Category, 'id'>
    if (slugTaken(db.categories, body.slug)) return conflict('این اسلاگ قبلاً استفاده شده است', 'slug')
    const category: Category = { ...body, id: `cat_${body.slug}` }
    db.categories.push(category)
    return HttpResponse.json(category, { status: 201 })
  }),

  http.patch(api('/admin/categories/:id'), async ({ params, request }) => {
    await lag()
    const index = db.categories.findIndex((c) => c.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'دسته‌بندی پیدا نشد' }, { status: 404 })

    const body = (await request.json()) as Partial<Category>
    if (body.slug && slugTaken(db.categories, body.slug, String(params.id)))
      return conflict('این اسلاگ قبلاً استفاده شده است', 'slug')

    if (body.slug) renameCategorySlug(db.categories[index].slug, body.slug)
    db.categories[index] = { ...db.categories[index], ...body }
    return HttpResponse.json(db.categories[index])
  }),

  http.delete(api('/admin/categories/:id'), async ({ params, request }) => {
    await lag()
    const category = db.categories.find((c) => c.id === params.id)
    if (!category) return HttpResponse.json({ message: 'دسته‌بندی پیدا نشد' }, { status: 404 })

    // دسته‌ی دارای کالا فقط با تصمیم صریح حذف می‌شود: یا کالاها هم پاک شوند یا بی‌دسته بمانند
    const mode = new URL(request.url).searchParams.get('mode')
    const count = db.products.filter((p) => p.categorySlug === category.slug).length
    if (count > 0 && mode !== 'delete_products' && mode !== 'detach_products')
      return HttpResponse.json(
        { message: 'این دسته کالا دارد؛ مشخص کنید کالاها حذف شوند یا بدون دسته بمانند' },
        { status: 422 },
      )

    if (mode === 'delete_products') db.products = db.products.filter((p) => p.categorySlug !== category.slug)
    else
      db.products.forEach((p) => {
        if (p.categorySlug !== category.slug) return
        // بی‌دسته یعنی غیرفعال — همان رفتار بک‌اند
        p.categorySlug = ''
        p.status = 'inactive'
      })

    db.categories = db.categories.filter((c) => c.id !== params.id)
    db.home.sections.forEach((section) => {
      if (section.type === 'category_grid')
        section.props.categorySlugs = section.props.categorySlugs.filter((s) => s !== category.slug)
    })
    return HttpResponse.json({ ok: true, affected: count })
  }),

  http.get(api('/admin/brands'), async () => {
    await lag()
    return HttpResponse.json(
      db.brands.map((b) => ({ ...b, productCount: db.products.filter((p) => p.brandSlug === b.slug).length })),
    )
  }),

  http.post(api('/admin/brands'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Omit<Brand, 'id'>
    if (slugTaken(db.brands, body.slug)) return conflict('این اسلاگ قبلاً استفاده شده است', 'slug')
    const brand: Brand = { ...body, id: `br_${body.slug}` }
    db.brands.push(brand)
    return HttpResponse.json(brand, { status: 201 })
  }),

  http.patch(api('/admin/brands/:id'), async ({ params, request }) => {
    await lag()
    const index = db.brands.findIndex((b) => b.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'برند پیدا نشد' }, { status: 404 })

    const body = (await request.json()) as Partial<Brand>
    if (body.slug && slugTaken(db.brands, body.slug, String(params.id)))
      return conflict('این اسلاگ قبلاً استفاده شده است', 'slug')

    if (body.slug) renameBrandSlug(db.brands[index].slug, body.slug)
    db.brands[index] = { ...db.brands[index], ...body }
    return HttpResponse.json(db.brands[index])
  }),

  http.delete(api('/admin/brands/:id'), async ({ params }) => {
    await lag()
    const brand = db.brands.find((b) => b.id === params.id)
    if (!brand) return HttpResponse.json({ message: 'برند پیدا نشد' }, { status: 404 })

    const count = db.products.filter((p) => p.brandSlug === brand.slug).length
    if (count > 0)
      return conflict(`این برند ${toFaDigits(count)} کالا دارد. اول برند آن کالاها را عوض کنید.`)

    db.brands = db.brands.filter((b) => b.id !== params.id)
    db.home.sections.forEach((section) => {
      if (section.type === 'brand_strip')
        section.props.brandSlugs = section.props.brandSlugs.filter((s) => s !== brand.slug)
    })
    return HttpResponse.json({ ok: true })
  }),

  /* ----------------------------------- me / auth ------------------------------ */
  http.get(api('/me'), async ({ request }) => {
    await lag()
    // نقش از هدر خوانده می‌شود تا بتوان بین «کاربر / ادمین کل / ادمین کاتالوگ» سوییچ کرد
    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    const user = db.users.find((u) => u.id === asUser) ?? db.users[0]
    return HttpResponse.json(user)
  }),

  http.patch(api('/me'), async ({ request }) => {
    await lag()
    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    const index = db.users.findIndex((u) => u.id === asUser)
    if (index === -1) return HttpResponse.json({ message: 'کاربر پیدا نشد' }, { status: 404 })

    const body = (await request.json()) as Partial<Pick<User, 'fullName' | 'phone' | 'email'>>

    // یکتایی موبایل و ایمیل را بک‌اند واقعی هم چک می‌کند؛ فرم باید بتواند
    // این خطا را روی همان فیلد نشان دهد، نه به‌صورت پیام کلی.
    const takenBy = (field: 'phone' | 'email') => {
      const value = body[field]
      if (value === undefined) return false
      return db.users.some((u) => u.id !== asUser && u[field].toLowerCase() === value.toLowerCase())
    }

    if (takenBy('phone'))
      return HttpResponse.json({ message: 'این شماره موبایل قبلاً روی حساب دیگری ثبت شده است', field: 'phone' }, { status: 409 })
    if (takenBy('email'))
      return HttpResponse.json({ message: 'این ایمیل قبلاً روی حساب دیگری ثبت شده است', field: 'email' }, { status: 409 })

    db.users[index] = { ...db.users[index], ...body }
    return HttpResponse.json(db.users[index])
  }),

  /* --------------------------------- آدرس‌ها --------------------------------- */
  // همان قواعد بک‌اند: اولین آدرس پیش‌فرض می‌شود، همیشه فقط یک پیش‌فرض، و با
  // حذفِ پیش‌فرض جدیدترینِ بعدی جایش را می‌گیرد. پاسخ کل حساب است.
  http.post(api('/me/addresses'), async ({ request }) => {
    await lag()
    const user = db.users.find((u) => u.id === (request.headers.get('x-mock-user') ?? currentUserId))
    if (!user) return notFound('کاربر پیدا نشد')

    const body = (await request.json()) as Omit<Address, 'id'>
    const makeDefault = Boolean(body.isDefault) || user.addresses.length === 0
    if (makeDefault) user.addresses.forEach((a) => (a.isDefault = false))
    user.addresses.unshift({ ...body, id: uid('adr'), isDefault: makeDefault })
    return HttpResponse.json(withSortedAddresses(user))
  }),

  http.patch(api('/me/addresses/:id'), async ({ request, params }) => {
    await lag()
    const user = db.users.find((u) => u.id === (request.headers.get('x-mock-user') ?? currentUserId))
    const address = user?.addresses.find((a) => a.id === params.id)
    if (!user || !address) return notFound('آدرس پیدا نشد')

    const body = (await request.json()) as Partial<Address>
    if (body.isDefault === true) user.addresses.forEach((a) => (a.isDefault = false))
    Object.assign(address, { ...body, isDefault: body.isDefault === true ? true : address.isDefault })
    return HttpResponse.json(withSortedAddresses(user))
  }),

  http.delete(api('/me/addresses/:id'), async ({ request, params }) => {
    await lag()
    const user = db.users.find((u) => u.id === (request.headers.get('x-mock-user') ?? currentUserId))
    const index = user?.addresses.findIndex((a) => a.id === params.id) ?? -1
    if (!user || index === -1) return notFound('آدرس پیدا نشد')

    const [removed] = user.addresses.splice(index, 1)
    if (removed.isDefault && user.addresses.length) user.addresses[0].isDefault = true
    return HttpResponse.json(withSortedAddresses(user))
  }),

  /* ------------------------------ علاقه‌مندی‌ها ------------------------------ */
  // کالای غیرفعال در لیست می‌ماند ولی نمایش داده نمی‌شود — همان رفتار بک‌اند واقعی
  http.get(api('/me/wishlist'), async ({ request }) => {
    await lag()
    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    const ids = db.wishlist[asUser] ?? []
    return HttpResponse.json(ids.map((id) => published().find((p) => p.id === id)).filter(Boolean))
  }),

  http.post(api('/me/wishlist'), async ({ request }) => {
    await lag()
    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    const { productId } = (await request.json()) as { productId: string }
    if (!db.products.some((p) => p.id === productId)) return notFound('محصول یافت نشد')

    const ids = db.wishlist[asUser] ?? []
    db.wishlist[asUser] = ids.includes(productId) ? ids : [productId, ...ids]
    return HttpResponse.json({ productIds: db.wishlist[asUser] })
  }),

  http.delete(api('/me/wishlist/:productId'), async ({ request, params }) => {
    await lag()
    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    db.wishlist[asUser] = (db.wishlist[asUser] ?? []).filter((id) => id !== params.productId)
    return HttpResponse.json({ productIds: db.wishlist[asUser] })
  }),

  /** حساب‌های دمو رمز ذخیره‌شده ندارند؛ فقط قواعد رمز جدید سنجیده می‌شود */
  http.patch(api('/me/password'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as { password?: string; passwordConfirmation?: string }
    const invalid = (message: string) => HttpResponse.json({ message }, { status: 422 })

    if ((body.password ?? '').length < 8) return invalid('رمز عبور دست‌کم ۸ نویسه باشد.')
    if (body.password !== body.passwordConfirmation) return invalid('تکرار رمز با خودش یکی نیست.')
    return HttpResponse.json({ message: 'رمز عبور تغییر کرد و بقیه‌ی دستگاه‌ها از حساب خارج شدند.' })
  }),

  http.get(api('/me/orders'), async ({ request }) => {
    await lag()
    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    return HttpResponse.json(db.orders.filter((o) => o.userId === asUser))
  }),

  http.get(api('/me/repairs'), async ({ request }) => {
    await lag()
    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    return HttpResponse.json(db.repairs.filter((r) => r.userId === asUser))
  }),

  /* ----------------------------------- orders --------------------------------- */
  http.get(api('/orders/:code'), async ({ params }) => {
    await lag()
    const order = db.orders.find((o) => o.code === params.code || o.id === params.code)
    return order ? HttpResponse.json(order) : notFound('سفارش یافت نشد')
  }),

  /**
   * ثبت سفارش.
   *
   * هیچ مبلغی از کلاینت پذیرفته نمی‌شود: قیمت هر قلم از خود مدل کالا خوانده
   * می‌شود، تخفیف دوباره سنجیده می‌شود و موجودی همان‌جا کم می‌شود — همان قواعدی
   * که بک‌اند واقعی اجرا می‌کند، تا دو حالت یکسان رفتار کنند.
   */
  http.post(api('/orders'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as {
      lines: { variantId: string; quantity: number }[]
      paymentMethod?: Order['paymentMethod']
      addressSummary?: string
      preferredDeliveryDate?: string | null
      discountCode?: string
    }

    const items: Order['items'] = []
    let subtotal = 0

    for (const line of body.lines ?? []) {
      const product = db.products.find((p) => p.variants.some((v) => v.id === line.variantId))
      const variant = product?.variants.find((v) => v.id === line.variantId)

      if (!product || !variant || product.status !== 'active')
        return HttpResponse.json({ message: 'یکی از کالاهای سبد دیگر موجود نیست' }, { status: 422 })

      if (variant.stock < line.quantity)
        return HttpResponse.json(
          { message: `موجودی «${product.title} — ${variant.title}» کافی نیست` },
          { status: 422 },
        )

      variant.stock -= line.quantity
      product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0)
      product.price = Math.min(...product.variants.map((v) => v.price))

      subtotal += variant.price * line.quantity
      items.push({
        productId: product.id,
        title: product.title,
        image: product.images[0] ?? '',
        variantTitle: variant.title,
        unitPrice: variant.price,
        quantity: line.quantity,
      })
    }

    let discount = 0
    if (body.discountCode) {
      const found = db.discounts.find(
        (d) => d.code.toLowerCase() === body.discountCode!.trim().toLowerCase() && d.active,
      )
      const now = new Date()

      if (
        found &&
        new Date(found.startsAt) <= now &&
        new Date(found.endsAt) >= now &&
        (found.usageLimit === 0 || found.usedCount < found.usageLimit) &&
        (found.userIds.length === 0 || found.userIds.includes(request.headers.get('x-mock-user') ?? currentUserId))
      ) {
        const eligible = items.filter((item) => discountAppliesTo(found, item.productId))
        const base = eligible.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

        if (base > 0) {
          discount = found.type === 'percent' ? Math.round((base * found.value) / 100) : Math.min(found.value, base)
          found.usedCount += 1
        }
      }
    }

    const { freeThreshold, cost } = db.settings.shipping
    const payable = subtotal - discount
    const shippingCost = freeThreshold > 0 && payable >= freeThreshold ? 0 : cost

    const method = body.paymentMethod ?? 'online'
    // فقط پرداخت اینترنتی منتظر تراکنش می‌ماند؛ در محل و اقساطی مستقیم به بررسی می‌روند
    const status: OrderStatus = method === 'online' ? 'pending_payment' : 'processing'
    const at = new Date().toISOString()

    const order: Order = {
      id: uid('ord'),
      code: `SN-${Math.floor(10000 + Math.random() * 89999)}`,
      userId: currentUserId,
      items,
      subtotal,
      discount,
      shippingCost,
      total: Math.max(0, payable + shippingCost),
      status,
      paymentMethod: method,
      paymentStatus: 'unpaid',
      paymentRef: null,
      addressSummary: body.addressSummary ?? '',
      preferredDeliveryDate: body.preferredDeliveryDate || null,
      trackingCode: null,
      createdAt: at,
      timeline: [{ status, at }],
    }

    db.orders.unshift(order)
    return HttpResponse.json(order, { status: 201 })
  }),

  /**
   * شروع پرداخت. لایه‌ی mock درگاه واقعی ندارد، پس همیشه حالت دمو را برمی‌گرداند
   * و صفحه‌ی تسویه سراغ درگاه ساختگی می‌رود — همان مسیری که با بک‌اند واقعی هم
   * وقتی دمو روشن است طی می‌شود.
   */
  http.post(api('/pay/:type/:code'), async () => {
    await lag()
    return HttpResponse.json({ mode: 'demo', enabled: true, outcome: 'ask', delayMs: 1200 })
  }),

  /** نتیجه‌ی درگاه ساختگی؛ با بک‌اند واقعی فقط تا وقتی دمو روشن است پذیرفته می‌شود */
  http.post(api('/pay/order/:id/demo'), async ({ params, request }) => {
    await lag()
    const order = db.orders.find((o) => o.id === params.id || o.code === params.id)
    if (!order) return HttpResponse.json({ message: 'سفارش پیدا نشد' }, { status: 404 })
    if (order.paymentStatus === 'paid')
      return HttpResponse.json({ message: 'این سفارش قبلاً پرداخت شده است' }, { status: 409 })

    const { outcome } = (await request.json()) as { outcome: 'success' | 'failed' | 'cancelled' }
    const at = new Date().toISOString()

    if (outcome === 'success') {
      order.paymentStatus = 'paid'
      order.paymentRef = String(Math.floor(1e11 + Math.random() * 8.9e11))
      order.status = 'processing'
      order.timeline.push({ status: 'processing', at, note: `پرداخت آنلاین موفق — کد رهگیری ${order.paymentRef}` })
    } else {
      order.paymentStatus = outcome === 'failed' ? 'failed' : 'cancelled'
      order.status = 'pending_payment'
      order.timeline.push({
        status: 'pending_payment',
        at,
        note: outcome === 'failed' ? 'تراکنش ناموفق بود' : 'کاربر از پرداخت انصراف داد',
      })
    }
    return HttpResponse.json(order)
  }),

  /**
   * همه‌ی قواعد کد تخفیف اینجا سنجیده می‌شود، نه در مرورگر: بازه‌ی اعتبار، سقف
   * استفاده، و کالاهایی که کد رویشان کار می‌کند. مبلغ هم همین‌جا حساب می‌شود.
   */
  http.post(api('/discounts/validate'), async ({ request }) => {
    await lag()
    const { code, lines = [] } = (await request.json()) as {
      code: string
      lines?: { productId: string; lineTotal: number }[]
    }

    const invalid = (message: string) => HttpResponse.json({ message }, { status: 422 })

    const found = db.discounts.find((d) => d.code.toLowerCase() === code.trim().toLowerCase() && d.active)
    if (!found) return invalid('کد تخفیف نامعتبر است')

    const now = new Date()
    if (new Date(found.startsAt) > now) return invalid('این کد تخفیف هنوز فعال نشده است')
    if (new Date(found.endsAt) < now) return invalid('این کد تخفیف منقضی شده است')
    if (found.usageLimit > 0 && found.usedCount >= found.usageLimit)
      return invalid('ظرفیت استفاده از این کد تخفیف پر شده است')

    const asUser = request.headers.get('x-mock-user') ?? currentUserId
    if (found.userIds.length && !found.userIds.includes(asUser)) return invalid('این کد تخفیف برای حساب شما نیست')

    const eligible = lines.filter((line) => discountAppliesTo(found, line.productId))
    if (!eligible.length) return invalid('این کد تخفیف روی کالاهای سبد شما اعمال نمی‌شود')

    const base = eligible.reduce((sum, line) => sum + line.lineTotal, 0)
    const amount =
      found.type === 'percent' ? Math.round((base * found.value) / 100) : Math.min(found.value, base)

    return HttpResponse.json({ discount: found, amount })
  }),

  /* ----------------------------------- repair --------------------------------- */
  /** فرم ثبت تعمیر فقط مشکلات همان نوع دستگاه را می‌خواهد */
  http.get(api('/repair/issues'), async ({ request }) => {
    await lag()
    const kind = new URL(request.url).searchParams.get('deviceKind') as DeviceKind | null
    const items = kind ? db.repairIssues.filter((i) => i.deviceKinds.includes(kind)) : db.repairIssues
    return HttpResponse.json(items)
  }),

  http.post(api('/repair/estimate'), async ({ request }) => {
    await delay(150)
    const { issueIds } = (await request.json()) as { issueIds: string[] }
    return HttpResponse.json(estimateCost(issueIds))
  }),

  http.post(api('/repair/requests'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Partial<RepairRequest>
    // همان قاعده‌ی سرور: روشی که ادمین خاموشش کرده، با درخواست مستقیم هم پذیرفته نمی‌شود
    const pickup = repairSettings(db.settings.repair).methods.find((m) => m.id === body.pickupMethod)
    if (!pickup?.enabled)
      return HttpResponse.json({ message: 'این روش تحویل در حال حاضر فعال نیست' }, { status: 422 })
    const est = estimateCost(body.issueIds ?? [])
    const now = new Date().toISOString()
    const req: RepairRequest = {
      id: uid('rep'),
      code: `RP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
      userId: currentUserId,
      deviceKind: body.deviceKind ?? 'mobile',
      deviceBrand: body.deviceBrand ?? '',
      deviceModel: body.deviceModel ?? '',
      issueIds: body.issueIds ?? [],
      issueDescription: body.issueDescription ?? '',
      photos: body.photos ?? [],
      pickupMethod: body.pickupMethod ?? 'courier',
      addressSummary: body.addressSummary ?? '',
      preferredDate: body.preferredDate ?? null,
      status: 'submitted',
      estimatedCost: { min: est.min, max: est.max },
      finalCost: null,
      technicianNote: null,
      warrantyDays: 180,
      paymentStatus: 'unpaid',
      paymentRef: null,
      approvedAt: null,
      createdAt: now,
      timeline: [{ status: 'submitted', at: now }],
    }
    db.repairs.unshift(req)
    return HttpResponse.json(req, { status: 201 })
  }),

  http.get(api('/repair/requests/:code'), async ({ params }) => {
    await lag()
    const found = db.repairs.find((r) => r.code === params.code || r.id === params.code)
    if (!found) return notFound('درخواست تعمیر یافت نشد')
    // مسیر عمومی است — همان فیلدهای خصوصی‌ای که بک‌اند حذف می‌کند، اینجا هم نمی‌آید
    const { userId: _u, addressSummary: _a, photos: _p, issueDescription: _d, ...tracking } = found
    return HttpResponse.json(tracking)
  }),

  /* ----------------------------------- پیامک ---------------------------------- */
  http.get(api('/admin/sms'), async () => {
    await lag()
    return HttpResponse.json(smsForAdmin())
  }),

  http.put(api('/admin/sms'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Partial<typeof smsState> & { events?: SmsSettings['events'] }
    smsState = {
      ...smsState,
      enabled: Boolean(body.enabled),
      provider: body.provider ?? smsState.provider,
      sender: body.sender ?? '',
      username: body.username ?? '',
      apiKey: body.apiKey?.trim() || smsState.apiKey,
      password: body.password || smsState.password,
      events: Object.fromEntries(
        SMS_EVENTS.map((e) => [
          e.key,
          { enabled: body.events?.[e.key]?.enabled ?? true, template: body.events?.[e.key]?.template?.trim() || e.template },
        ]),
      ),
    }
    return HttpResponse.json(smsForAdmin())
  }),

  http.post(api('/admin/sms/test'), async ({ request }) => {
    await lag()
    const { phone } = (await request.json()) as { phone: string }
    const normalized = toEnDigits(phone ?? '').replace(/\s/g, '')
    if (!/^09\d{9}$/.test(normalized))
      return HttpResponse.json({ message: 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود' }, { status: 422 })
    // شبیه‌ساز به هیچ سرویسی وصل نیست؛ همیشه مثل حالت آزمایشی رفتار می‌کند
    smsLog.unshift({
      id: uid('sms'),
      phone: normalized,
      event: 'test',
      eventLabel: 'پیامک آزمایشی',
      message: 'پیامک آزمایشی سینر — اگر این پیام را می‌بینید، اتصال سرویس پیامک درست است.',
      status: 'logged',
      provider: 'log',
      error: null,
      createdAt: new Date().toISOString(),
    })
    return HttpResponse.json({ ok: true, status: 'logged', message: 'حالت آزمایشی است؛ پیامک فقط در گزارش ثبت شد' })
  }),

  http.get(api('/admin/sms/messages'), async () => {
    await lag()
    return HttpResponse.json(smsLog.slice(0, 50))
  }),

  /* -------------------------------- خبرم کن -------------------------------- */
  http.get(api('/me/stock-alerts'), async () => {
    await lag()
    return HttpResponse.json(stockAlerts.filter((a) => a.userId === currentUserId).map(presentAlert))
  }),

  http.post(api('/me/stock-alerts'), async ({ request }) => {
    await lag()
    const { productId, variantTitle } = (await request.json()) as { productId: string; variantTitle: string }
    if (!db.products.some((p) => p.id === productId)) return notFound('کالا پیدا نشد')
    const existing = stockAlerts.find(
      (a) => a.userId === currentUserId && a.productId === productId && a.variantTitle === (variantTitle ?? ''),
    )
    if (existing) existing.notifiedAt = null
    const alert = existing ?? {
      id: uid('sa'),
      userId: currentUserId,
      productId,
      variantTitle: variantTitle ?? '',
      notifiedAt: null,
      createdAt: new Date().toISOString(),
    }
    if (!existing) stockAlerts.unshift(alert)
    return HttpResponse.json(presentAlert(alert), { status: 201 })
  }),

  http.delete(api('/me/stock-alerts/:id'), async ({ params }) => {
    await lag()
    stockAlerts = stockAlerts.filter((a) => !(a.id === params.id && a.userId === currentUserId))
    return HttpResponse.json({ ok: true })
  }),

  /* ------------------------------------ admin --------------------------------- */
  http.get(api('/admin/stats'), async () => {
    await lag()
    const revenue = db.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)

    // ۱۲ ماه اخیر یکجا برمی‌گردد تا سوییچ کردن بین ماه‌ها درخواست تازه نخواهد
    const monthStarts = recentPersianMonths(12)
    const months = monthStarts.map((start, i) => {
      const end = monthStarts[i + 1] ?? null
      const inRange = (iso: string) => {
        const t = new Date(iso)
        return t >= start && (end === null || t < end)
      }
      const orders = db.orders.filter((o) => o.status !== 'cancelled' && inRange(o.createdAt))
      const repairs = db.repairs.filter((r) => r.status === 'completed' && inRange(repairDoneAt(r)))
      return {
        key: start.toISOString().slice(0, 10),
        label: persianMonthLabel(start),
        productRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        repairRevenue: repairs.reduce((sum, r) => sum + (r.finalCost ?? 0), 0),
        orderCount: orders.length,
        repairCount: repairs.length,
      }
    })
    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000)
      return {
        date: d.toISOString().slice(0, 10),
        revenue: Math.round(18_000_000 + Math.sin(i / 1.7) * 9_000_000 + Math.random() * 7_000_000),
        orders: Math.round(4 + Math.abs(Math.sin(i / 2)) * 9 + Math.random() * 3),
      }
    })
    return HttpResponse.json({
      revenue,
      orderCount: db.orders.length,
      productCount: db.products.length,
      repairCount: db.repairs.length,
      reviewCount: db.reviews.length,
      // «رسیدگی‌نشده»ها؛ همان‌هایی که کارت‌های داشبورد باید نشان دهند
      openOrders: db.orders.filter((o) => OPEN_ORDER_STATUS.includes(o.status)).length,
      pendingReviews: db.reviews.filter((r) => r.status === 'pending').length,
      openRepairs: db.repairs.filter((r) => isOpenRepair(r.status)).length,
      months,
      // اسلاگ لازم است چون داشبورد از روی آن به همان کالا در جدول محصولات لینک می‌دهد
      lowStock: db.products
        .filter((p) => p.stock <= 5)
        .map((p) => ({ id: p.id, slug: p.slug, title: p.title, stock: p.stock })),
      daily,
      topProducts: [...db.products]
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          image: p.images[0],
          reviewCount: p.reviewCount,
          price: p.price,
        })),
    })
  }),

  http.get(api('/admin/products'), async ({ request }) => {
    await lag()
    const query = parseProductQuery(new URL(request.url))
    return HttpResponse.json(paginate(filterProducts(db.products, query), query.page, query.perPage ?? 20))
  }),

  http.post(api('/admin/products'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Product
    const product = withDerivedPricing({
      ...body,
      id: uid('prd'),
      status: body.status ?? 'active',
      createdAt: new Date().toISOString(),
    })
    db.products.unshift(product)
    return HttpResponse.json(product, { status: 201 })
  }),

  http.patch(api('/admin/products/:id'), async ({ params, request }) => {
    await lag()
    const index = db.products.findIndex((p) => p.id === params.id)
    if (index === -1) return notFound()
    const merged = { ...db.products[index], ...((await request.json()) as Partial<Product>) }
    if (merged.status === 'active' && !merged.categorySlug)
      return HttpResponse.json(
        { message: 'کالای بدون دسته‌بندی را نمی‌شود فعال کرد — اول یک دسته برایش انتخاب کنید', field: 'categorySlug' },
        { status: 422 },
      )
    db.products[index] = withDerivedPricing(merged)
    return HttpResponse.json(db.products[index])
  }),

  http.delete(api('/admin/products/:id'), async ({ params }) => {
    await lag()
    db.products = db.products.filter((p) => p.id !== params.id)
    return HttpResponse.json({ ok: true })
  }),

  http.get(api('/admin/orders'), async () => {
    await lag()
    return HttpResponse.json(db.orders.map((o) => ({ ...withCustomer(o), allowedNext: ORDER_TRANSITIONS[o.status] })))
  }),

  http.patch(api('/admin/orders/:id'), async ({ params, request }) => {
    await lag()
    const order = db.orders.find((o) => o.id === params.id)
    if (!order) return notFound()
    const { status, trackingCode } = (await request.json()) as {
      status?: OrderStatus
      trackingCode?: string | null
    }
    if (status && status !== order.status) {
      // همان قاعده‌ی سرور: جهش از یک وضعیت به وضعیت دور پذیرفته نمی‌شود
      if (!ORDER_TRANSITIONS[order.status].includes(status))
        return HttpResponse.json({ message: 'این تغییر وضعیت مجاز نیست' }, { status: 422 })
      order.status = status
      order.timeline.push({ status, at: new Date().toISOString() })
    }
    if (trackingCode !== undefined) order.trackingCode = toEnDigits(trackingCode ?? '').trim() || null
    return HttpResponse.json({ ...withCustomer(order), allowedNext: ORDER_TRANSITIONS[order.status] })
  }),

  http.get(api('/admin/repairs'), async () => {
    await lag()
    // مشخصات تماس همین‌جا ضمیمه می‌شود تا پنل برای هر ردیف یک درخواست جدا نزند
    return HttpResponse.json(
      db.repairs.map((r) => {
        const user = db.users.find((u) => u.id === r.userId)
        return {
          ...r,
          customer: user ? { id: user.id, fullName: user.fullName, phone: user.phone } : null,
          allowedNext: repairNextForAdmin(r.status),
          blockedNext: repairBlockedNext(r.status, r.finalCost),
        }
      }),
    )
  }),

  http.patch(api('/admin/repairs/:id'), async ({ params, request }) => {
    await lag()
    const repair = db.repairs.find((r) => r.id === params.id)
    if (!repair) return notFound()
    const body = (await request.json()) as { status?: RepairStatus; finalCost?: number; technicianNote?: string }
    // هزینه‌ی همین درخواست، نه فقط آنچه ذخیره شده — ادمین معمولاً هر دو را با هم می‌فرستد
    const finalCost = body.finalCost !== undefined ? body.finalCost : repair.finalCost

    if (body.status && body.status !== repair.status) {
      if (!repairNextForAdmin(repair.status).includes(body.status))
        return HttpResponse.json({ message: 'این تغییر وضعیت مجاز نیست' }, { status: 422 })
      if (repairRequirement(body.status, finalCost))
        return HttpResponse.json({ message: 'اول باید هزینه‌ی نهایی را وارد کنید' }, { status: 422 })
      repair.status = body.status
      repair.timeline.push({ status: body.status, at: new Date().toISOString(), note: body.technicianNote })
    }
    if (body.finalCost !== undefined) repair.finalCost = body.finalCost
    if (body.technicianNote !== undefined) repair.technicianNote = body.technicianNote
    return HttpResponse.json({
      ...repair,
      allowedNext: repairNextForAdmin(repair.status),
      blockedNext: repairBlockedNext(repair.status, repair.finalCost),
    })
  }),

  http.get(api('/admin/reviews'), async () => {
    await lag()
    return HttpResponse.json(
      db.reviews.map((r) => ({ ...r, productTitle: db.products.find((p) => p.id === r.productId)?.title ?? '—' })),
    )
  }),

  http.patch(api('/admin/reviews/:id'), async ({ params, request }) => {
    await lag()
    const review = db.reviews.find((r) => r.id === params.id)
    if (!review) return notFound()
    const { status } = (await request.json()) as { status: Review['status'] }
    review.status = status
    return HttpResponse.json(review)
  }),

  http.get(api('/admin/discounts'), async () => {
    await lag()
    return HttpResponse.json(db.discounts)
  }),

  http.get(api('/admin/discounts/customers'), async () => {
    await lag()
    return HttpResponse.json(
      db.users.filter((u) => u.status === 'active').map((u) => ({ id: u.id, fullName: u.fullName, phone: u.phone })),
    )
  }),

  http.post(api('/admin/discounts'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Omit<import('@/types/catalog').Discount, 'id'>
    const discount = { ...body, id: uid('dsc') }
    db.discounts.unshift(discount)
    return HttpResponse.json(discount, { status: 201 })
  }),

  http.patch(api('/admin/discounts/:id'), async ({ params, request }) => {
    await lag()
    const index = db.discounts.findIndex((d) => d.id === params.id)
    if (index === -1) return notFound()
    db.discounts[index] = { ...db.discounts[index], ...((await request.json()) as object) }
    return HttpResponse.json(db.discounts[index])
  }),

  http.delete(api('/admin/discounts/:id'), async ({ params }) => {
    await lag()
    db.discounts = db.discounts.filter((d) => d.id !== params.id)
    return HttpResponse.json({ ok: true })
  }),

  http.get(api('/admin/repair-issues'), async () => {
    await lag()
    return HttpResponse.json(db.repairIssues)
  }),

  http.post(api('/admin/repair-issues'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Partial<CommonIssue>
    if (!body.title?.trim()) return HttpResponse.json({ message: 'عنوان مشکل الزامی است' }, { status: 422 })
    if (!body.deviceKinds?.length) {
      return HttpResponse.json({ message: 'حداقل یک نوع دستگاه انتخاب کنید' }, { status: 422 })
    }

    const issue: CommonIssue = {
      id: uid('iss'),
      title: body.title.trim(),
      hint: body.hint?.trim() ?? '',
      icon: body.icon || 'wrench',
      deviceKinds: body.deviceKinds,
      estimatedMin: body.estimatedMin ?? 0,
      estimatedMax: body.estimatedMax ?? 0,
      estimatedDays: body.estimatedDays ?? 1,
    }
    db.repairIssues.push(issue)
    return HttpResponse.json(issue, { status: 201 })
  }),

  http.patch(api('/admin/repair-issues/:id'), async ({ params, request }) => {
    await lag()
    const issue = db.repairIssues.find((i) => i.id === params.id)
    if (!issue) return notFound('مشکل یافت نشد')
    Object.assign(issue, (await request.json()) as Partial<CommonIssue>)
    return HttpResponse.json(issue)
  }),

  http.delete(api('/admin/repair-issues/:id'), async ({ params }) => {
    await lag()
    db.repairIssues = db.repairIssues.filter((i) => i.id !== params.id)
    return HttpResponse.json({ ok: true })
  }),

  http.get(api('/admin/users'), async () => {
    await lag()
    return HttpResponse.json(db.users)
  }),

  /**
   * ساخت کاربر از پنل. همیشه «مشتری» ساخته می‌شود — حساب‌های دارای دسترسی
   * پنل فقط از صفحه‌ی ادمین‌ها ساخته می‌شوند تا مسیر مجوزدهی یکی بماند.
   */
  http.post(api('/admin/users'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Partial<User>

    const fullName = (body.fullName ?? '').trim()
    const phone = (body.phone ?? '').trim()
    const email = (body.email ?? '').trim()
    if (!fullName || !phone || !email)
      return HttpResponse.json({ message: 'نام، موبایل و ایمیل الزامی است' }, { status: 422 })

    // پیام خطا باید بگوید کدام فیلد تکراری است تا فرم زیر همان کادر نشانش دهد
    if (db.users.some((u) => u.phone === phone))
      return conflict('این شماره موبایل برای کاربر دیگری ثبت شده است', 'phone')
    if (db.users.some((u) => u.email === email))
      return conflict('این ایمیل برای کاربر دیگری ثبت شده است', 'email')

    const user: User = {
      id: uid('usr'),
      fullName,
      phone,
      email,
      role: 'customer',
      status: body.status && body.status in USER_STATUS_LABEL ? body.status : 'active',
      permissions: [],
      createdAt: new Date().toISOString(),
      addresses: [],
    }

    db.users.push(user)
    return HttpResponse.json(user, { status: 201 })
  }),

  /** پرونده‌ی کامل یک کاربر: پروفایل + آدرس‌ها + خلاصه‌ی سفارش و تعمیر */
  http.get(api('/admin/users/:id'), async ({ params }) => {
    await lag()
    const user = db.users.find((u) => u.id === params.id)
    if (!user) return notFound('کاربر یافت نشد')

    const orders = db.orders.filter((o) => o.userId === user.id)
    const repairs = db.repairs.filter((r) => r.userId === user.id)

    return HttpResponse.json({
      user,
      orders: orders.map((o) => ({
        id: o.id,
        code: o.code,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
      })),
      repairs: repairs.map((r) => ({
        id: r.id,
        code: r.code,
        device: `${r.deviceBrand} ${r.deviceModel}`,
        status: r.status,
        createdAt: r.createdAt,
      })),
      stats: {
        orderCount: orders.length,
        // سفارش لغوشده خرید محسوب نمی‌شود
        spent: orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0),
        openRepairs: repairs.filter((r) => !['completed', 'rejected'].includes(r.status)).length,
      },
    })
  }),

  http.patch(api('/admin/users/:id'), async ({ params, request }) => {
    await lag()
    const index = db.users.findIndex((u) => u.id === params.id)
    if (index === -1) return notFound('کاربر یافت نشد')

    const current = db.users[index]
    const body = (await request.json()) as Partial<User>

    // مدیر کل نباید بتواند خودش را از سیستم بیرون بیندازد — نه با مسدودی، نه با غیرفعالی
    if (body.status && body.status !== 'active' && current.role === 'admin_super')
      return HttpResponse.json({ message: 'وضعیت حساب مدیر کل تغییر نمی‌کند' }, { status: 403 })

    const phone = body.phone?.trim()
    const email = body.email?.trim()
    if (phone && db.users.some((u) => u.id !== current.id && u.phone === phone))
      return conflict('این شماره موبایل برای کاربر دیگری ثبت شده است', 'phone')
    if (email && db.users.some((u) => u.id !== current.id && u.email === email))
      return conflict('این ایمیل برای کاربر دیگری ثبت شده است', 'email')

    db.users[index] = {
      ...current,
      ...(body.fullName !== undefined ? { fullName: body.fullName.trim() } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    }
    return HttpResponse.json(db.users[index])
  }),

  http.delete(api('/admin/users/:id'), async ({ params }) => {
    await lag()
    const user = db.users.find((u) => u.id === params.id)
    if (!user) return notFound('کاربر یافت نشد')
    if (user.role === 'admin_super')
      return HttpResponse.json({ message: 'حساب مدیر کل حذف نمی‌شود' }, { status: 403 })

    // سفارش و تعمیر بدون صاحب، تاریخچه‌ی فروشگاه را خراب می‌کند
    const orders = db.orders.filter((o) => o.userId === user.id).length
    const repairs = db.repairs.filter((r) => r.userId === user.id).length
    if (orders || repairs)
      return conflict(
        `این کاربر ${toFaDigits(orders)} سفارش و ${toFaDigits(repairs)} تعمیر دارد و حذف نمی‌شود. به‌جایش مسدودش کنید.`,
      )

    db.users = db.users.filter((u) => u.id !== params.id)
    return HttpResponse.json({ ok: true })
  }),

  http.get(api('/admin/admins'), async () => {
    await lag()
    return HttpResponse.json(db.users.filter((u) => u.role !== 'customer'))
  }),

  /**
   * ساخت ادمین جدید. لیست دسترسی از body می‌آید ولی به آن اعتماد نمی‌شود:
   * `admin.manage` هرگز داده نمی‌شود تا ادمینِ ساخته‌شده نتواند ادمین دیگری بسازد.
   */
  http.post(api('/admin/admins'), async ({ request }) => {
    await lag()
    const body = (await request.json()) as Partial<User> & { permissions?: Permission[] }

    const email = (body.email ?? '').trim()
    const phone = (body.phone ?? '').trim()
    if (!body.fullName?.trim() || !phone) {
      return HttpResponse.json({ message: 'نام و شماره موبایل الزامی است' }, { status: 422 })
    }
    if (db.users.some((u) => u.phone === phone || (email && u.email === email))) {
      return HttpResponse.json({ message: 'کاربری با این موبایل یا ایمیل از قبل هست' }, { status: 409 })
    }

    const admin: User = {
      id: uid('usr'),
      fullName: body.fullName.trim(),
      adminTitle: body.adminTitle?.trim() || 'ادمین',
      phone,
      email,
      role: 'admin',
      status: 'active',
      permissions: sanitizeAdminPermissions(body.permissions),
      createdAt: new Date().toISOString(),
      addresses: [],
    }

    db.users.push(admin)
    return HttpResponse.json(admin, { status: 201 })
  }),

  http.delete(api('/admin/admins/:id'), async ({ params }) => {
    await lag()
    const admin = db.users.find((u) => u.id === params.id)
    if (!admin) return notFound('ادمین یافت نشد')
    if (admin.role === 'admin_super') {
      return HttpResponse.json({ message: 'حساب مدیر کل حذف نمی‌شود' }, { status: 403 })
    }

    db.users = db.users.filter((u) => u.id !== params.id)
    return HttpResponse.json({ ok: true })
  }),
]
