import type { Category } from '@/types/catalog'

/** هر چیزی که جای خودش را در درخت دارد؛ هم `Category` و هم نسخه‌ی شمارش‌دارش */
type Branchy = Pick<Category, 'id'> & { parentId?: string | null }

export interface CategoryNode<T> {
  item: T
  /** صفر برای دسته‌ی اصلی، یک برای زیرمجموعه، و همین‌طور پایین‌تر */
  depth: number
  children: CategoryNode<T>[]
}

/**
 * فهرست تختِ دسته‌ها را به درخت تبدیل می‌کند.
 *
 * دسته‌ای که مادرش در فهرست نیست — پاک شده یا فهرست فیلتر شده — خودش ریشه
 * حساب می‌شود تا شاخه‌اش گم نشود. ترتیب هر سطح همان ترتیب ورودی می‌ماند.
 */
export function buildCategoryTree<T extends Branchy>(items: T[]): CategoryNode<T>[] {
  const known = new Set(items.map((item) => item.id))
  const byParent = new Map<string, T[]>()
  const roots: T[] = []

  for (const item of items) {
    const parentId = item.parentId
    if (!parentId || !known.has(parentId)) {
      roots.push(item)
      continue
    }
    const siblings = byParent.get(parentId)
    if (siblings) siblings.push(item)
    else byParent.set(parentId, [item])
  }

  /*
   * درخت سقف عمق ندارد، پس یک ردیف حلقه‌دار (اگر از راهی جز پنل ساخته شود)
   * می‌توانست رندر را بی‌پایان کند؛ هر دسته فقط یک‌بار جا می‌گیرد.
   */
  const placed = new Set<string>()
  const grow = (item: T, depth: number): CategoryNode<T> => {
    placed.add(item.id)
    const children = (byParent.get(item.id) ?? [])
      .filter((child) => !placed.has(child.id))
      .map((child) => grow(child, depth + 1))

    return { item, depth, children }
  }

  return roots.map((root) => grow(root, 0))
}

/** درخت به فهرست تخت، به همان ترتیبی که دیده می‌شود: هر مادر و بلافاصله شاخه‌اش */
export function flattenCategoryTree<T>(nodes: CategoryNode<T>[]): CategoryNode<T>[] {
  return nodes.flatMap((node) => [node, ...flattenCategoryTree(node.children)])
}

/**
 * شناسه‌ی خودِ دسته به‌همراه همه‌ی زیرشاخه‌هایش.
 *
 * برای انتخاب مادر لازم است: دسته نباید زیر یکی از زیرشاخه‌های خودش برود،
 * وگرنه آن شاخه از ریشه جدا می‌افتد و هیچ‌جای سایت دیده نمی‌شود.
 */
export function branchIds<T extends Branchy>(items: T[], rootId: string): Set<string> {
  const node = flattenCategoryTree(buildCategoryTree(items)).find((candidate) => candidate.item.id === rootId)

  return new Set(node ? flattenCategoryTree([node]).map((child) => child.item.id) : [rootId])
}

/** یک تکه‌ی ستونِ منو: یک زیرمجموعه به‌عنوان عنوان، و لینک‌های زیرِ آن */
export interface MenuGroup<T> {
  key: string
  head: T
  /** یعنی دنباله‌ی گروهی است که در ستون قبل جا نشد */
  continued: boolean
  items: T[]
}

/**
 * گروه‌ها را در ستون‌هایی می‌چیند که هیچ‌کدام از `limit` سطر بیشتر نشوند.
 *
 * عنوان گروه خودش یک سطر حساب می‌شود. گروهی که در جای باقی‌مانده جا نمی‌شود
 * ولی در یک ستون خالی جا می‌شود، دست‌نخورده به ستون بعد می‌رود؛ فقط گروهی که
 * به‌تنهایی از سقف بلندتر است بین دو ستون شکسته می‌شود و دنباله‌اش عنوان را
 * دوباره می‌گیرد تا معلوم باشد زیرِ چیست.
 */
export function packColumns<T>(groups: MenuGroup<T>[], limit: number): MenuGroup<T>[][] {
  const columns: MenuGroup<T>[][] = []
  let column: MenuGroup<T>[] = []
  let used = 0

  const flush = () => {
    if (column.length) columns.push(column)
    column = []
    used = 0
  }

  for (const group of groups) {
    const height = 1 + group.items.length
    if (used > 0 && used + height > limit && height <= limit) flush()

    let rest = group.items
    let continued = false

    do {
      // عنوانِ لینک‌دار دست‌کم دو سطر می‌خواهد تا تنها و بی‌شاخه ته ستون نیفتد
      if (used > 0 && limit - used < (rest.length ? 2 : 1)) flush()

      const take = rest.slice(0, limit - used - 1)
      column.push({ ...group, continued, items: take })
      used += 1 + take.length
      rest = rest.slice(take.length)
      continued = true

      if (rest.length) flush()
    } while (rest.length)
  }

  flush()

  return columns
}
