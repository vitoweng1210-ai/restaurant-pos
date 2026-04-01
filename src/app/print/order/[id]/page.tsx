import { createClient } from '@/lib/supabase/server'
import AutoPrint from '@/components/print/AutoPrint'

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  const { data: menu } = await supabase.from('menu').select('*')

  const itemsWithName =
    items?.map((item: any) => {
      const m = menu?.find((x: any) => x.id === item.menu_id)
      return {
        ...item,
        name: m?.name || '未知商品',
      }
    }) || []

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

      <div className="receipt">
        <div className="center title">夜店義大利麵</div>

        <div className="center meta">
          <div>訂單：{order?.id?.slice(0, 8) || '-'}</div>
          <div>
            時間：
            {order?.created_at
              ? new Date(order.created_at).toLocaleString()
              : '-'}
          </div>
        </div>

        <div className="divider" />

        {groupedItems.map((item, index) => (
          <div key={`${item.name}-${index}`} className="row">
            <span>{item.name} x{item.qty}</span>
            <span>NT$ {item.unitPrice * item.qty}</span>
          </div>
        ))}

        <div className="divider" />

        <div className="row total">
          <span>總計</span>
          <span>NT$ {order?.total ?? 0}</span>
        </div>

        <div className="divider" />

        <div className="meta">
          <div>付款方式：{order?.payment_method || '-'}</div>
          <div>實收：NT$ {order?.received_amount ?? 0}</div>
          <div>找零：NT$ {order?.change_amount ?? 0}</div>
        </div>

        <div className="footer">
          <div>THANK YOU</div>
          <div>歡迎再次光臨</div>
        </div>
      </div>

      <style>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        body {
          margin: 0;
          font-family: monospace;
        }

        .receipt {
          width: 80mm;
          padding: 4mm;
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
        }

        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }

        .row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          line-height: 1.8;
        }

        .total {
          font-size: 16px;
          font-weight: bold;
        }

        .footer {
          text-align: center;
          margin-top: 10px;
          font-size: 12px;
        }
      `}</style>
    </>
  )
}