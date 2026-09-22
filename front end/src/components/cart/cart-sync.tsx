'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/lib/api/endpoints'
import { useCart, type CartLine } from '@/store/cart'
import { useHydrated } from '@/lib/use-hydrated'
import { toast } from '@/components/ui/toast'
import { formatPrice, toFaDigits } from '@/lib/format'

export const CART_SYNC_KEY = 'cart-sync'

/**
 * سبد خرید در مرورگر ذخیره می‌شود و ممکن است از واقعیت عقب بیفتد: کالا حذف یا غیرفعال
 * شده، ناموجود شده یا قیمتش عوض شده. این کامپوننت هر بار که صفحه باز می‌شود، کاربر به
 * تب برمی‌گردد، سبد باز می‌شود و هر یک دقیقه، کالاهای سبد را با سرور می‌سنجد، سبد را
 * اصلاح می‌کند و هر تغییر را به کاربر می‌گوید — به‌جای اینکه در مرحله‌ی پرداخت غافلگیر شود.
 */
export function CartSync() {
  const hydrated = useHydrated()
  const lines = useCart((s) => s.lines)
  const isOpen = useCart((s) => s.isOpen)
  // فهرست مرتب‌شده تا عوض شدن فقط تعداد یک ردیف، درخواست تازه نسازد
  const productIds = useMemo(() => [...new Set(lines.map((l) => l.productId))].sort(), [lines])

  const { data, refetch } = useQuery({
    queryKey: [CART_SYNC_KEY, productIds],
    // فروشگاه فقط کالای قابل نمایش را برمی‌گرداند؛ کالای حذف‌شده، غیرفعال یا بی‌دسته در پاسخ نیست
    queryFn: () => catalogApi.list({ ids: productIds, perPage: 100 }),
    enabled: hydrated && productIds.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (isOpen && productIds.length) void refetch()
  }, [isOpen, productIds.length, refetch])

  useEffect(() => {
    if (!data) return
    const products = new Map(data.items.map((p) => [p.id, p]))
    const checked = new Set(productIds)
    const current = useCart.getState().lines
    const notes: { text: string; removed: boolean }[] = []
    let changed = false

    const next = current.flatMap((line): CartLine[] => {
      // ردیفی که بعد از شروع این درخواست اضافه شده، در این نوبت سنجیده نمی‌شود
      if (!checked.has(line.productId)) return [line]

      const name = line.variantTitle ? `${line.title} (${line.variantTitle})` : line.title
      const variant = products.get(line.productId)?.variants.find((v) => v.id === line.variantId)

      if (!variant) {
        changed = true
        notes.push({ text: `«${name}» دیگر در فروشگاه عرضه نمی‌شود و از سبد خرید حذف شد`, removed: true })
        return []
      }
      if (variant.stock <= 0) {
        changed = true
        notes.push({ text: `«${name}» ناموجود شد و از سبد خرید حذف شد`, removed: true })
        return []
      }

      let updated = line
      if (line.quantity > variant.stock) {
        notes.push({
          text: `از «${name}» فقط ${toFaDigits(variant.stock)} عدد موجود است؛ تعدادش در سبد کم شد`,
          removed: false,
        })
        updated = { ...updated, quantity: variant.stock }
      }
      if (variant.price !== line.unitPrice) {
        notes.push({ text: `قیمت «${name}» به ${formatPrice(variant.price)} تغییر کرد`, removed: false })
        updated = { ...updated, unitPrice: variant.price }
      }
      if (variant.stock !== line.maxStock) updated = { ...updated, maxStock: variant.stock }
      if (updated !== line) changed = true
      return [updated]
    })

    if (!changed) return
    useCart.getState().replaceLines(next)
    notes.forEach((note) => (note.removed ? toast.error(note.text) : toast.info(note.text)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return null
}
