'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, BellOff } from 'lucide-react'
import { useStockAlerts, useToggleStockAlert } from '@/lib/api/queries'
import { MOCKING_ENABLED } from '@/lib/api/config'
import { useSession } from '@/store/session'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

/**
 * جای دکمه‌ی خرید روی مدل ناموجود. مشتری به‌جای دکمه‌ی غیرفعال راه برگشت دارد: وقتی
 * ادمین موجودی را برگرداند، اگر پیامک روشن باشد خبرش می‌کنیم و در «خبرم کن» پروفایل هم می‌بیند.
 */
export function StockAlertButton({ productId, variantTitle }: { productId: string; variantTitle: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const token = useSession((s) => s.token)
  const signedIn = MOCKING_ENABLED || Boolean(token)
  const { data: alerts } = useStockAlerts()
  const toggle = useToggleStockAlert()
  const alert = alerts?.find((a) => a.productId === productId && a.variantTitle === variantTitle && !a.notifiedAt)

  return (
    <Button
      size="lg"
      variant={alert ? 'soft' : 'primary'}
      className="flex-1"
      loading={toggle.isPending}
      onClick={() => {
        // خبر دادن شماره‌ی موبایل می‌خواهد؛ مهمان بعد از ورود به همین صفحه برمی‌گردد
        if (!signedIn) return router.push(`/login?next=${encodeURIComponent(pathname)}`)
        toggle.mutate(
          { alert, productId, variantTitle },
          {
            onSuccess: () => toast.success(alert ? 'اطلاع‌رسانی لغو شد' : 'به‌محض موجود شدن خبرتان می‌کنیم'),
            onError: (error) => toast.error(error.message),
          },
        )
      }}
    >
      {alert ? <BellOff className="size-4.5" /> : <Bell className="size-4.5" />}
      {alert ? 'خبرتان می‌کنیم — لغو' : 'موجود شد خبرم کن'}
    </Button>
  )
}
