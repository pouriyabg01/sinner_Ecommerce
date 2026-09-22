'use client'

import { useCallback, useRef, useState } from 'react'
import type { z } from 'zod'
import { toFieldErrors, type FieldErrors } from '@/lib/validation'

/**
 * اعتبارسنجی فرم‌های کنترل‌شده‌ی پروژه، بدون بازنویسی state آن‌ها.
 *
 * جریان کار: `validate(values)` موقع submit صدا زده می‌شود؛ اگر خطا باشد
 * `null` برمی‌گرداند و پیام‌ها زیر ورودی‌ها می‌نشیند. بعد از اولین submit ناموفق،
 * هر تغییر در همان فیلد خطایش را زنده به‌روز می‌کند تا کاربر بفهمد کِی درست شد.
 */
export function useForm<Schema extends z.ZodType>(schema: Schema) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const submitted = useRef(false)

  const validate = useCallback(
    (values: unknown): z.output<Schema> | null => {
      submitted.current = true
      const result = schema.safeParse(values)
      if (result.success) {
        setErrors({})
        return result.data
      }
      setErrors(toFieldErrors(result.error))
      return null
    },
    [schema],
  )

  /** بعد از تلاش اول برای ثبت، خطاها را با هر تغییر دوباره حساب می‌کند */
  const revalidate = useCallback(
    (values: unknown) => {
      if (!submitted.current) return
      const result = schema.safeParse(values)
      setErrors(result.success ? {} : toFieldErrors(result.error))
    },
    [schema],
  )

  const reset = useCallback(() => {
    submitted.current = false
    setErrors({})
  }, [])

  /**
   * نشاندن خطایی که سمت سرور کشف شده (مثل «این ایمیل قبلاً ثبت شده»).
   * چنین خطایی از schema درنمی‌آید، ولی باید زیر همان فیلد دیده شود.
   */
  const setError = useCallback((field: string, message: string) => {
    submitted.current = true
    setErrors((prev) => ({ ...prev, [field]: message }))
  }, [])

  /** خطای یک فیلد را دستی پاک می‌کند — برای وقتی که مقدار جدید هنوز کامل نیست */
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  return { errors, validate, revalidate, reset, setError, clearError }
}
