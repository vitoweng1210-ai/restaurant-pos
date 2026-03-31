'use client'

import { useEffect, useState } from 'react'
import type { OrderListItem, OrderStatus } from '@/lib/types'

const STATUS_OPTIONS: OrderStatus[] = [
  'new',
  'preparing',
  'ready',
  'served',
  'paid',
]

export default function OrderList() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'open' | 'paid' | 'all'>('open')

  async function loadOrders(nextView?: 'open' | 'paid' | 'all') {
    const currentView = nextView || view

    try {
      const res = await fetch(`/api/admin/orders?view=${currentView}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(orderId: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!res.ok) {
      alert('更新狀態失敗')
      return
    }

    await loadOrders()
  }

  useEffect(() => {
    loadOrders(view)
  }, [view])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="text-lg font-semibold">載入中...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">訂單管理</h1>

          <div className="flex gap-2">
            <button
              onClick={() => setView('open')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                view === 'open' ? 'bg-black text-white' : 'bg-white'
              }`}
            >
              未結帳
            </button>

            <button
              onClick={() => setView('paid')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                view === 'paid' ? 'bg-black text-white' : 'bg-white'
              }`}
            >
              已結帳
            </button>

            <button
              onClick={() => setView('all')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                view === 'all' ? 'bg-black text-white' : 'bg-white'
              }`}
            >
              全部
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm">目前沒有訂單</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-bold">{order.table_name}</div>
                    <div className="mt-1 text-sm text-neutral-500">
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                    <div className="mt-1 text-sm text-neutral-500">
                      狀態：{order.status}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/print/order/${order.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold"
                    >
                      收銀單
                    </a>

                    <a
                      href={`/print/kitchen/${order.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold"
                    >
                      廚房單
                    </a>

                    {view !== 'paid' &&
                      STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          onClick={() => changeStatus(order.id, status)}
                          className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                            order.status === status
                              ? 'bg-black text-white'
                              : 'border border-neutral-300 bg-white'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          {item.name} x {item.qty}
                        </div>
                        <div>NT$ {item.qty * item.price}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t pt-3 text-right text-lg font-bold">
                    總計 NT$ {order.total}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}