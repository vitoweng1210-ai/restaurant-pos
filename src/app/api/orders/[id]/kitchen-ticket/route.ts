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
      .select('id, table_id, created_at, status')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    let tableName = '未指定桌位'

    if (order.table_id) {
      const { data: table } = await supabase
        .from('tables')
        .select('name')
        .eq('id', order.table_id)
        .maybeSingle()

      tableName = table?.name || '未指定桌位'
    }

    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id, menu_id, qty')
      .eq('order_id', id)

    if (orderItemsError) {
      return NextResponse.json({ error: '讀取訂單明細失敗' }, { status: 500 })
    }

    const { data: menu, error: menuError } = await supabase
      .from('menu')
      .select('id, name')

    if (menuError) {
      return NextResponse.json({ error: '讀取菜單失敗' }, { status: 500 })
    }

    const items = (orderItems || []).map((item) => {
      const foundMenu = (menu || []).find((m) => m.id === item.menu_id)

      return {
        id: item.id,
        name: foundMenu?.name || '未知品項',
        qty: item.qty,
      }
    })

    return NextResponse.json({
      order_id: order.id,
      table_name: tableName,
      created_at: order.created_at,
      status: order.status,
      items,
      printable_lines: [
        '夜店 POS - 廚房單',
        '------------------------------',
        `桌位：${tableName}`,
        `訂單：${order.id}`,
        `時間：${new Date(order.created_at).toLocaleString('zh-TW')}`,
        '------------------------------',
        ...items.map((item) => `${item.name} x${item.qty}`),
      ],
    })
  } catch (error) {
    console.error('kitchen-ticket api error:', error)
    return NextResponse.json({ error: '產生廚房單資料失敗' }, { status: 500 })
  }
}