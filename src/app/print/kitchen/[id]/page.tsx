import { createClient } from '@/lib/supabase/server'

export default async function PrintKitchenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ itemIds?: string }>
}) {
  const { id } = await params
  const { itemIds } = await searchParams
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

  const { data: table } = await supabase
    .from('tables')
    .select('id, name')
    .eq('id', order?.table_id)
    .maybeSingle()

  const allItems = items || []

  const filterIds = (itemIds || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  let filteredItems = allItems

  // 先用 itemIds 精準比對
  if (filterIds.length > 0) {
    const matchedItems = allItems.filter((item: any) => filterIds.includes(item.id))

    // 如果真的有比對到，就用精準結果
    if (matchedItems.length > 0) {
      filteredItems = matchedItems
    } else {
      // 如果比不到，退回抓最後幾筆，避免整張空白
      filteredItems = allItems.slice(-filterIds.length)
    }
  }

  const itemsWithName = filteredItems.map((item: any) => {
    const m = menu?.find((x: any) => x.id === item.menu_id)

    return {
      ...item,
      name: m?.name || '未知商品',
    }
  })

  return (
    <html>
      <head>
        <title>廚房出單</title>
        <style>{`
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: white;
            font-family: monospace;
            color: #000;
          }

          body {
            width: 80mm;
            box-sizing: border-box;
            padding: 4mm;
          }

          .title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }

          .sub-title {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .meta {
            font-size: 12px;
            line-height: 1.6;
          }

          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }

          .item {
            font-size: 16px;
            line-height: 1.8;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }

          .item-name {
            flex: 1;
            word-break: break-word;
          }

          .item-qty {
            min-width: 40px;
            text-align: right;
          }

          .notice {
            margin-top: 12px;
            font-size: 12px;
            text-align: center;
          }

          .empty {
            text-align: center;
            font-size: 13px;
            padding: 12px 0;
          }

          @media print {
            html, body {
              width: 80mm;
              margin: 0;
              padding: 0;
            }

            body {
              width: 80mm;
              padding: 4mm;
            }
          }
        `}</style>
      </head>

      <body>
        <div className="title">廚房出單</div>

        <div className="sub-title">
          {filterIds.length > 0 ? '加點單' : '完整單'}
        </div>

        <div className="meta">
          <div>桌號：{table?.name || '外帶'}</div>
          <div>訂單：{order?.id?.slice(0, 8) || '-'}</div>
          <div>
            時間：
            {order?.created_at
              ? new Date(order.created_at).toLocaleString()
              : '-'}
          </div>
        </div>

        <div className="divider" />

        {itemsWithName.length > 0 ? (
          itemsWithName.map((item: any) => (
            <div key={item.id} className="item">
              <span className="item-name">{item.name}</span>
              <span className="item-qty">x{Number(item.qty || 0)}</span>
            </div>
          ))
        ) : (
          <div className="empty">沒有可列印品項</div>
        )}

        <div className="divider" />

        <div className="notice">請儘速出餐</div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(() => {
                window.print();
              }, 300);

              window.onafterprint = () => {
                window.close();
              };
            `,
          }}
        />
      </body>
    </html>
  )
}