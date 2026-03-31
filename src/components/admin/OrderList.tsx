'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type OrderItem = {
  name: string
  qty: number
  price: number
}

type Order = {
  id: string
  table_id: string | null
  status: string
  total: number
  payment_method: string | null
  received_amount: number | null
  change_amount: number | null
  paid_at: string | null
  created_at: string
  items?: OrderItem[]
}

export default function OrderList() {
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          qty,
          menu:menu_id (
            name,
            price
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const mapped: Order[] = (data as any[]).map((order) => ({
        id: order.id,
        table_id: order.table_id,
        status: order.status,
        total: Number(order.total || 0),
        payment_method: order.payment_method,
        received_amount:
          order.received_amount !== null ? Number(order.received_amount) : null,
        change_amount:
          order.change_amount !== null ? Number(order.change_amount) : null,
        paid_at: order.paid_at,
        created_at: order.created_at,
        items: (order.order_items || []).map((item: any) => ({
          name: item.menu?.name || '未知商品',
          qty: Number(item.qty || 0),
          price: Number(item.menu?.price || 0),
        })),
      }))

      setOrders(mapped)

      if (mapped.length > 0) {
        setSelectedOrder((prev) => {
          if (!prev) return mapped[0]
          return mapped.find((order) => order.id === prev.id) || mapped[0]
        })
      }
    }

    setLoading(false)
  }

  function formatTime(time: string | null) {
    if (!time) return '-'
    return new Date(time).toLocaleString()
  }

  return (
    <div className="flex h-full">
      <div className="w-1/2 overflow-y-auto border-r">
        <div className="p-4 text-xl font-bold">訂單管理</div>

        {loading && <div className="p-4">載入中...</div>}

        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => setSelectedOrder(order)}
            className={`cursor-pointer border-b p-4 hover:bg-neutral-50 ${
              selectedOrder?.id === order.id ? 'bg-neutral-50' : ''
            }`}
          >
            <div className="flex justify-between">
              <div className="font-semibold">
                桌號：{order.table_id?.slice(0, 6) || '外帶'}
              </div>
              <div
                className={`text-sm font-bold ${
                  order.status === 'paid' ? 'text-green-600' : 'text-orange-500'
                }`}
              >
                {order.status}
              </div>
            </div>

            <div className="mt-1 text-sm text-neutral-500">NT$ {order.total}</div>

            <div className="text-xs text-neutral-400">
              {formatTime(order.created_at)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 p-6">
        {!selectedOrder ? (
          <div className="text-neutral-400">請選擇訂單</div>
        ) : (
          <div className="space-y-4">
            <div className="text-2xl font-bold">訂單詳細</div>

            <div className="rounded-xl border p-4">
              <div>狀態：{selectedOrder.status}</div>
              <div>桌號：{selectedOrder.table_id}</div>
              <div>金額：NT$ {selectedOrder.total}</div>
              <div>建立時間：{formatTime(selectedOrder.created_at)}</div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-2 font-semibold">餐點內容</div>

              {selectedOrder.items?.length ? (
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        {item.name} x {item.qty}
                      </div>
                      <div>NT$ {item.qty * item.price}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-400">無資料</div>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-2 font-semibold">付款資訊</div>
              <div>付款方式：{selectedOrder.payment_method || '-'}</div>
              <div>實收：NT$ {selectedOrder.received_amount ?? '-'}</div>
              <div>找零：NT$ {selectedOrder.change_amount ?? '-'}</div>
              <div>結帳時間：{formatTime(selectedOrder.paid_at)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}