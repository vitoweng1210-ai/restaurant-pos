import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

type UpdateOrderBody = {
  status?: 'new' | 'preparing' | 'ready' | 'served' | 'paid'
}

const ALLOWED_STATUSES = ['new', 'preparing', 'ready', 'served', 'paid'] as const

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, table_id, status, total, created_at, payment_method, paid_at')
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json({ error: '讀取訂單失敗' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await req.json()) as UpdateOrderBody
    const nextStatus = String(body.status || '').trim().toLowerCase()

    if (!nextStatus) {
      return NextResponse.json({ error: '缺少 status' }, { status: 400 })
    }

    if (!ALLOWED_STATUSES.includes(nextStatus as any)) {
      return NextResponse.json({ error: 'status 不合法' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existingOrder, error: existingError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (existingError || !existingOrder) {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 })
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
      })
      .eq('id', id)
      .select('id, status')
      .single()

    if (updateError || !updatedOrder) {
      return NextResponse.json({ error: '更新訂單狀態失敗' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      id: updatedOrder.id,
      previous_status: existingOrder.status,
      status: updatedOrder.status,
    })
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ error: '更新訂單失敗' }, { status: 500 })
  }
}