import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type TableRow = {
  id: string
  name: string
  status: string
}

type OrderRow = {
  id: string
  table_id: string | null
  status: string
  created_at: string
}

function getTableStatusFromOrders(orders: OrderRow[]) {
  if (!orders.length) return 'available'

  const sorted = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const latest = sorted[0]

  if (latest.status === 'ready') return 'ready'
  if (latest.status === 'preparing') return 'preparing'
  if (latest.status === 'new') return 'new'
  if (latest.status === 'served') return 'occupied'

  return 'occupied'
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .order('name', { ascending: true })

    if (tablesError) {
      return NextResponse.json({ error: '讀取桌位失敗' }, { status: 500 })
    }

    const { data: activeOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, table_id, status, created_at')
      .neq('status', 'paid')

    if (ordersError) {
      return NextResponse.json({ error: '讀取訂單失敗' }, { status: 500 })
    }

    const result = ((tables || []) as TableRow[]).map((table) => {
      const tableOrders = ((activeOrders || []) as OrderRow[]).filter(
        (order) => order.table_id === table.id
      )

      return {
        ...table,
        status: getTableStatusFromOrders(tableOrders),
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: '讀取桌位失敗' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const name = String(body.name || '').trim()

    if (!name) {
      return NextResponse.json({ error: '缺少名稱' }, { status: 400 })
    }

    const { error } = await supabase.from('tables').insert({
      name,
      status: 'available',
    })

    if (error) {
      return NextResponse.json({ error: '新增桌位失敗' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '新增桌位失敗' }, { status: 500 })
  }
}