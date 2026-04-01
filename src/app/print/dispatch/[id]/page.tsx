import { createClient } from '@/lib/supabase/server'
import AutoPrint from '@/components/print/AutoPrint'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ item_ids?: string }>
}

type OrderRow = {
  id: string
  table_id: string | null
  created_at: string | null
  status: string | null
}

type OrderItemRow = {
  id: string
  order_id: string
  menu_id: string | null
  qty: number | null
  price: number | null
}

type MenuRow = {
  id: string
  name: string
  station?: string | null
  category_id?: string | null
}

type CategoryRow = {
  id: string
  name: string
}

type PrintItem = {
  id: string
  name: string
  qty: number
  note?: string | null
}

type MenuStation = 'main' | 'side' | 'dessert_drink'

const DRINK_DESSERT_KEYWORDS = [
  '飲',
  '甜',
  'drink',
  'dessert',
  'bar',
  'tea',
  'coffee',
  '紅茶',
  '綠茶',
  '奶茶',
  '咖啡',
  '可樂',
  '雪碧',
  '汽水',
  '果汁',
  '冰沙',
  '甜點',
  '蛋糕',
]

const SIDE_KEYWORDS = [
  '附餐',
  'side',
  '薯條',
  '麵包',
  '濃湯',
  '沙拉',
  '前菜',
  '小點',
]

function formatDateTime(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

function inferStation(name?: string | null, categoryName?: string | null): MenuStation {
  const text = `${name || ''} ${categoryName || ''}`.toLowerCase()

  if (DRINK_DESSERT_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return 'dessert_drink'
  }

  if (SIDE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return 'side'
  }

  return 'main'
}

function normalizeStation(
  rawStation?: string | null,
  itemName?: string | null,
  categoryName?: string | null
): MenuStation {
  const value = (rawStation || '').trim().toLowerCase()

  if (value === 'main') return 'main'
  if (value === 'side') return 'side'
  if (value === 'dessert_drink') return 'dessert_drink'
  if (value === 'dessert-drink') return 'dessert_drink'

  return inferStation(itemName, categoryName)
}

function mergeItems(items: PrintItem[]) {
  const map = new Map<string, PrintItem>()

  for (const item of items) {
    const key = `${item.name}__${item.note || ''}`
    const found = map.get(key)

    if (found) {
      found.qty += item.qty
    } else {
      map.set(key, {
        id: item.id,
        name: item.name,
        qty: item.qty,
        note: item.note || '',
      })
    }
  }

  return Array.from(map.values())
}

function TicketSection({
  title,
  tableName,
  orderId,
  createdAt,
  items,
}: {
  title: string
  tableName: string
  orderId: string
  createdAt: string
  items: PrintItem[]
}) {
  const merged = mergeItems(items)

  if (!merged.length) return null

  return (
    <section className="ticket-page">
      <div className="ticket-title">{title}</div>
      <div className="divider" />
      <div>桌位：{tableName}</div>
      <div>訂單：{orderId}</div>
      <div>時間：{createdAt}</div>
      <div className="divider" />

      {merged.map((item) => (
        <div key={item.id} className="item-row">
          <div className="item-name">
            {item.name}
            {item.note ? <div className="item-note">備註：{item.note}</div> : null}
          </div>
          <div className="item-qty">x{item.qty}</div>
        </div>
      ))}
    </section>
  )
}

export default async function PrintDispatchPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const itemIds =
    sp.item_ids
      ?.split(',')
      .map((x) => x.trim())
      .filter(Boolean) || []

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, table_id, created_at, status')
    .eq('id', id)
    .single<OrderRow>()

  if (orderError || !order) {
    return <div>找不到訂單</div>
  }

  const { data: table } = await supabase
    .from('tables')
    .select('id,name')
    .eq('id', order.table_id)
    .maybeSingle()

  let itemsQuery = supabase
    .from('order_items')
    .select('id, order_id, menu_id, qty, price')
    .eq('order_id', id)

  if (itemIds.length > 0) {
    itemsQuery = itemsQuery.in('id', itemIds)
  }

  const { data: orderItems } = await itemsQuery
  const typedOrderItems = (orderItems || []) as OrderItemRow[]

  const menuIds = typedOrderItems
    .map((item) => item.menu_id)
    .filter(Boolean) as string[]

  const { data: menuRows } =
    menuIds.length > 0
      ? await supabase
          .from('menu')
          .select('id,name,station,category_id')
          .in('id', menuIds)
      : { data: [] as MenuRow[] }

  const categoryIds = Array.from(
    new Set((menuRows || []).map((m) => m.category_id).filter(Boolean))
  ) as string[]

  const { data: categoryRows } =
    categoryIds.length > 0
      ? await supabase
          .from('categories')
          .select('id,name')
          .in('id', categoryIds)
      : { data: [] as CategoryRow[] }

  const menuMap = new Map(
    (menuRows || []).map((m: any) => [m.id, m as MenuRow])
  )
  const categoryMap = new Map(
    (categoryRows || []).map((c: any) => [c.id, c as CategoryRow])
  )

  const kitchenItems: PrintItem[] = []
  const barItems: PrintItem[] = []

  for (const item of typedOrderItems) {
    const menu = item.menu_id ? menuMap.get(item.menu_id) : null
    const category = menu?.category_id ? categoryMap.get(menu.category_id) : null
    const station = normalizeStation(menu?.station, menu?.name, category?.name)

    const normalized: PrintItem = {
      id: item.id,
      name: menu?.name || '未知品項',
      qty: item.qty || 0,
      note: '',
    }

    if (station === 'dessert_drink') {
      barItems.push(normalized)
    } else {
      kitchenItems.push(normalized)
    }
  }

  const tableName = table?.name || '未指定桌位'
  const createdAt = formatDateTime(order.created_at)

  return (
    <>
      <AutoPrint />

      <html>
        <head>
          <title>站台出單</title>
          <style>{`
            @page {
              size: 80mm auto;
              margin: 4mm;
            }

            html, body {
              padding: 0;
              margin: 0;
              font-family: Arial, "Noto Sans TC", sans-serif;
              font-size: 12px;
              color: #000;
              background: #fff;
              zoom: 1.25;
            }

            .ticket-page {
              width: 72mm;
              max-width: 72mm;
              margin: 0 auto;
              padding: 0;
              page-break-after: always;
            }

            .ticket-page:last-child {
              page-break-after: auto;
            }

            .ticket-title {
              text-align: center;
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 6px;
            }

            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }

            .item-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 8px;
            }

            .item-name {
              flex: 1;
              font-size: 16px;
              font-weight: 700;
              word-break: break-word;
            }

            .item-note {
              margin-top: 2px;
              font-size: 11px;
              font-weight: 400;
            }

            .item-qty {
              width: 48px;
              text-align: right;
              font-size: 16px;
              font-weight: 700;
            }

            @media print {
              .ticket-page {
                break-after: page;
              }

              .ticket-page:last-child {
                break-after: auto;
              }
            }
          `}</style>
        </head>
        <body>
          {kitchenItems.length > 0 ? (
            <TicketSection
              title="廚房單"
              tableName={tableName}
              orderId={order.id}
              createdAt={createdAt}
              items={kitchenItems}
            />
          ) : null}

          {barItems.length > 0 ? (
            <TicketSection
              title="吧台單"
              tableName={tableName}
              orderId={order.id}
              createdAt={createdAt}
              items={barItems}
            />
          ) : null}

          {kitchenItems.length === 0 && barItems.length === 0 && (
            <section className="ticket-page">
              <div className="ticket-title">無可列印品項</div>
            </section>
          )}
        </body>
      </html>
    </>
  )
}