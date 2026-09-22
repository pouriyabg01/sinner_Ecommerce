# کانتکست ساخت، پوشه‌ی «front end» است.

# ---------- وابستگی‌ها ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

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
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_API_MOCKING=$NEXT_PUBLIC_API_MOCKING \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

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
