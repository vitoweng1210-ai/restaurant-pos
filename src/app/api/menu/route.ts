import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menu')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '讀取菜單失敗' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: '讀取菜單失敗' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const name = String(body.name || '').trim()
    const price = Number(body.price || 0)
    const category_id = body.category_id || null
    const station = String(body.station || 'main').trim()

    if (!name || !price) {
      return NextResponse.json({ error: '缺少資料' }, { status: 400 })
    }

    const { error } = await supabase.from('menu').insert({
      name,
      price,
      category_id,
      is_active: true,
      station,
    })

    if (error) {
      return NextResponse.json({ error: '新增失敗' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  }
}