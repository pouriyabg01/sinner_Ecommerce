import { MOCKING_ENABLED } from '@/lib/api/config'
import { uploadApi } from '@/lib/api/endpoints'

/**
 * تصویر انتخابی کاربر را به آدرسی تبدیل می‌کند که بشود همه‌جا نمایش داد.
 *
 * با بک‌اند واقعی فایل آپلود می‌شود و فقط آدرسش ذخیره می‌ماند. در حالت mock
 * سرویس آپلودی وجود ندارد، پس همان data URL ساخته می‌شود — که برای دمو کار
 * می‌کند ولی چند صد کیلوبایت base64 داخل JSON می‌گذارد و برای تولید مناسب نیست.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

export async function uploadImage(file: File): Promise<string> {
  if (MOCKING_ENABLED) return readAsDataUrl(file)

  const { url } = await uploadApi.image(file)

  return url
}
