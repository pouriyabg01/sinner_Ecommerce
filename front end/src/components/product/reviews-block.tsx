'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Star, ThumbsDown, ThumbsUp, BadgeCheck, MessageSquarePlus } from 'lucide-react'
import { motion } from 'motion/react'
import { useAddReview, useMe, useProductReviews, useVoteReview } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Rating } from '@/components/ui/rating'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { timeAgo, toFaDigits } from '@/lib/format'
import type { ReviewVote } from '@/lib/api/endpoints'
import { useSession } from '@/store/session'
import { useForm } from '@/lib/use-form'
import { requiredText } from '@/lib/validation'
import { cn } from '@/lib/utils'

/** هر خط یک مورد؛ خط خالی و فاصله‌ی اضافه دور ریخته می‌شود */
const toList = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const listField = (label: string) =>
  z
    .string()
    .refine((v) => toList(v).length <= 5, { message: `${label}: حداکثر ۵ مورد` })
    .refine((v) => toList(v).every((item) => item.length <= 60), { message: `${label}: هر مورد حداکثر ۶۰ حرف` })

const reviewSchema = z.object({
  rating: z.number().min(1, { message: 'لطفاً امتیاز خود را با ستاره‌ها مشخص کنید' }).max(5),
  userName: requiredText('نام شما', 2),
  title: requiredText('عنوان نظر', 3),
  body: requiredText('متن نظر', 10),
  pros: listField('نقاط قوت'),
  cons: listField('نقاط ضعف'),
})

/** رأی‌های همین مرورگر، تا دکمه‌ها بدانند قبلاً چه رأیی داده شده */
const VOTES_KEY = 'sinner-review-votes'

export function ReviewsBlock({ slug }: { slug: string }) {
  const { data, isLoading } = useProductReviews(slug)
  const addReview = useAddReview(slug)
  const voteReview = useVoteReview(slug)
  const userId = useSession((state) => state.userId)
  const { data: user } = useMe(userId)
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [guestName, setGuestName] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pros, setPros] = useState('')
  const [cons, setCons] = useState('')
  const form = useForm(reviewSchema)

  /** رأی‌ها در localStorage‌اند و روی سرور خوانده نمی‌شوند؛ بعد از hydrate پر می‌شوند */
  const [myVotes, setMyVotes] = useState<Record<string, ReviewVote>>({})
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(VOTES_KEY) ?? '{}')
      if (saved && typeof saved === 'object') setMyVotes(saved as Record<string, ReviewVote>)
    } catch {
      // حافظه‌ی مرورگر بسته است؛ دکمه‌ها بدون حالتِ ذخیره‌شده کار می‌کنند
    }
  }, [])

  const vote = (reviewId: string, direction: ReviewVote) =>
    voteReview.mutate(
      { reviewId, vote: direction },
      {
        onSuccess: (result) =>
          setMyVotes((prev) => {
            const next = { ...prev }
            if (result.myVote) next[reviewId] = result.myVote
            else delete next[reviewId]
            try {
              localStorage.setItem(VOTES_KEY, JSON.stringify(next))
            } catch {
              // ذخیره نشد؛ فقط تا وقتی صفحه باز است یادش می‌ماند
            }
            return next
          }),
        onError: (error) => toast.error(error.message),
      },
    )

  if (isLoading) return <Skeleton className="h-64 rounded-card" />

  const total = data?.total ?? 0
  const values = { rating, userName: user?.fullName ?? guestName, title, body, pros, cons }
  const patch = (next: Partial<typeof values>) => form.revalidate({ ...values, ...next })

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-card border border-border bg-surface p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="text-center">
          <p className="num text-4xl font-bold">{toFaDigits((data?.average ?? 0).toFixed(1))}</p>
          <Rating value={data?.average ?? 0} showValue={false} className="mt-2 justify-center" />
          <p className="num mt-1.5 text-xs text-muted">از {toFaDigits(total)} نظر</p>
        </div>

        <div className="space-y-1.5">
          {(data?.breakdown ?? []).map((row) => {
            const percent = total ? (row.count / total) * 100 : 0
            return (
              <div key={row.star} className="flex items-center gap-2.5">
                <span className="num flex w-8 items-center gap-1 text-[11px] text-muted">
                  {toFaDigits(row.star)}
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <motion.span
                    className="block h-full rounded-full bg-amber-400"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </span>
                <span className="num w-6 text-[11px] text-muted">{toFaDigits(row.count)}</span>
              </div>
            )
          })}
        </div>

        <Button variant="soft" onClick={() => setOpen((o) => !o)}>
          <MessageSquarePlus className="size-4" />
          ثبت نظر
        </Button>
      </div>

      {open && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={(e) => {
            e.preventDefault()
            const clean = form.validate(values)
            if (!clean) return
            addReview.mutate(
              {
                rating: clean.rating,
                userName: clean.userName,
                title: clean.title,
                body: clean.body,
                pros: toList(clean.pros),
                cons: toList(clean.cons),
              },
              {
                onSuccess: (res) => {
                  toast.success(res.message)
                  setOpen(false)
                  setTitle('')
                  setBody('')
                  setPros('')
                  setCons('')
                  form.reset()
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }}
          className="space-y-4 overflow-hidden rounded-card border border-border bg-surface p-6"
        >
          <div className="space-y-2">
            <span className="text-[13px] font-medium">امتیاز شما</span>
            {form.errors.rating && (
              <p role="alert" className="text-xs text-red-500">
                {form.errors.rating}
              </p>
            )}
            <div className="flex gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setRating(star)
                    patch({ rating: star })
                  }}
                  aria-label={`${star} ستاره`}
                  className="transition-transform hover:scale-115"
                >
                  <Star
                    className={cn(
                      'size-7',
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-ink-300 dark:text-ink-700',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          {/* کاربر واردشده نامش را از حساب می‌گیرد؛ پیش‌تر همه‌ی نظرها با یک نام ثابت ثبت می‌شد */}
          {!user && (
            <Field label="نام شما" required error={form.errors.userName}>
              <Input
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value)
                  patch({ userName: e.target.value })
                }}
                invalid={Boolean(form.errors.userName)}
                placeholder="مثلاً: رضا م."
              />
            </Field>
          )}
          <Field label="عنوان نظر" required error={form.errors.title}>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                patch({ title: e.target.value })
              }}
              invalid={Boolean(form.errors.title)}
              placeholder="مثلاً: ارزش خرید را داشت"
            />
          </Field>
          <Field
            label="متن نظر"
            required
            hint="تجربه‌ی واقعی خود از استفاده‌ی این کالا را بنویسید — حداقل ۱۰ حرف."
            error={form.errors.body}
          >
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                patch({ body: e.target.value })
              }}
              invalid={Boolean(form.errors.body)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نقاط قوت" hint="هر مورد در یک خط — اختیاری" error={form.errors.pros}>
              <Textarea
                value={pros}
                onChange={(e) => {
                  setPros(e.target.value)
                  patch({ pros: e.target.value })
                }}
                invalid={Boolean(form.errors.pros)}
                className="min-h-24"
                placeholder={'کارایی بالا\nصفحه ۲۴۰ هرتز'}
              />
            </Field>
            <Field label="نقاط ضعف" hint="هر مورد در یک خط — اختیاری" error={form.errors.cons}>
              <Textarea
                value={cons}
                onChange={(e) => {
                  setCons(e.target.value)
                  patch({ cons: e.target.value })
                }}
                invalid={Boolean(form.errors.cons)}
                className="min-h-24"
                placeholder={'صدای فن\nباتری کم'}
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <Button type="submit" loading={addReview.isPending}>
              ثبت نظر
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
          </div>
        </motion.form>
      )}

      {total === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState icon={MessageSquarePlus} title="هنوز نظری ثبت نشده" description="اولین نفری باشید که تجربه‌ی خود را ثبت می‌کند." />
        </div>
      ) : (
        <ul className="space-y-3">
          {data?.items.map((review, i) => (
            <motion.li
              key={review.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-card border border-border bg-surface p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-brand-500/10 text-[13px] font-bold text-brand-600 dark:text-brand-400">
                  {review.userName.charAt(0)}
                </span>
                <span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold">
                    {review.userName}
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-normal text-brand-600 dark:text-brand-400">
                        <BadgeCheck className="size-3.5" />
                        خرید تأییدشده
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-muted">{timeAgo(review.createdAt)}</span>
                </span>
                <Rating value={review.rating} showValue={false} className="ms-auto" />
              </div>

              <h4 className="mb-1.5 text-sm font-bold">{review.title}</h4>
              <p className="text-[13px] leading-8 text-muted">{review.body}</p>

              {(review.pros.length > 0 || review.cons.length > 0) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {review.pros.length > 0 && (
                    <div className="rounded-xl bg-emerald-500/7 p-3">
                      <p className="mb-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">نقاط قوت</p>
                      <ul className="space-y-1 text-[12px] text-muted">
                        {review.pros.map((p) => (
                          <li key={p}>+ {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.cons.length > 0 && (
                    <div className="rounded-xl bg-red-500/6 p-3">
                      <p className="mb-1.5 text-[11px] font-bold text-red-600 dark:text-red-400">نقاط ضعف</p>
                      <ul className="space-y-1 text-[12px] text-muted">
                        {review.cons.map((c) => (
                          <li key={c}>− {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/*
                رأی برگشت‌پذیر است: همان دکمه یعنی پس گرفتن رأی و دکمه‌ی دیگر
                یعنی برگرداندنش. هر بازدیدکننده روی هر نظر یک رأی دارد.
              */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[11px] text-muted">این نظر مفید بود؟</span>
                {(
                  [
                    { dir: 'up' as const, icon: ThumbsUp, count: review.helpfulCount, label: 'پسندیدم' },
                    { dir: 'down' as const, icon: ThumbsDown, count: review.notHelpfulCount, label: 'نپسندیدم' },
                  ]
                ).map(({ dir, icon: Icon, count, label }) => {
                  const active = myVotes[review.id] === dir
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => vote(review.id, dir)}
                      disabled={voteReview.isPending}
                      aria-pressed={active}
                      aria-label={label}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors disabled:opacity-60',
                        active
                          ? dir === 'up'
                            ? 'border-brand-500/40 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                            : 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'border-border text-muted hover:border-brand-500/40 hover:text-brand-600',
                      )}
                    >
                      <Icon className={cn('size-3.5', active && 'fill-current')} />
                      <span className="num">{toFaDigits(count)}</span>
                    </button>
                  )
                })}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
