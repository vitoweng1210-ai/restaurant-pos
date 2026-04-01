import { createClient } from '@/lib/supabase/server'
import AutoPrint from '@/components/print/AutoPrint'

type OrderRow = {
  id: string
  created_at: string | null
  total: number | null
  payment_method: string | null
  received_amount: number | null
  change_amount: number | null
}

type OrderItemRow = {
  id: string
  menu_id: string | null
  qty: number | null
  price: number | null
}

type MenuRow = {
  id: string
  name: string
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

function formatPaymentMethod(value?: string | null) {
  const method = (value || '').toLowerCase()

  if (method === 'cash') return '現金'
  if (method === 'card') return '刷卡'
  if (method === 'linepay') return 'LINE Pay'

  return value || '-'
}

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, created_at, total, payment_method, received_amount, change_amount')
    .eq('id', id)
    .single<OrderRow>()

  const { data: items } = await supabase
    .from('order_items')
    .select('id, menu_id, qty, price')
    .eq('order_id', id)

  const { data: menu } = await supabase
    .from('menu')
    .select('id, name')

  const typedItems = (items || []) as OrderItemRow[]
  const typedMenu = (menu || []) as MenuRow[]

  const itemsWithName = typedItems.map((item) => {
    const m = typedMenu.find((x) => x.id === item.menu_id)
    return {
      ...item,
      name: m?.name || '未知商品',
    }
  })

  const groupedItemsMap = new Map<
    string,
    { name: string; qty: number; unitPrice: number }
  >()

  for (const item of itemsWithName) {
    const key = `${item.menu_id}-${item.price}`
    const current = groupedItemsMap.get(key)

    if (current) {
      current.qty += Number(item.qty || 0)
    } else {
      groupedItemsMap.set(key, {
        name: item.name,
        qty: Number(item.qty || 0),
        unitPrice: Number(item.price || 0),
      })
    }
  }

  const groupedItems = Array.from(groupedItemsMap.values())

  return (
    <>
      <AutoPrint />

      <style>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: monospace;
        }

        .receipt-root {
          width: 80mm;
          padding: 4mm;
          box-sizing: border-box;
        }

        .center {
          text-align: center;
        }

        .title {
          font-size: 18px;
          font-weight: bold;
        }

        .meta {
          font-size: 12px;
          line-height: 1.6;
        }

        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          line-height: 1.8;
        }

        .row-left {
          flex: 1;
          word-break: break-word;
        }

        .row-right {
          text-align: right;
          white-space: nowrap;
        }

        .total {
          font-size: 16px;
          font-weight: bold;
        }

        .footer {
          text-align: center;
          margin-top: 10px;
          font-size: 12px;
          line-height: 1.6;
        }
      `}</style>

      <main className="receipt-root">
        <div className="center title">夜店義大利麵</div>

        <div className="center meta">
          <div>訂單：{order?.id?.slice(0, 8) || '-'}</div>
          <div>時間：{formatDateTime(order?.created_at)}</div>
        </div>

        <div className="divider" />

        {groupedItems.map((item, index) => (
          <div key={`${item.name}-${index}`} className="row">
            <span className="row-left">
              {item.name} x{item.qty}
            </span>
            <span className="row-right">NT$ {item.unitPrice * item.qty}</span>
          </div>
        ))}

        <div className="divider" />

        <div className="row total">
          <span>總計</span>
          <span>NT$ {order?.total ?? 0}</span>
        </div>

        <div className="divider" />

        <div className="meta">
          <div>付款方式：{formatPaymentMethod(order?.payment_method)}</div>
          <div>實收：NT$ {order?.received_amount ?? 0}</div>
          <div>找零：NT$ {order?.change_amount ?? 0}</div>
        </div>

        <div className="footer">
          <div>THANK YOU</div>
          <div>歡迎再次光臨</div>
        </div>
      </main>
    </>
  )
}