import type { Discount } from '@/types/catalog'

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()
const agoDays = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

export const discounts: Discount[] = [
  {
    id: 'dsc_001',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    productIds: [],
    categoryIds: [],
    userIds: [],
    startsAt: agoDays(30),
    endsAt: inDays(60),
    usageLimit: 1000,
    usedCount: 342,
    active: true,
  },
  {
    id: 'dsc_002',
    code: 'GAMER500',
    type: 'amount',
    value: 500_000,
    productIds: ['prd_008', 'prd_009', 'prd_010'],
    categoryIds: [],
    userIds: [],
    startsAt: agoDays(10),
    endsAt: inDays(6),
    usageLimit: 200,
    usedCount: 118,
    active: true,
  },
  {
    id: 'dsc_003',
    code: 'NOWRUZ1404',
    type: 'percent',
    value: 15,
    productIds: [],
    categoryIds: [],
    userIds: [],
    startsAt: agoDays(180),
    endsAt: agoDays(150),
    usageLimit: 500,
    usedCount: 500,
    active: false,
  },
]
