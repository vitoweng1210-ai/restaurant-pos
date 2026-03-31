import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OrderRow = {
  id: string
  table_id: string | null
  status: string
  total: number
  created_at: string
}

type OrderItemRow = {
  id: string
  order_id: string
  menu_id: string
  qty: number
  price: number
}

type MenuRow = {
  id: string
  name: string
  station?: string
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: table } = await supabase
      .from('tables')
      .select('id,name')
      .eq('id', id)
      .single()

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, table_id, status, total, created_at')
      .eq('table_id', id)
      .neq('status', 'paid')
      .order('created_at', { ascending: true })

    if (ordersError) {
      return NextResponse.json({ error: '讀取訂單失敗' }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(null)
    }

    const orderRows = orders as OrderRow[]
    const orderIds = orderRows.map((order) => order.id)

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, order_id, menu_id, qty, price')
      .in('order_id', orderIds)

    if (itemsError) {
      return NextResponse.json({ error: '讀取訂單明細失敗' }, { status: 500 })
    }

    const { data: menu } = await supabase
      .from('menu')
      .select('id, name, station')

    const menuRows = (menu || []) as MenuRow[]
    const itemRows = (orderItems || []) as OrderItemRow[]

    const mergedItemsMap = new Map<
      string,
      {
        id: string
        menu_id: string
        name: string
        qty: number
        price: number
        station?: string
      }
    >()

    for (const item of itemRows) {
      const foundMenu = menuRows.find((m) => m.id === item.menu_id)
      const key = item.menu_id

      if (mergedItemsMap.has(key)) {
        const prev = mergedItemsMap.get(key)!
        mergedItemsMap.set(key, {
          ...prev,
          qty: prev.qty + Number(item.qty || 0),
        })
      } else {
        mergedItemsMap.set(key, {
          id: item.id,
          menu_id: item.menu_id,
          name: foundMenu?.name || '未知品項',
          qty: Number(item.qty || 0),
          price: Number(item.price || 0),
          station: foundMenu?.station || 'main',
        })
      }
    }

    const total = orderRows.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    )

    const mergedStatus = orderRows.some((order) => order.status === 'new')
      ? 'new'
      : orderRows.some((order) => order.status === 'preparing')
      ? 'preparing'
      : orderRows.some((order) => order.status === 'ready')
      ? 'ready'
      : orderRows.some((order) => order.status === 'served')
      ? 'served'
      : 'occupied'

    return NextResponse.json({
      id: orderRows[orderRows.length - 1].id,
      table_id: id,
      table_name: table?.name || '未指定桌位',
      status: mergedStatus,
      total,
      created_at: orderRows[0].created_at,
      items: Array.from(mergedItemsMap.values()),
    })
  } catch {
    return NextResponse.json({ error: '讀取訂單失敗' }, { status: 500 })
  }
}