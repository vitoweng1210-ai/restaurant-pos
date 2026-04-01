import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type MenuStation = 'main' | 'side' | 'dessert_drink'

type OrderRow = {
  id: string
  table_id: string | null
  status: string | null
  created_at: string | null
  kds_sent_at: string | null
  total: number | null
  payment_method: string | null
  paid_at: string | null
}

type TableRow = {
  id: string
  name: string
}

type OrderItemRow = {
  id: string
  order_id: string
  menu_id: string | null
  qty: number | null
  price: number | null
  batch_id: string | null
}

type OrderBatchRow = {
  id: string
  order_id: string
  batch_no: number
  created_at: string | null
  printed_at: string | null
  status: string | null
  started_at: string | null
  ready_at: string | null
  served_at: string | null
}

type MenuRow = {
  id: string
  name: string
  station?: string | null
  category_id?: string | null
}

type CategoryRow = {
  id: string
  name: string
}

const DRINK_DESSERT_KEYWORDS = [
  '飲',
  '甜',
  'drink',
  'dessert',
  'bar',
  'tea',
  'coffee',
  '紅茶',
  '綠茶',
  '奶茶',
  '咖啡',
  '可樂',
  '雪碧',
  '汽水',
  '果汁',
  '冰沙',
  '甜點',
  '蛋糕',
]

const SIDE_KEYWORDS = [
  '附餐',
  'side',
  '薯條',
  '麵包',
  '濃湯',
  '沙拉',
  '前菜',
  '小點',
]

function normalizeStatus(status?: string | null) {
  return (status || '').trim().toLowerCase()
}

function inferStation(name?: string | null, categoryName?: string | null): MenuStation {
  const text = `${name || ''} ${categoryName || ''}`.toLowerCase()

  if (DRINK_DESSERT_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return 'dessert_drink'
  }

  if (SIDE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return 'side'
  }

  return 'main'
}

function normalizeStation(
  rawStation?: string | null,
  itemName?: string | null,
  categoryName?: string | null
): MenuStation {
  const value = (rawStation || '').trim().toLowerCase()

  if (value === 'main') return 'main'
  if (value === 'side') return 'side'
  if (value === 'dessert_drink') return 'dessert_drink'
  if (value === 'dessert-drink') return 'dessert_drink'

  return inferStation(itemName, categoryName)
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    const view = searchParams.get('view') || 'all'
    const batchStatusFilter =
      view === 'open'
        ? ['new', 'preparing', 'ready']
        : view === 'paid'
        ? ['served']
        : null

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, table_id, status, created_at, kds_sent_at, total, payment_method, paid_at')
      .order('created_at', { ascending: false })

    if (ordersError) {
      return NextResponse.json(
        { error: `讀取 orders 失敗：${ordersError.message}` },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]

    if (orders.length === 0) {
      return NextResponse.json([])
    }

    const orderIds = orders.map((o) => o.id)
    const tableIds = Array.from(new Set(orders.map((o) => o.table_id).filter(Boolean))) as string[]

    let batchQuery = supabase
      .from('order_batches')
      .select('id, order_id, batch_no, created_at, printed_at, status, started_at, ready_at, served_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })

    if (batchStatusFilter) {
      batchQuery = batchQuery.in('status', batchStatusFilter)
    }

    const { data: batchData, error: batchError } = await batchQuery

    if (batchError) {
      return NextResponse.json(
        { error: `讀取 order_batches 失敗：${batchError.message}` },
        { status: 500 }
      )
    }

    const batches = (batchData || []) as OrderBatchRow[]

    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id, order_id, menu_id, qty, price, batch_id')
      .in('order_id', orderIds)

    if (orderItemsError) {
      return NextResponse.json(
        { error: `讀取 order_items 失敗：${orderItemsError.message}` },
        { status: 500 }
      )
    }

    const orderItems = (orderItemsData || []) as OrderItemRow[]

    const menuIds = Array.from(
      new Set(orderItems.map((item) => item.menu_id).filter(Boolean))
    ) as string[]

    let menuMap = new Map<string, MenuRow>()
    if (menuIds.length > 0) {
      const { data: menuData, error: menuError } = await supabase
        .from('menu')
        .select('id, name, station, category_id')
        .in('id', menuIds)

      if (menuError) {
        return NextResponse.json(
          { error: `讀取 menu 失敗：${menuError.message}` },
          { status: 500 }
        )
      }

      menuMap = new Map((menuData || []).map((row: any) => [row.id, row as MenuRow]))
    }

    const categoryIds = Array.from(
      new Set(
        Array.from(menuMap.values())
          .map((m) => m.category_id)
          .filter(Boolean)
      )
    ) as string[]

    let categoryMap = new Map<string, CategoryRow>()
    if (categoryIds.length > 0) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds)

      if (categoriesError) {
        return NextResponse.json(
          { error: `讀取 categories 失敗：${categoriesError.message}` },
          { status: 500 }
        )
      }

      categoryMap = new Map(
        (categoriesData || []).map((row: any) => [row.id, row as CategoryRow])
      )
    }

    let tableMap = new Map<string, TableRow>()
    if (tableIds.length > 0) {
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('id, name')
        .in('id', tableIds)

      if (tablesError) {
        return NextResponse.json(
          { error: `讀取 tables 失敗：${tablesError.message}` },
          { status: 500 }
        )
      }

      tableMap = new Map((tablesData || []).map((row: any) => [row.id, row as TableRow]))
    }

    const orderMap = new Map(orders.map((order) => [order.id, order]))

    const itemsByBatchId = new Map<
      string,
      Array<{
        id: string
        menu_id: string | null
        name: string
        qty: number
        price: number
        station: MenuStation
      }>
    >()

    for (const item of orderItems) {
      if (!item.batch_id) continue

      const menu = item.menu_id ? menuMap.get(item.menu_id) : null
      const category = menu?.category_id ? categoryMap.get(menu.category_id) : null

      const normalizedItem = {
        id: item.id,
        menu_id: item.menu_id,
        name: menu?.name || '未知品項',
        qty: item.qty || 0,
        price: item.price || 0,
        station: normalizeStation(menu?.station, menu?.name, category?.name),
      }

      const current = itemsByBatchId.get(item.batch_id) || []
      current.push(normalizedItem)
      itemsByBatchId.set(item.batch_id, current)
    }

    const result = batches
      .map((batch) => {
        const order = orderMap.get(batch.order_id)
        if (!order) return null

        return {
          id: batch.id,
          order_id: order.id,
          batch_id: batch.id,
          batch_no: batch.batch_no,
          table_id: order.table_id,
          table_name: order.table_id
            ? tableMap.get(order.table_id)?.name || '未指定桌位'
            : '未指定桌位',
          status: normalizeStatus(batch.status) || 'new',
          created_at: batch.created_at || order.kds_sent_at || order.created_at,
          kds_sent_at: batch.created_at || order.kds_sent_at || order.created_at,
          total: order.total || 0,
          payment_method: order.payment_method,
          paid_at: order.paid_at,
          items: itemsByBatchId.get(batch.id) || [],
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row && row.items.length > 0))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || '讀取 admin orders 失敗',
      },
      { status: 500 }
    )
  }
}