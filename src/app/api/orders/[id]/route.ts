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

    const { data: tables } = await supabase.from('tables').select('id,name')
    const { data: menu } = await supabase.from('menu').select('id,name')

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)

    if (itemsError) {
      return NextResponse.json({ error: '讀取訂單失敗' }, { status: 500 })
    }

    const tableName =
      tables?.find((t) => t.id === order.table_id)?.name || '未指定桌位'

    const formatted = {
      id: order.id,
      table_id: order.table_id,
      table_name: tableName,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      items: (items || []).map((item) => ({
        id: item.id,
        menu_id: item.menu_id,
        name: menu?.find((m) => m.id === item.menu_id)?.name || '未知品項',
        qty: item.qty,
        price: item.price,
      })),
    }

    return NextResponse.json(formatted)
  } catch {
    return NextResponse.json({ error: '讀取訂單失敗' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const status = String(body.status || '').trim()

    if (!status) {
      return NextResponse.json({ error: '缺少 status' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !order) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: '更新訂單狀態失敗' }, { status: 500 })
    }

    if (status === 'paid' && order.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', order.table_id)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '更新訂單狀態失敗' }, { status: 500 })
  }
}