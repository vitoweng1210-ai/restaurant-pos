import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OrderRow = {
  id: string
  table_id: string | null
  total: number
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

    if (order.table_id) {
      const { data: tableOrders } = await supabase
        .from('orders')
        .select('id, table_id, total, status')
        .eq('table_id', order.table_id)
        .neq('status', 'paid')

      payableTotal = ((tableOrders || []) as OrderRow[]).reduce(
        (sum, item) => sum + Number(item.total || 0),
        0
      )
    }

    if (payment_method === 'cash' && received_amount < payableTotal) {
      return NextResponse.json({ error: '收款金額不足' }, { status: 400 })
    }

    if (order.table_id) {
      const { error: updateAllError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('table_id', order.table_id)
        .neq('status', 'paid')

      if (updateAllError) {
        return NextResponse.json({ error: '結帳失敗' }, { status: 500 })
      }

      const { error: tableUpdateError } = await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', order.table_id)

      if (tableUpdateError) {
        return NextResponse.json({ error: '桌位釋放失敗' }, { status: 500 })
      }
    } else {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: '結帳失敗' }, { status: 500 })
      }
    }

    return NextResponse.json({
      ok: true,
      change: payment_method === 'cash' ? received_amount - payableTotal : 0,
    })
  } catch {
    return NextResponse.json({ error: '結帳失敗' }, { status: 500 })
  }
}