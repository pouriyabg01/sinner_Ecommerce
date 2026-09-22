/**
 * انتقال مرورگر به درگاه بانک.
 *
 * درگاه‌های ایرانی یکدست نیستند: بعضی با یک آدرس GET باز می‌شوند و بعضی
 * فیلدهای مخفی را با POST می‌خواهند. سرور هر دو حالت را به یک شکل برمی‌گرداند
 * و اینجا فرم واقعی ساخته و submit می‌شود — چون ریدایرکت ساده برای حالت POST
 * کار نمی‌کند و کاربر به صفحه‌ی خطای بانک می‌رسید.
 */
export function redirectToGateway(form: {
  action: string
  method: 'GET' | 'POST'
  inputs: Record<string, string>
}) {
  const el = document.createElement('form')
  el.method = form.method
  el.action = form.action
  // بعضی درگاه‌ها مقدار فارسی (توضیح سفارش) می‌گیرند و بدون این، خراب می‌رسد
  el.acceptCharset = 'UTF-8'
  el.style.display = 'none'

  for (const [name, value] of Object.entries(form.inputs ?? {})) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = String(value ?? '')
    el.appendChild(input)
  }

  document.body.appendChild(el)
  el.submit()
}
