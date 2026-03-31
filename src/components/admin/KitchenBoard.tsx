'use client'

import { useEffect, useMemo, useState } from 'react'
import type { KitchenTicket, MenuStation } from '@/lib/types'

type OrderApiItem = {
  id: string
  menu_id: string
  name: string
  qty: number
  price?: number
  station?: MenuStation
}

type OrderApiRow = {
  id: string
  table_name: string
  status: string
  created_at: string
  items: OrderApiItem[]
}

const STATION_TABS: Array<{ key: MenuStation; label: string }> = [
  { key: 'main', label: '主餐' },
  { key: 'side', label: '附餐' },
  { key: 'dessert_drink', label: '飲料甜點' },
]

export default function KitchenBoard() {
  const [orders, setOrders] = useState<OrderApiRow[]>([])
  const [station, setStation] = useState<MenuStation>('main')

  async function load() {
    try {
      const res = await fetch('/api/admin/orders?view=open', { cache: 'no-store' })
      const text = await res.text()

      let data: unknown = []
      try {
        data = JSON.parse(text)
      } catch {
        console.error('load 非 JSON 回應：', text)
        setOrders([])
        return
      }

      setOrders(Array.isArray(data) ? (data as OrderApiRow[]) : [])
    } catch (error) {
      console.error('load kitchen orders error:', error)
      setOrders([])
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data?.error || '更新失敗')
        return
      }

      await load()
    } catch (error) {
      console.error('updateStatus error:', error)
      alert('更新失敗')
    }
  }

  useEffect(() => {
    load()

    const interval = setInterval(() => {
      load()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const visibleTickets = useMemo(() => {
    const openOrders = orders
      .filter((order) => order.status === 'new' || order.status === 'preparing')
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

    const tickets: KitchenTicket[] = []

    for (const order of openOrders) {
      const stationItems = order.items.filter(
        (item) => (item.station || 'main') === station
      )

      if (!stationItems.length) continue

      tickets.push({
        order_id: order.id,
        table_name: order.table_name,
        status: order.status,
        created_at: order.created_at,
        station,
        items: stationItems.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          station: item.station,
        })),
      })
    }

    return tickets
  }, [orders, station])

  return (
    <main className="min-h-screen bg-neutral-900 p-6 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">廚房 KDS</h1>

        <div className="flex gap-2">
          {STATION_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStation(tab.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                station === tab.key ? 'bg-white text-black' : 'bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {visibleTickets.length === 0 ? (
        <div className="rounded-2xl bg-neutral-800 p-6 text-neutral-300">
          目前沒有待處理訂單
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {visibleTickets.map((ticket) => (
            <div key={`${ticket.order_id}-${ticket.station}`} className="rounded-2xl bg-neutral-800 p-4 shadow">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-lg font-bold">{ticket.table_name}</div>
                <div className="rounded-full bg-white/10 px-2 py-1 text-xs">
                  {STATION_TABS.find((x) => x.key === ticket.station)?.label}
                </div>
              </div>

              <div className="mb-4 text-sm text-neutral-400">
                {new Date(ticket.created_at).toLocaleTimeString()}
              </div>

              <div className="mb-4 space-y-1">
                {ticket.items.map((item) => (
                  <div key={item.id}>
                    {item.name} x {item.qty}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(ticket.order_id, 'preparing')}
                  className="rounded bg-yellow-500 px-3 py-1 text-black"
                >
                  製作中
                </button>

                <button
                  onClick={() => updateStatus(ticket.order_id, 'ready')}
                  className="rounded bg-green-500 px-3 py-1 text-black"
                >
                  完成
                </button>
              </div>

              <div className="mt-2 text-sm">狀態：{ticket.status}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}