import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: '缺少資料' }, { status: 400 })
  }

  await supabase.from('staff').insert({
    email,
    password,
    role: 'staff',
  })

  return NextResponse.json({ ok: true })
}