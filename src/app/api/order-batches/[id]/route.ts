import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const supabase = await createClient()

    const nextStatus = String(body?.status || '').trim().toLowerCase()
    const nowIso = new Date().toISOString()

    if (!['new', 'preparing', 'ready', 'served'].includes(nextStatus)) {
      return NextResponse.json({ error: '無效的狀態' }, { status: 400 })
    }

    const updatePayload: Record<string, string> = {
      status: nextStatus,
    }

    if (nextStatus === 'preparing') {
      updatePayload.started_at = nowIso
    }

    if (nextStatus === 'ready') {
      updatePayload.ready_at = nowIso
    }

    if (nextStatus === 'served') {
      updatePayload.served_at = nowIso
    }

    const { data, error } = await supabase
      .from('order_batches')
      .update(updatePayload)
      .eq('id', id)
      .select('id, order_id, batch_no, status, started_at, ready_at, served_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '更新批次狀態失敗' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ...data,
    })
  } catch (error) {
    console.error('PATCH /api/order-batches/[id] error:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}