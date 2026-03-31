'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    }

    setLoading(false)
  }

  function formatTime(time: string | null) {
    if (!time) return '-'
    return new Date(time).toLocaleString()
  }

  return (
    <div className="flex h-full">
      {/* 左：訂單列表 */}
      <div className="w-1/2 border-r overflow-y-auto">
        <div className="p-4 text-xl font-bold">訂單管理</div>

        {loading && <div className="p-4">載入中...</div>}

        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => setSelectedOrder(order)}
            className="cursor-pointer border-b p-4 hover:bg-neutral-50"
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

            <div className="mt-1 text-sm text-neutral-500">
              NT$ {order.total}
            </div>

            <div className="text-xs text-neutral-400">
              {formatTime(order.created_at)}
            </div>
          </div>
        ))}
      </div>

      {/* 右：詳細 */}
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
              <div className="font-semibold mb-2">付款資訊</div>
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