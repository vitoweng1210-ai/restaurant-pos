import { createClient } from '@/lib/supabase/server'

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

  return (
    <html>
      <head>
        <title>列印小票</title>
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

          .center {
            text-align: center;
          }

          .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }

          .meta {
            font-size: 12px;
            line-height: 1.5;
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
            line-height: 1.6;
          }

          .row .left {
            flex: 1;
            word-break: break-word;
          }

          .row .right {
            white-space: nowrap;
            text-align: right;
            min-width: 70px;
          }

          .total {
            font-size: 16px;
            font-weight: bold;
          }

          .footer {
            margin-top: 14px;
            text-align: center;
            font-size: 12px;
            line-height: 1.6;
          }

          .muted {
            color: #333;
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

            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </head>

      <body>
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

        {itemsWithName.map((item: any) => (
          <div key={item.id} className="row">
            <span className="left">
              {item.name} x{Number(item.qty || 0)}
            </span>
            <span className="right">
              NT$ {Number(item.price || 0) * Number(item.qty || 0)}
            </span>
          </div>
        ))}

        <div className="divider" />

        <div className="row total">
          <span className="left">總計</span>
          <span className="right">NT$ {order?.total ?? 0}</span>
        </div>

        <div className="divider" />

        <div className="meta muted">
          <div>付款方式：{order?.payment_method || '-'}</div>
          <div>實收：NT$ {order?.received_amount ?? 0}</div>
          <div>找零：NT$ {order?.change_amount ?? 0}</div>
        </div>

        <div className="footer">
          <div>THANK YOU</div>
          <div>歡迎再次光臨</div>
        </div>

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