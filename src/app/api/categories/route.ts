import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CategoryRow } from '@/lib/types'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '讀取分類失敗' }, { status: 500 })
    }

    return NextResponse.json((data || []) as CategoryRow[])
  } catch {
    return NextResponse.json({ error: '讀取分類失敗' }, { status: 500 })
  }
}