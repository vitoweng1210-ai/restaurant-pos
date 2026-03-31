import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StaffRow, SessionStaff } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '').trim()

    if (!email || !password) {
      return NextResponse.json(
        { error: '請輸入帳號密碼' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .maybeSingle<StaffRow>()

    if (error) {
      return NextResponse.json(
        { error: '查詢員工失敗' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '查無此帳號' },
        { status: 401 }
      )
    }

    if (data.password !== password) {
      return NextResponse.json(
        { error: '密碼錯誤' },
        { status: 401 }
      )
    }

    const session: SessionStaff = {
      id: data.id,
      name: data.name || '未命名員工',
      email: data.email,
      role: data.role,
    }

    const response = NextResponse.json({
      ok: true,
      role: session.role,
    })

    response.cookies.set('pos_staff_session', JSON.stringify(session), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: '登入失敗' },
      { status: 500 }
    )
  }
}