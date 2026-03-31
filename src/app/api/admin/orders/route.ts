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

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)

    const { data: menu } = await supabase
      .from('menu')
      .select('id,name,station')

    const items = (orderItems || []).map((item) => {
      const foundMenu = menu?.find((m) => m.id === item.menu_id)

      return {
        id: item.id,
        name: foundMenu?.name || '未知品項',
        qty: item.qty,
        station: foundMenu?.station || 'main',
      }
    })

    return NextResponse.json({
      order_id: order.id,
      table_name: table?.name || '未指定桌位',
      created_at: order.created_at,
      status: order.status,
      groups: {
        main: items.filter((item) => item.station === 'main'),
        side: items.filter((item) => item.station === 'side'),
        dessert_drink: items.filter((item) => item.station === 'dessert_drink'),
      },
      printable_lines: [
        '夜店 POS - 廚房單',
        '------------------------------',
        `桌位：${table?.name || '未指定桌位'}`,
        `訂單：${order.id}`,
        `時間：${new Date(order.created_at).toLocaleString('zh-TW')}`,
        '------------------------------',
        ...items.map((item) => `${item.name} x${item.qty}`),
      ],
    })
  } catch {
    return NextResponse.json({ error: '產生廚房單資料失敗' }, { status: 500 })
  }
}