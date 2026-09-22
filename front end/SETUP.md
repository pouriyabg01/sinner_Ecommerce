# سینر — فرانت‌اند فروشگاه و تعمیرگاه

> فایل `README` (بدون پسوند) همان بریف اولیه‌ی پروژه است و دست‌نخورده باقی مانده.
> این فایل، مستندات فنی پیاده‌سازی است.

## اجرا

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # بیلد پروداکشن
npm run typecheck  # بررسی تایپ‌ها
```

## استک

| لایه | انتخاب | چرا |
|---|---|---|
| فریم‌ورک | Next.js 16 (App Router) | SSR برای SEO صفحات محصول |
| زبان | TypeScript | قرارداد بین فرانت و بک‌اند آینده |
| استایل | Tailwind CSS v4 | توکن‌های طراحی در `src/app/globals.css` |
| انیمیشن | Motion (Framer Motion) | ترنزیشن صفحه، هاور، اسکرول‌ریویل |
| دیتا | TanStack Query | کش، loading state، invalidate |
| استیت لوکال | Zustand + persist | سبد خرید، مقایسه، تم، نشست |
| دیتای mock | **MSW** | مهم‌ترین انتخاب — پایین‌تر توضیح داده شده |
| کروسل | Embla | RTL-native |
| Drag & Drop | dnd-kit | مرتب‌سازی سکشن‌های لندینگ در پنل ادمین |

## فونت‌ها — ترکیب Yekan و Vazirmatn

`src/lib/fonts.ts`

- **Yekan** (`--font-yekan`) → فونت نمایشی: تیترها (`h1..h3`)، لوگو. فرم هندسی و خاص.
- **Vazirmatn Variable** (`--font-vazirmatn`) → متن و رابط کاربری، وزن ۱۰۰ تا ۹۰۰. خوانا در سایز کوچک.

چون گلیف‌های لاتین و اعداد Yekan ضعیف‌اند، Vazirmatn به‌عنوان fallback آن تعریف شده و
کلاس یوتیلیتی `.num` هر عدد یا متن لاتین را — حتی داخل تیتر — به Vazirmatn برمی‌گرداند
با `tabular-nums` و `direction: ltr`.

هر دو فونت به‌صورت لوکال در `public/fonts/` هستند و با `next/font/local` لود می‌شوند
(بدون CDN، بدون CLS، با preload).

## معماری داده — چرا MSW و نه فایل JSON

کد اپلیکیشن هیچ‌جا به دیتای mock مستقیم `import` نمی‌زند؛ همه‌جا `fetch` واقعی می‌زند:

```
کامپوننت → hooks (lib/api/queries.ts) → endpoints.ts → client.ts → fetch
                                                                     ↓
                                                    MSW (مرورگر: Service Worker)
                                                    MSW (سرور: msw/node)
                                                                     ↓
                                                    mocks/handlers.ts → mocks/db.ts
```

نتیجه: **روز اتصال به بک‌اند واقعی، هیچ کامپوننتی تغییر نمی‌کند.** فقط:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com/v1
NEXT_PUBLIC_API_MOCKING=disabled
```

MSW هم در مرورگر (`src/mocks/browser.ts`) و هم در سرور (`src/instrumentation.ts` →
`src/mocks/node.ts`) بالا می‌آید، پس Server Component ها هم همان endpointها را می‌بینند.
تأخیر مصنوعی شبکه (`MOCK_LATENCY_MS`) فعال است تا اسکلتون‌ها واقعی دیده شوند.

### برای اپ موبایل
لایه‌ی `src/lib/api/` (client + endpoints) و `src/types/` هیچ وابستگی‌ای به React یا Next ندارند
و مستقیماً در React Native قابل استفاده‌اند.

## لندینگ داده‌محور (بخش «تغییر طراحی سایت» در پنل)

صفحه‌ی اصلی هیچ JSX ثابتی ندارد. یک آرایه از سکشن‌ها در `GET /cms/home` می‌آید و
`SectionRenderer` روی آن map می‌زند:

```
types/cms.ts            ← تعریف SectionType و props هر نوع (discriminated union)
components/home/*       ← کامپوننت هر سکشن
components/home/section-renderer.tsx  ← رجیستری type → کامپوننت
app/admin/appearance/   ← ویرایشگر: drag & drop، خاموش/روشن، حذف، افزودن
components/admin/section-editor.tsx   ← فرم اختصاصی هر نوع سکشن
```

**افزودن یک نوع سکشن جدید:** ۱) به `SectionType` و `SectionProps` اضافه کن،
۲) کامپوننتش را بساز، ۳) در `SectionRenderer` و `SECTION_LABELS` ثبتش کن،
۴) یک template در `components/admin/home-sections-editor.tsx` بگذار.
پنل ادمین خودکار پشتیبانی می‌کند.

### نوار اعلان و قواعد ارسال

`components/admin/announcement-editor.tsx`، تب «نوار اعلان» در صفحه‌ی «طراحی سایت» —
متن و لینک نوار اعلان بالای سایت، با پیش‌نمایش زنده.

کنارش **قواعد ارسال** (`SiteSettings.shipping`) هست چون نوار اعلان معمولاً
همان‌ها را وعده می‌دهد:

| فیلد | اثر |
|---|---|
| `freeThreshold` | نوار پیشرفت سبد خرید و رایگان شدن ارسال در تسویه — صفر یعنی همیشه رایگان |
| `cost` | هزینه‌ی ارسال سفارش‌های زیر سقف |

هر دو از طریق `useShipping()` در `src/lib/use-shipping.ts` خوانده می‌شوند؛
قبلاً عدد ۵٬۰۰۰٬۰۰۰ در `checkout/page.tsx` و `cart-drawer.tsx` هاردکد بود و
با متن اعلان هماهنگ نمی‌ماند. هیچ عدد ارسالی جای دیگری hardcode نیست.

### همه‌ی ویرایش‌های محتوا زیر یک صفحه

`app/admin/appearance/page.tsx` فقط میزبان تب‌هاست؛ هر بخشِ قابل‌ویرایشِ سایت یک تب
اینجا می‌گیرد، نه یک صفحه‌ی جدا در منوی پنل:

| تب | ویرایشگر | منبع داده |
|---|---|---|
| صفحه اصلی | `components/admin/home-sections-editor.tsx` | `GET/PUT /cms/home` |
| درباره ما | `components/admin/about-editor.tsx` | `GET/PUT /cms/about` |
| فوتر | `components/admin/footer-editor.tsx` | `SiteSettings.footer` |
| نوار اعلان | `components/admin/announcement-editor.tsx` | `SiteSettings.announcement` + `shipping` |

هر تب پیش‌نویس و دکمه‌ی ذخیره‌ی خودش را دارد. اجزای مشترکشان
(`BlockToggle`, `EditorRow`, `IconPicker`) در `components/admin/editor-bits.tsx` است.

**افزودن یک بخش قابل‌ویرایش جدید:** ویرایشگرش را بساز و یک ورودی به آرایه‌ی `tabs`
در `app/admin/appearance/page.tsx` اضافه کن.

### صفحه «درباره ما»

محتوا از `GET /cms/about` می‌آید و صفحه‌ی `/about` هیچ متن ثابتی ندارد
(`AboutPageConfig` در `types/cms.ts`: سربرگ، آمارها، ارزش‌ها، بلوک تماس، قوانین).
هر بلوک `enabled` دارد تا بدون حذف محتوا خاموش شود؛ آیکون آمارها از `iconMap`
(`src/lib/icons.ts`) می‌آید و آدرس/تلفن/ایمیل بلوک تماس از `SiteSettings` خوانده
می‌شود تا در دو جا تکرار نشود.

### فوتر

`SiteSettings.footer` — نشان‌های اعتماد (`badges`)، متن معرفی و ستون‌های لینک.
کنار بقیه‌ی تنظیمات نشسته و نه پشت یک endpoint جدا، چون فوتر همان‌جا آدرس، تلفن و
شبکه‌های اجتماعی را هم می‌خواند و نباید برای یک بخش دو درخواست بزند.

## ادمین‌ها و دسترسی‌ها

`src/types/user.ts`

| نقش | دسترسی |
|---|---|
| `admin_super` | مدیر کل — همیشه همه‌ی دسترسی‌ها (`ALL_PERMISSIONS`)، ثابت و غیرقابل تغییر |
| `admin` | ادمینی که مدیر کل ساخته؛ دسترسی‌هایش در `user.permissions` ذخیره می‌شود |
| `customer` | بدون دسترسی به پنل |

منوی سایدبار پنل و گارد هر صفحه (`<PermissionGate>`) از روی دسترسی‌های همان کاربر
ساخته می‌شود — با `useCan()` در `src/lib/use-can.ts`، نه `can()` مستقیم.

### ساخت ادمین جدید

`/admin/admins` (فقط با دسترسی `admin.manage`، یعنی فقط مدیر کل) — فرمِ ساخت،
نام و موبایل می‌گیرد و دسترسی‌ها را با تیک انتخاب می‌کند. `ADMIN_PRESETS` چند قالب
آماده دارد که فرم را پر می‌کنند: **ادمین کاتالوگ**، **ویرایشگر سایت**،
**پشتیبان سفارش‌ها** و **سفارشی**.

| اندپوینت | کار |
|---|---|
| `GET /admin/admins` | فهرست حساب‌های دارای دسترسی پنل |
| `POST /admin/admins` | ساخت ادمین (تکراری بودن موبایل/ایمیل چک می‌شود) |
| `DELETE /admin/admins/:id` | حذف دسترسی یک ادمین |

سه محدودیت که هم در UI و هم در هندلر سرور اعمال می‌شوند:

- `admin.manage` به هیچ ادمینی داده نمی‌شود — `SUPER_ONLY_PERMISSIONS` در
  `sanitizeAdminPermissions`؛ وگرنه یک ادمین می‌توانست ادمینی با دسترسی کامل بسازد.
- حساب مدیر کل حذف نمی‌شود (سرور ۴۰۳ برمی‌گرداند).
- کاربر حساب خودش را حذف نمی‌کند.

دسترسی‌ها موقع **ساخت** انتخاب می‌شوند؛ برای عوض کردنشان ادمین را حذف و دوباره بساز.

**افزودن یک دسترسی جدید:** ۱) به `Permission` اضافه کن، ۲) در `ALL_PERMISSIONS`
ثبتش کن، ۳) برچسب و توضیحش را در `PERMISSION_LABEL` بگذار، ۴) در یکی از گروه‌های
`PERMISSION_GROUPS` قرارش بده. فرم ساخت ادمین خودکار نمایشش می‌دهد.

### سوییچ بین حساب‌ها (حالت دمو)

تا وقتی احراز هویت واقعی نیست، سلکتور «ورود به‌عنوان» در پنل کاربری و پنل ادمین
بین حساب‌ها جابه‌جا می‌کند. سلکتورِ داخل پنل (`useAccounts()`) ادمین‌های تازه‌ساخته را
هم نشان می‌دهد، پس می‌شود بلافاصله بعد از ساخت، دسترسی‌هایش را تست کرد.

## ماژول تعمیرات

- `src/types/repair.ts` — دستگاه، مشکلات رایج، روش تحویل (پیک/پست/حضوری)، ۱۱ وضعیت
- `src/mocks/data/repair.ts` — ۱۲ مشکل رایج با بازه‌ی هزینه و زمان تخمینی
- `src/components/repair/repair-wizard.tsx` — ویزارد ۴ مرحله‌ای با برآورد لحظه‌ای هزینه
- `/admin/repairs` → کارت «مشکلات رایج فرم تعمیر»: هر مشکل به یک یا چند
  `DeviceKind` وصل است و فرم سایت فقط مشکلات همان دستگاه را می‌گیرد
  (`GET /repair/issues?deviceKind=…`). برآورد هزینه هم از همین مقادیر حساب می‌شود،
  پس تغییر در پنل بلافاصله روی قیمت‌های نمایش‌داده‌شده اثر می‌گذارد.
- `/repair` ثبت درخواست · `/repair/track` پیگیری با کد · `/profile/repairs` پنل کاربر ·
  `/admin/repairs` پنل ادمین (تغییر وضعیت، هزینه نهایی، یادداشت تکنسین)

## ساختار

```
src/
  app/
    (shop)/          صفحات عمومی با هدر و فوتر
      page.tsx       لندینگ (داده‌محور)
      products/      لیست + فیلتر (فیلترها در URL زندگی می‌کنند)
      product/[slug] صفحه محصول
      compare/       مقایسه تا ۴ محصول
      repair/        ثبت و پیگیری تعمیر
      profile/       پنل کاربری
      checkout/      تسویه
      about/         درباره ما + تماس + قوانین
    admin/           پنل مدیریت (لایه‌ی جدا، بدون هدر فروشگاه)
  components/  ui/ layout/ home/ product/ repair/ cart/ admin/
  lib/         api/ fonts.ts format.ts icons.ts utils.ts use-product-filters.ts
  mocks/       handlers.ts db.ts data/ browser.ts node.ts
  store/       cart.ts compare.ts session.ts ui.ts
  types/       catalog.ts order.ts repair.ts user.ts cms.ts
public/
  fonts/       Yekan (400/700) + Vazirmatn variable
  img/         تصاویر SVG جایگزین — با عکس واقعی عوض شوند
```

## کارهای باقی‌مانده برای فاز بعد

- جایگزینی SVGهای `public/img/` با عکس واقعی محصولات
- احراز هویت واقعی (OTP) به‌جای `store/session.ts`
- آپلود تصویر در پنل ادمین (فعلاً مسیر تصویر دستی وارد می‌شود)
- ویرایش مشخصات فنی و تنوع رنگ/حافظه در فرم محصول ادمین
- درگاه پرداخت واقعی در `/checkout`
