import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const station = body.station

    if (!station) {
      return NextResponse.json({ error: '缺少 station' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('menu')
      .update({ station })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: '更新失敗' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}