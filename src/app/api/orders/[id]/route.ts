import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type PatchOrderBody = {
  status?: string
  total?: number
  payment_method?: string | null
  received_amount?: number | null
  change_amount?: number | null
  paid_at?: string | null
}

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

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)

    if (itemsError) {
      return NextResponse.json({ error: '讀取訂單明細失敗' }, { status: 500 })
    }

    const { data: menu, error: menuError } = await supabase
      .from('menu')
      .select('id,name')

    if (menuError) {
      return NextResponse.json({ error: '讀取菜單失敗' }, { status: 500 })
    }

    const menuMap = new Map((menu || []).map((item) => [item.id, item.name]))

    const items = (orderItems || []).map((item) => ({
      id: item.id,
      order_id: item.order_id,
      menu_id: item.menu_id,
      name: menuMap.get(item.menu_id) || '未知品項',
      qty: item.qty,
      price: item.price,
    }))

    return NextResponse.json({
      id: order.id,
      table_id: order.table_id,
      table_name: table?.name || '未指定桌位',
      status: order.status,
      total: order.total,
      payment_method: order.payment_method ?? null,
      received_amount: order.received_amount ?? null,
      change_amount: order.change_amount ?? null,
      paid_at: order.paid_at ?? null,
      created_at: order.created_at,
      items,
    })
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
    const body = (await req.json()) as PatchOrderBody
    const supabase = await createClient()

    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !order) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) {
      const status = String(body.status || '').trim()
      if (!status) {
        return NextResponse.json({ error: '缺少 status' }, { status: 400 })
      }
      updateData.status = status
    }

    if (body.total !== undefined) {
      updateData.total = Number(body.total || 0)
    }

    if (body.payment_method !== undefined) {
      updateData.payment_method = body.payment_method
    }

    if (body.received_amount !== undefined) {
      updateData.received_amount =
        body.received_amount === null ? null : Number(body.received_amount)
    }

    if (body.change_amount !== undefined) {
      updateData.change_amount =
        body.change_amount === null ? null : Number(body.change_amount)
    }

    if (body.paid_at !== undefined) {
      updateData.paid_at = body.paid_at
    }

    if (
      body.status !== undefined &&
      String(body.status).trim() === 'paid' &&
      body.paid_at === undefined
    ) {
      updateData.paid_at = new Date().toISOString()
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: '沒有可更新欄位' }, { status: 400 })
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError || !updatedOrder) {
      return NextResponse.json({ error: '更新訂單失敗' }, { status: 500 })
    }

    if (updatedOrder.status === 'paid' && updatedOrder.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', updatedOrder.table_id)
    }

    return NextResponse.json({
      ok: true,
      order: updatedOrder,
    })
  } catch {
    return NextResponse.json({ error: '更新訂單失敗' }, { status: 500 })
  }
}