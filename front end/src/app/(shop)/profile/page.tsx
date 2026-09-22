'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Package, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMe, useMyOrders, useMyRepairs } from '@/lib/api/queries'
import { useSession } from '@/store/session'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusChip, RepairStatusChip } from '@/components/ui/status-chip'
import { EmptyState } from '@/components/ui/empty-state'
import { buttonVariants } from '@/components/ui/button'
import { usePagination, type PaginationState } from '@/lib/use-pagination'
import { formatDate, formatPrice, toFaDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

/** پیشخوان فقط مرور سریع است؛ برای دیدن همه‌ی رکوردها صفحه‌ی اختصاصی هست */
const PER_PAGE = 5

export default function ProfileHome() {
  const userId = useSession((s) => s.userId)
  const { data: user } = useMe(userId)
  const { data: orders, isLoading: ordersLoading } = useMyOrders(userId)
  const { data: repairs, isLoading: repairsLoading } = useMyRepairs(userId)

  // با سوییچ حساب لیست عوض می‌شود؛ ماندن روی صفحه‌ی ۳ کاربر قبلی بی‌معنی است
  const orderPages = usePagination(orders ?? [], PER_PAGE, userId)
  const repairPages = usePagination(repairs ?? [], PER_PAGE, userId)

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-border bg-gradient-to-bl from-brand-600 to-brand-800 p-6 text-white">
        {/* سلام‌گویی خودش تیتر صفحه است؛ صفحه بدون h1 نماند */}
        <h1 className="text-xl font-bold sm:text-2xl">سلام {user?.fullName.split(' ')[0] ?? ''} 👋</h1>
        <p className="mt-2 max-w-md text-[12.5px] leading-7 opacity-70">
          سفارش‌ها و درخواست‌های تعمیر شما در یک نگاه
        </p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel title="سفارش‌ها" icon={Package} href="/profile/orders" total={orderPages.total}>
          {ordersLoading ? (
            <RowsSkeleton />
          ) : orderPages.total === 0 ? (
            <EmptyState
              icon={Package}
              className="px-5 py-10"
              title="هنوز سفارشی ثبت نکرده‌اید"
              action={
                <Link href="/products" className={buttonVariants({ variant: 'soft', size: 'sm' })}>
                  شروع خرید
                </Link>
              }
            />
          ) : (
            <>
              <MiniTable head={['سفارش', 'وضعیت', 'مبلغ']}>
                {orderPages.pageItems.map((order) => (
                  <tr key={order.id} className="align-middle">
                    <Cell>
                      <span className="en-code block font-bold">{order.code}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{formatDate(order.createdAt)}</span>
                    </Cell>
                    <Cell>
                      <OrderStatusChip status={order.status} />
                    </Cell>
                    <Cell className="num whitespace-nowrap text-end font-bold">{formatPrice(order.total)}</Cell>
                  </tr>
                ))}
              </MiniTable>
              <MiniPager state={orderPages} label="سفارش" />
            </>
          )}
        </Panel>

        <Panel title="تعمیرات" icon={Wrench} href="/profile/repairs" total={repairPages.total}>
          {repairsLoading ? (
            <RowsSkeleton />
          ) : repairPages.total === 0 ? (
            <EmptyState
              icon={Wrench}
              className="px-5 py-10"
              title="درخواست تعمیری ندارید"
              action={
                <Link href="/repair" className={buttonVariants({ variant: 'soft', size: 'sm' })}>
                  ثبت درخواست
                </Link>
              }
            />
          ) : (
            <>
              <MiniTable head={['درخواست', 'دستگاه', 'وضعیت']}>
                {repairPages.pageItems.map((repair) => (
                  <tr key={repair.id} className="align-middle">
                    <Cell>
                      <span className="en-code block font-bold">{repair.code}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{formatDate(repair.createdAt)}</span>
                    </Cell>
                    {/* نام دستگاه لاتین است؛ با truncate نقطه‌چین در متن راست‌به‌چپ وسط کلمه می‌افتد، پس می‌شکند */}
                    <Cell className="break-words text-muted">
                      {repair.deviceBrand} {repair.deviceModel}
                    </Cell>
                    <Cell>
                      <RepairStatusChip status={repair.status} />
                    </Cell>
                  </tr>
                ))}
              </MiniTable>
              <MiniPager state={repairPages} label="درخواست" />
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

/** کارت هر جدول: تیتر، تعداد کل، و لینک صفحه‌ی کامل */
function Panel({
  title,
  icon: Icon,
  href,
  total,
  children,
}: {
  title: string
  icon: LucideIcon
  href: string
  total: number
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Icon className="size-4 text-brand-500" />
          {title}
          {total > 0 && (
            <span className="num rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {toFaDigits(total)}
            </span>
          )}
        </h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[12px] text-brand-600 dark:text-brand-400"
        >
          همه
          <ArrowLeft className="size-3" />
        </Link>
      </header>
      {children}
    </section>
  )
}

function MiniTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    // دو جدول کنار هم می‌نشینند؛ اگر ستون‌ها جا نشدند خودِ جدول اسکرول شود نه صفحه
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-border bg-surface-2/50">
            {head.map((label) => (
              <th key={label} className="whitespace-nowrap px-3 py-2.5 text-start font-medium text-muted sm:px-4">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}

const Cell = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <td className={cn('px-3 py-3 sm:px-4', className)}>{children}</td>
)

function RowsSkeleton() {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: PER_PAGE }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-xl" />
      ))}
    </div>
  )
}

const pagerButton =
  'grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-brand-400 disabled:pointer-events-none disabled:opacity-35'

/**
 * صفحه‌بندی جمع‌وجور. نسخه‌ی پنل شماره‌ی همه‌ی صفحه‌ها و انتخاب «در هر صفحه» را
 * دارد که در نصفِ عرض صفحه جا نمی‌شود و اینجا هم لازم نیست: تعداد ثابت است.
 */
function MiniPager<T>({ state, label }: { state: PaginationState<T>; label: string }) {
  const { page, totalPages, setPage } = state
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
      {/* «۱ / ۳» ننویس: اسلش بین دو عدد در متن راست‌به‌چپ ترتیب را برعکس نشان می‌دهد */}
      <p className="num text-[11px] text-muted">
        صفحه {toFaDigits(page)} از {toFaDigits(totalPages)}
      </p>

      <nav className="flex items-center gap-1.5" aria-label={`صفحه‌بندی ${label}`}>
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          aria-label="صفحه قبل"
          className={pagerButton}
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          aria-label="صفحه بعد"
          className={pagerButton}
        >
          <ChevronLeft className="size-4" />
        </button>
      </nav>
    </div>
  )
}
