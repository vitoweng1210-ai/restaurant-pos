import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CreateOrderBody = {
  table_id?: string | null
  items?: Array<{
    menu_id: string
    qty: number
    price: number
  }>
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderBody
    const tableId = body.table_id || null
    const items = Array.isArray(body.items) ? body.items : []

    if (!tableId) {
      return NextResponse.json({ error: '請先選擇桌位' }, { status: 400 })
    }

    if (!items.length) {
      return NextResponse.json({ error: '請先加入商品' }, { status: 400 })
    }

    const addTotal = items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.qty || 0)
    }, 0)

    const supabase = await createClient()

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .neq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let targetOrderId = ''
    let newStatus = 'new'
    let isAdditionalOrder = false

    if (existingOrder) {
      targetOrderId = existingOrder.id
      isAdditionalOrder = true

      newStatus =
        existingOrder.status === 'ready' || existingOrder.status === 'served'
          ? 'new'
          : existingOrder.status || 'new'

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          total: Number(existingOrder.total || 0) + addTotal,
          status: newStatus,
        })
        .eq('id', existingOrder.id)

      if (updateOrderError) {
        return NextResponse.json({ error: '更新訂單失敗' }, { status: 500 })
      }
    } else {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: tableId,
          status: 'new',
          total: addTotal,
        })
        .select('*')
        .single()

      if (orderError || !order) {
        return NextResponse.json({ error: '建立訂單失敗' }, { status: 500 })
      }

      targetOrderId = order.id
    }

    const payload = items.map((item) => ({
      order_id: targetOrderId,
      menu_id: item.menu_id,
      qty: item.qty,
      price: item.price,
    }))

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(payload)
      .select('id')

    if (itemsError) {
      return NextResponse.json({ error: '建立訂單明細失敗' }, { status: 500 })
    }

    await supabase
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', tableId)

    return NextResponse.json({
      ok: true,
      id: targetOrderId,
      item_ids: (insertedItems || []).map((item) => item.id),
      is_additional_order: isAdditionalOrder,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '建立訂單失敗' }, { status: 500 })
  }
}