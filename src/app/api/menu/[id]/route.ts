import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json()

  const supabase = await createClient()

  const { error } = await supabase
    .from('menu')
    .update(body)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}