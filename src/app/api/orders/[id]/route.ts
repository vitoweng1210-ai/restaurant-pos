import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    const { data: table } = await supabase
      .from('tables')
      .select('id,name')
      .eq('id', order.table_id)
      .maybeSingle()

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('id', { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: '讀取 order_items 失敗' }, { status: 500 })
    }

    const menuIds = [...new Set((items || []).map((x) => x.menu_id).filter(Boolean))]

    const { data: menuRows, error: menuError } = await supabase
      .from('menu')
      .select('id,name,station')
      .in('id', menuIds.length > 0 ? menuIds : ['__never__'])

    if (menuError) {
      return NextResponse.json({ error: '讀取 menu 失敗' }, { status: 500 })
    }

    const menuMap = new Map(
      (menuRows || []).map((m) => [
        m.id,
        {
          name: m.name,
          station: m.station || 'main',
        },
      ])
    )

    const itemsWithMenu = (items || []).map((item) => {
      const menu = menuMap.get(item.menu_id)
      return {
        ...item,
        name: menu?.name || '未知商品',
        station: menu?.station || 'main',
      }
    })

    return NextResponse.json({
      ...order,
      table_name: table?.name || '外帶',
      items: itemsWithMenu,
    })
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const supabase = await createClient()

    const allowedStatuses = ['new', 'preparing', 'ready', 'served', 'paid'] as const
    const nextStatus = String(body?.status || '').trim().toLowerCase()

    if (!allowedStatuses.includes(nextStatus as (typeof allowedStatuses)[number])) {
      return NextResponse.json({ error: '無效的狀態' }, { status: 400 })
    }

    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id,status')
      .eq('id', id)
      .single()

    if (findError || !order) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', id)
      .select('id,status')
      .single()

    if (error || !data) {
      console.error('PATCH /api/orders/[id] update error:', error)
      return NextResponse.json({ error: '更新失敗' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      status: data.status,
    })
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}