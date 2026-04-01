'use client'

import { useEffect, useMemo, useState } from 'react'
import type { KitchenTicket, MenuStation } from '@/lib/types'

type OrderApiItem = {
  id: string
  menu_id?: string | null
  name: string
  qty: number
  price?: number | null
  note?: string | null
  station?: MenuStation | string | null
}

type OrderApiRow = {
  id: string
  table_name?: string | null
  status?: string | null
  created_at?: string | null
  items?: OrderApiItem[] | null
}

const STATION_TABS: Array<{ key: MenuStation; label: string }> = [
  { key: 'main', label: '主餐' },
  { key: 'side', label: '附餐' },
  { key: 'dessert_drink', label: '飲料甜點' },
]

const OPEN_STATUSES = ['new', 'preparing', 'ready']

function normalizeStatus(status?: string | null) {
  return (status || '').trim().toLowerCase()
}

function isOpenStatus(status?: string | null) {
  return OPEN_STATUSES.includes(normalizeStatus(status))
}

function normalizeStation(item: OrderApiItem): MenuStation {
  const raw = (item.station || '').toString().trim().toLowerCase()

  if (raw === 'main') return 'main'
  if (raw === 'side') return 'side'
  if (raw === 'dessert_drink') return 'dessert_drink'
  if (raw === 'dessert-drink') return 'dessert_drink'

  return 'main'
}

function formatTime(value?: string | null) {
  if (!value) return '--:--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--:--'

  return d.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getElapsedMinutes(value?: string | null) {
  if (!value) return 0
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return 0
  return Math.max(0, Math.floor((Date.now() - ts) / 60000))
}

function getStatusLabel(status?: string | null) {
  switch (normalizeStatus(status)) {
    case 'new':
      return '新單'
    case 'preparing':
      return '製作中'
    case 'ready':
      return '完成'
    case 'served':
      return '已送出'
    case 'paid':
      return '已結帳'
    default:
      return status || '未設定'
  }
}

function getStatusClass(status?: string | null) {
  switch (normalizeStatus(status)) {
    case 'new':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'preparing':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'ready':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'served':
      return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30'
    default:
      return 'bg-white/10 text-neutral-200 border-white/10'
  }
}

export default function KitchenBoard() {
  const [orders, setOrders] = useState<OrderApiRow[]>([])
  const [station, setStation] = useState<MenuStation>('main')
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  async function load() {
    try {
      setErrorText('')

      const res = await fetch('/api/admin/orders?view=open', {
        cache: 'no-store',
      })

      const text = await res.text()

      let data: unknown = []
      try {
        data = JSON.parse(text)
      } catch {
        console.error('KitchenBoard load 非 JSON 回應：', text)
        setOrders([])
        setErrorText('API 回傳格式錯誤，請檢查 /api/admin/orders')
        return
      }

      if (!res.ok) {
        console.error('KitchenBoard load failed:', data)
        setOrders([])
        setErrorText('讀取訂單失敗')
        return
      }

      if (!Array.isArray(data)) {
        console.error('KitchenBoard load 非陣列資料：', data)
        setOrders([])
        setErrorText('API 資料格式錯誤')
        return
      }

      setOrders(data as OrderApiRow[])
    } catch (error) {
      console.error('load kitchen orders error:', error)
      setOrders([])
      setErrorText('讀取 KDS 失敗')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(
    id: string,
    status: 'new' | 'preparing' | 'ready' | 'served'
  ) {
    try {
      setUpdatingOrderId(id)

      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const text = await res.text()

      let data: any = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = null
      }

      if (!res.ok) {
        alert(data?.error || '更新失敗')
        return
      }

      await load()
    } catch (error) {
      console.error('updateStatus error:', error)
      alert('更新失敗')
    } finally {
      setUpdatingOrderId(null)
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
      .filter((order) => isOpenStatus(order.status))
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime()
        const bTime = new Date(b.created_at || 0).getTime()

        const aWeight =
          normalizeStatus(a.status) === 'new'
            ? 0
            : normalizeStatus(a.status) === 'preparing'
            ? 1
            : normalizeStatus(a.status) === 'ready'
            ? 2
            : 9

        const bWeight =
          normalizeStatus(b.status) === 'new'
            ? 0
            : normalizeStatus(b.status) === 'preparing'
            ? 1
            : normalizeStatus(b.status) === 'ready'
            ? 2
            : 9

        if (aWeight !== bWeight) return aWeight - bWeight
        return aTime - bTime
      })

    const tickets: KitchenTicket[] = []

    for (const order of openOrders) {
      const items = Array.isArray(order.items) ? order.items : []

      const stationItems = items.filter((item) => normalizeStation(item) === station)

      if (!stationItems.length) continue

      tickets.push({
        order_id: order.id,
        table_name: order.table_name || '未指定桌位',
        status: normalizeStatus(order.status) || 'new',
        created_at: order.created_at || new Date().toISOString(),
        station,
        items: stationItems.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          station: normalizeStation(item),
        })),
      })
    }

    return tickets
  }, [orders, station])

  return (
    <main className="min-h-screen bg-neutral-900 p-6 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">廚房 KDS</h1>
          <div className="mt-2 text-sm text-neutral-400">
            站台分流已改成 menu.station 優先
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATION_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStation(tab.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                station === tab.key
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-white hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={load}
            className="rounded-2xl bg-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-600"
          >
            重新整理
          </button>
        </div>
      </div>

      {errorText ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {errorText}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl bg-neutral-800 p-6 text-neutral-300">
          讀取中...
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="rounded-2xl bg-neutral-800 p-6 text-neutral-300">
          目前沒有待處理訂單
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTickets.map((ticket) => {
            const currentStatus = normalizeStatus(ticket.status)
            const isUpdating = updatingOrderId === ticket.order_id

            return (
              <div
                key={`${ticket.order_id}-${ticket.station}`}
                className="rounded-2xl border border-white/10 bg-neutral-800 p-4 shadow"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-bold">{ticket.table_name}</div>
                    <div className="mt-1 text-sm text-neutral-400">
                      下單時間：{formatTime(ticket.created_at)}　/　等待 {getElapsedMinutes(ticket.created_at)} 分鐘
                    </div>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                      ticket.status
                    )}`}
                  >
                    {getStatusLabel(ticket.status)}
                  </div>
                </div>

                <div className="mb-4 rounded-xl bg-white/5 px-3 py-2 text-xs text-neutral-300">
                  站台：{STATION_TABS.find((x) => x.key === ticket.station)?.label}
                </div>

                <div className="mb-4 space-y-2">
                  {ticket.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-base font-semibold">{item.name}</div>
                        <div className="text-lg font-bold">x{item.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentStatus === 'new' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => updateStatus(ticket.order_id, 'preparing')}
                      className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdating ? '更新中...' : '開始製作'}
                    </button>
                  )}

                  {currentStatus === 'preparing' && (
                    <>
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(ticket.order_id, 'ready')}
                        className="rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? '更新中...' : '標記完成'}
                      </button>

                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(ticket.order_id, 'new')}
                        className="rounded-xl bg-neutral-600 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        回到新單
                      </button>
                    </>
                  )}

                  {currentStatus === 'ready' && (
                    <>
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(ticket.order_id, 'served')}
                        className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? '更新中...' : '標記已送出'}
                      </button>

                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(ticket.order_id, 'preparing')}
                        className="rounded-xl bg-neutral-600 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        回到製作中
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-3 text-xs text-neutral-500">
                  訂單 ID：{ticket.order_id}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}