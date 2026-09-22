/**
 * MSW را در سمت سرور هم بالا می‌آورد تا Server Component ها بتوانند
 * دقیقاً همان endpoint هایی را fetch کنند که مرورگر می‌زند.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if ((process.env.NEXT_PUBLIC_API_MOCKING ?? 'enabled') === 'disabled') return

  const { server } = await import('./mocks/node')
  server.listen({ onUnhandledRequest: 'bypass' })
}
