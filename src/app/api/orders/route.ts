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

type OrderBatchRow = {
  id: string
  order_id: string
  batch_no: number
  created_at: string | null
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
    const nowIso = new Date().toISOString()

    const { data: existingOrder, error: existingOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .neq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingOrderError) {
      return NextResponse.json({ error: '讀取現有訂單失敗' }, { status: 500 })
    }

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
          kds_sent_at: nowIso,
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
          kds_sent_at: nowIso,
        })
        .select('*')
        .single()

      if (orderError || !order) {
        return NextResponse.json({ error: '建立訂單失敗' }, { status: 500 })
      }

      targetOrderId = order.id
      newStatus = 'new'
    }

    // 每次送單 / 加點都建立新的 batch
    const { data: latestBatch, error: latestBatchError } = await supabase
      .from('order_batches')
      .select('id, order_id, batch_no, created_at')
      .eq('order_id', targetOrderId)
      .order('batch_no', { ascending: false })
      .limit(1)
      .maybeSingle<OrderBatchRow>()

    if (latestBatchError) {
      return NextResponse.json({ error: '讀取批次失敗' }, { status: 500 })
    }

    const nextBatchNo = Number(latestBatch?.batch_no || 0) + 1

    const { data: batch, error: batchError } = await supabase
  .from('order_batches')
  .insert({
    order_id: targetOrderId,
    batch_no: nextBatchNo,
    created_at: nowIso,
    status: 'new',
  })
  .select('id, order_id, batch_no, created_at')
  .single<OrderBatchRow>()

    if (batchError || !batch) {
      return NextResponse.json({ error: '建立批次失敗' }, { status: 500 })
    }

    const payload = items.map((item) => ({
      order_id: targetOrderId,
      batch_id: batch.id,
      menu_id: item.menu_id,
      qty: item.qty,
      price: item.price,
    }))

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(payload)
      .select('id, batch_id')

    if (itemsError) {
      return NextResponse.json({ error: '建立訂單明細失敗' }, { status: 500 })
    }

    const { error: tableError } = await supabase
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', tableId)

    if (tableError) {
      return NextResponse.json({ error: '更新桌位狀態失敗' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      id: targetOrderId,
      batch_id: batch.id,
      batch_no: batch.batch_no,
      item_ids: (insertedItems || []).map((item) => item.id),
      is_additional_order: isAdditionalOrder,
      status: newStatus,
    })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: '建立訂單失敗' }, { status: 500 })
  }
}