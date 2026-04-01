import { createClient } from '@/lib/supabase/server'
import AutoPrint from '@/components/print/AutoPrint'

function normalizeText(value: string | null | undefined) {
  return String(value || '').toLowerCase()
}

function isBarText(textValue: string | null | undefined) {
  const text = normalizeText(textValue)

  return (
    text.includes('飲') ||
    text.includes('甜') ||
    text.includes('drink') ||
    text.includes('dessert') ||
    text.includes('bar') ||
    text.includes('tea') ||
    text.includes('coffee') ||
    text.includes('紅茶') ||
    text.includes('綠茶') ||
    text.includes('奶茶') ||
    text.includes('咖啡') ||
    text.includes('可樂') ||
    text.includes('雪碧') ||
    text.includes('汽水') ||
    text.includes('果汁') ||
    text.includes('冰沙') ||
    text.includes('甜點') ||
    text.includes('蛋糕')
  )
}

function isBarItemName(menuName: string | null | undefined, categoryName: string | null | undefined) {
  return isBarText(categoryName) || isBarText(menuName)
}

export default async function PrintBarPage({
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
  const { data: categories } = await supabase.from('categories').select('*')

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

  if (filterIds.length > 0) {
    const matchedItems = allItems.filter((item: any) => filterIds.includes(item.id))

    if (matchedItems.length > 0) {
      filteredItems = matchedItems
    } else {
      filteredItems = allItems.slice(-filterIds.length)
    }
  }

  const itemsWithName = filteredItems
    .map((item: any) => {
      const m = menu?.find((x: any) => x.id === item.menu_id)
      const category = categories?.find((x: any) => x.id === m?.category_id)

      return {
        ...item,
        name: m?.name || '未知商品',
        categoryName: category?.name || '',
      }
    })
    .filter((item: any) => isBarItemName(item.name, item.categoryName))
  return (
    <>
      <AutoPrint />

      <div className="ticket">
        <div className="title">吧台出單</div>

        <div className="subTitle">
          {filterIds.length > 0 ? '加點單' : '完整單'}
        </div>

        <div className="meta">
          <div>站台：吧台</div>
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
            <div key={item.id} className="itemRow">
              <span className="itemName">{item.name}</span>
              <span className="itemQty">x{Number(item.qty || 0)}</span>
            </div>
          ))
        ) : (
          <div className="empty">本次沒有吧台品項</div>
        )}

        <div className="divider" />
        <div className="notice">請儘速製作</div>
      </div>

      <style>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        body {
          margin: 0;
          font-family: monospace;
          background: white;
          color: #000;
        }

        .ticket {
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

        .subTitle {
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

        .itemRow {
          font-size: 16px;
          line-height: 1.8;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }

        .itemName {
          flex: 1;
          word-break: break-word;
        }

        .itemQty {
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
      `}</style>
    </>
  )
}