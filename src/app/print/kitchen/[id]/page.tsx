import { createClient } from '@/lib/supabase/server'
import AutoPrint from '@/components/print/AutoPrint'

type PrintPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ item_ids?: string }>
}

type OrderItemRow = {
  id: string
  order_id: string
  menu_id: string
  quantity: number
  note?: string | null
  created_at?: string | null
}

type MenuRow = {
  id: string
  name: string
  station?: string | null
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleString('zh-TW', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupItems(
  items: Array<{
    id: string
    name: string
    quantity: number
    note?: string | null
  }>
) {
  const map = new Map<
    string,
    {
      name: string
      quantity: number
      note?: string | null
    }
  >()

  for (const item of items) {
    const key = `${item.name}__${item.note || ''}`
    const found = map.get(key)
    if (found) {
      found.quantity += item.quantity
    } else {
      map.set(key, {
        name: item.name,
        quantity: item.quantity,
        note: item.note || '',
      })
    }
  }

  return Array.from(map.values())
}

export default async function PrintKitchenPage({
  params,
  searchParams,
}: PrintPageProps) {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}
  const itemIds = (sp?.item_ids || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('id', { ascending: true })

  const menuIds = [...new Set((orderItems || []).map((x: OrderItemRow) => x.menu_id))]

  const { data: menuRows } = await supabase
    .from('menu')
    .select('id,name,station')
    .in('id', menuIds.length > 0 ? menuIds : ['__never__'])

  const { data: table } = await supabase
    .from('tables')
    .select('id,name')
    .eq('id', order?.table_id)
    .maybeSingle()

  const menuMap = new Map(
  ((menuRows || []) as MenuRow[]).map((m) => [
    m.id,
    {
      name: m.name,
      station: m.station || 'main',
    },
  ])
)

  const filtered = ((orderItems || []) as OrderItemRow[])
  .filter((item) => {
    if (itemIds.length > 0 && !itemIds.includes(String(item.id))) return false
    const menu = menuMap.get(item.menu_id)
    const station = (menu?.station || 'main').trim().toLowerCase()
    return station === 'main' || station === 'side'
  })
    .map((item) => {
      const menu = menuMap.get(item.menu_id)
      return {
        id: String(item.id),
        name: menu?.name || '未知商品',
        quantity: item.quantity,
        note: item.note || '',
      }
    })

  const groupedItems = groupItems(filtered)
  const printTime = order?.kds_sent_at || order?.created_at

  return (
    <>
      <AutoPrint />
      <style>{`
        @page {
          size: 80mm auto;
          margin: 4mm;
        }
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, "Noto Sans TC", sans-serif;
          font-size: 12px;
          color: #000;
          background: #fff;
        }
        .ticket {
          width: 72mm;
          margin: 0 auto;
          padding: 2mm 0;
        }
        .center { text-align: center; }
        .title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .line {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin: 2px 0;
        }
        .item {
          margin: 8px 0;
        }
        .item-name {
          font-size: 16px;
          font-weight: 700;
          line-height: 1.4;
          word-break: break-word;
        }
        .qty {
          font-size: 16px;
          font-weight: 700;
          white-space: nowrap;
          margin-left: 8px;
        }
        .note {
          margin-top: 2px;
          padding-left: 8px;
          font-size: 12px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .meta {
          font-size: 12px;
          line-height: 1.5;
        }
      `}</style>

      <main className="ticket">
        <div className="center">
          <div className="title">廚房單</div>
          <div>桌號：{table?.name || '外帶'}</div>
          <div>訂單：{order?.id}</div>
          <div>時間：{formatTime(printTime)}</div>
        </div>

        <div className="line" />

        {groupedItems.length === 0 ? (
          <div className="center">本次無廚房品項</div>
        ) : (
          groupedItems.map((item, index) => (
            <div className="item" key={`${item.name}-${item.note}-${index}`}>
              <div className="row">
                <div className="item-name">{item.name}</div>
                <div className="qty">x{item.quantity}</div>
              </div>
              {item.note ? <div className="note">備註：{item.note}</div> : null}
            </div>
          ))
        )}

        <div className="line" />

        <div className="meta">
          <div>類型：{itemIds.length > 0 ? '加點單' : '整單'}</div>
        </div>
      </main>
    </>
  )
}