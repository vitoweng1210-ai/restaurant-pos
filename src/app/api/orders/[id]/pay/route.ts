import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OrderRow = {
  id: string
  table_id: string | null
  total: number | null
  subtotal?: number | null
  service_charge?: number | null
  status: string
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const payment_method = String(body.payment_method || '').trim()
    const received_amount = Number(body.received_amount || 0)

    if (!payment_method) {
      return NextResponse.json({ error: '缺少付款方式' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    let payableTotal = Number(order.total || 0)
    let targetOrders: OrderRow[] = [
      {
        id: order.id,
        table_id: order.table_id,
        total: Number(order.total || 0),
        subtotal: Number(order.subtotal || 0),
        service_charge: Number(order.service_charge || 0),
        status: String(order.status || ''),
      },
    ]

    if (order.table_id) {
      const { data: tableOrders, error: tableOrdersError } = await supabase
        .from('orders')
        .select('id, table_id, total, subtotal, service_charge, status')
        .eq('table_id', order.table_id)
        .neq('status', 'paid')

      if (tableOrdersError) {
        return NextResponse.json({ error: '讀取桌位訂單失敗' }, { status: 500 })
      }

      targetOrders = ((tableOrders || []) as OrderRow[]).filter(
        (item) => item.status !== 'paid'
      )

      payableTotal = targetOrders.reduce(
        (sum, item) => sum + Number(item.total || 0),
        0
      )
    }

    if (payment_method === 'cash' && received_amount < payableTotal) {
      return NextResponse.json({ error: '收款金額不足' }, { status: 400 })
    }

    const finalReceivedAmount =
      payment_method === 'cash' ? received_amount : payableTotal

    const finalChangeAmount =
      payment_method === 'cash'
        ? Math.max(finalReceivedAmount - payableTotal, 0)
        : 0

    const paidAt = new Date().toISOString()

    const orderIds = targetOrders.map((item) => item.id)

    if (orderIds.length === 0) {
      return NextResponse.json({ error: '沒有可結帳訂單' }, { status: 400 })
    }

    const { error: updateOrdersError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method,
        received_amount: finalReceivedAmount,
        change_amount: finalChangeAmount,
        paid_at: paidAt,
      })
      .in('id', orderIds)

    if (updateOrdersError) {
      console.error(updateOrdersError)
      return NextResponse.json({ error: '結帳失敗' }, { status: 500 })
    }

    if (order.table_id) {
      const { error: tableUpdateError } = await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', order.table_id)

      if (tableUpdateError) {
        console.error(tableUpdateError)
        return NextResponse.json({ error: '桌位釋放失敗' }, { status: 500 })
      }
    }

    return NextResponse.json({
      ok: true,
      paid_order_ids: orderIds,
      payment_method,
      total_amount: payableTotal,
      received_amount: finalReceivedAmount,
      change: finalChangeAmount,
      paid_at: paidAt,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '結帳失敗' }, { status: 500 })
  }
}