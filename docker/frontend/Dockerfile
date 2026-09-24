# کانتکست ساخت، پوشه‌ی «front end» است.

# ---------- وابستگی‌ها ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# کش npm بین ساخت‌ها می‌ماند؛ اگر فهرست بسته‌ها عوض شود، فقط تفاوتش دانلود می‌شود.
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- ساخت ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# متغیرهای NEXT_PUBLIC هنگام ساخت داخل کد مرورگر جاسازی می‌شوند، پس باید
# همین‌جا داده شوند؛ عوض کردنشان یعنی ساخت دوباره‌ی تصویر.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_MOCKING=disabled
ARG NEXT_PUBLIC_SITE_URL
# مقصدِ پلِ /storage در next.config — آن هم هنگام ساخت در مسیرها جاسازی می‌شود،
# پس مثل متغیرهای بالا باید همین‌جا داده شود نه موقع اجرا.
ARG INTERNAL_ORIGIN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_API_MOCKING=$NEXT_PUBLIC_API_MOCKING \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    INTERNAL_ORIGIN=$INTERNAL_ORIGIN \
    NEXT_TELEMETRY_DISABLED=1

# کش ساخت Next بین دفعه‌ها نگه داشته می‌شود. بدون این، هر بار کل صفحه‌ها از
# صفر ترجمه می‌شدند و روی سرور دوهسته‌ای نیم ساعت طول می‌کشید.
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ---------- اجرا ----------
# خروجی standalone فقط همان چند مگابایتی را دارد که واقعاً لازم است؛
# node_modules کامل (نزدیک ۵۰۰ مگابایت) وارد تصویر نهایی نمی‌شود.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
