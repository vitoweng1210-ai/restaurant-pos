'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KitchenTicket, MenuStation } from '@/lib/types'
import { useToast } from '@/components/ui/ToastProvider'

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
  order_id?: string | null
  batch_id?: string | null
  batch_no?: number | null
  table_name?: string | null
  status?: string | null
  created_at?: string | null
  kds_sent_at?: string | null
  items?: OrderApiItem[] | null
}

const STATION_COLUMNS: Array<{ key: MenuStation; label: string }> = [
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

function getUrgencyLevel(minutes: number) {
  if (minutes >= 20) return 'danger'
  if (minutes >= 10) return 'warning'
  return 'normal'
}

function getCardClassName(minutes: number) {
  const level = getUrgencyLevel(minutes)

  if (level === 'danger') {
    return 'border-red-500 bg-red-950/30 shadow-[0_0_0_1px_rgba(239,68,68,0.4)] animate-pulse'
  }

  if (level === 'warning') {
    return 'border-yellow-400 bg-yellow-950/20 shadow-[0_0_0_1px_rgba(250,204,21,0.25)]'
  }

  return 'border-white/10 bg-neutral-800'
}

function getWaitBadgeClassName(minutes: number) {
  const level = getUrgencyLevel(minutes)

  if (level === 'danger') {
    return 'bg-red-500/20 text-red-300 border-red-500/30'
  }

  if (level === 'warning') {
    return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
  }

  return 'bg-white/10 text-neutral-300 border-white/10'
}

function getWaitLabel(minutes: number) {
  if (minutes >= 20) return '逾時警告'
  if (minutes >= 10) return '即將逾時'
  return '正常'
}

function playBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.35)
  } catch (error) {
    console.error('playBeep error:', error)
  }
}

type VisibleTicket = KitchenTicket & {
  batch_id: string
  batch_no?: number | null
  elapsedMinutes: number
  urgencyWeight: number
}

export default function KitchenBoard() {
  const [orders, setOrders] = useState<OrderApiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [, forceNow] = useState(Date.now())

  const { showToast } = useToast()
  const knownOrderIdsRef = useRef<Set<string>>(new Set())

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

      const nextOrders = data as OrderApiRow[]
      const nextIds = new Set(nextOrders.map((order) => order.id))
      const knownIds = knownOrderIdsRef.current

      const newOrders = nextOrders.filter(
        (order) => normalizeStatus(order.status) === 'new' && !knownIds.has(order.id)
      )

      if (knownIds.size > 0 && newOrders.length > 0) {
        playBeep()
        showToast(`有 ${newOrders.length} 張新單進來`, 'success')
      }

      knownOrderIdsRef.current = nextIds
      setOrders(nextOrders)
    } catch (error) {
      console.error('load kitchen orders error:', error)
      setOrders([])
      setErrorText('讀取 KDS 失敗')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(
  batchId: string,
  status: 'new' | 'preparing' | 'ready' | 'served'
) {
  try {
    const res = await fetch(`/api/order-batches/${batchId}`, {
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
      showToast(data?.error || '更新失敗', 'error')
      return
    }

    showToast(`狀態已更新：${getStatusLabel(status)}`, 'success')
    await load()
  } catch (error) {
    console.error('updateStatus error:', error)
    showToast('更新失敗', 'error')
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

  useEffect(() => {
    const timer = setInterval(() => {
      forceNow(Date.now())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const visibleTicketsByStation = useMemo(() => {
    const openOrders = orders.filter((order) => isOpenStatus(order.status))
    const grouped: Record<MenuStation, VisibleTicket[]> = {
      main: [],
      side: [],
      dessert_drink: [],
    }

    for (const order of openOrders) {
      const items = Array.isArray(order.items) ? order.items : []
      const displayTime = order.kds_sent_at || order.created_at
      const elapsedMinutes = getElapsedMinutes(displayTime)

      let urgencyWeight = 0
      if (elapsedMinutes >= 20) urgencyWeight = 2
      else if (elapsedMinutes >= 10) urgencyWeight = 1

      for (const station of STATION_COLUMNS.map((x) => x.key)) {
        const stationItems = items.filter((item) => normalizeStation(item) === station)

        if (!stationItems.length) continue

        const realOrderId = order.order_id || order.id
const realBatchId = order.batch_id || order.id

grouped[station].push({
  order_id: realOrderId,
  batch_id: realBatchId,
  batch_no: order.batch_no || null,
  table_name: order.table_name || '未指定桌位',
  status: normalizeStatus(order.status) || 'new',
  created_at: displayTime || new Date().toISOString(),
  station,
  elapsedMinutes,
  urgencyWeight,
  items: stationItems.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    station: normalizeStation(item),
  })),
})
      }
    }

    for (const station of STATION_COLUMNS.map((x) => x.key)) {
      grouped[station].sort((a, b) => {
        if (a.urgencyWeight !== b.urgencyWeight) {
          return b.urgencyWeight - a.urgencyWeight
        }

        if (a.elapsedMinutes !== b.elapsedMinutes) {
          return b.elapsedMinutes - a.elapsedMinutes
        }

        const aStatusWeight =
          normalizeStatus(a.status) === 'new'
            ? 0
            : normalizeStatus(a.status) === 'preparing'
            ? 1
            : normalizeStatus(a.status) === 'ready'
            ? 2
            : 9

        const bStatusWeight =
          normalizeStatus(b.status) === 'new'
            ? 0
            : normalizeStatus(b.status) === 'preparing'
            ? 1
            : normalizeStatus(b.status) === 'ready'
            ? 2
            : 9

        if (aStatusWeight !== bStatusWeight) {
          return aStatusWeight - bStatusWeight
        }

        const aTime = new Date(a.created_at || 0).getTime()
        const bTime = new Date(b.created_at || 0).getTime()
        return aTime - bTime
      })
    }

    return grouped
  }, [orders])

  return (
    <main className="min-h-screen bg-neutral-900 p-6 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">廚房 KDS</h1>
          <div className="mt-2 text-sm text-neutral-400">
            三欄同步顯示 / 10 分鐘黃警示 / 20 分鐘紅警示 / 新單聲音提醒
          </div>
        </div>

        <button
          onClick={load}
          className="rounded-2xl bg-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-600"
        >
          重新整理
        </button>
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
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {STATION_COLUMNS.map((column) => (
            <section
              key={column.key}
              className="rounded-3xl border border-white/10 bg-neutral-850 bg-neutral-900/70 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{column.label}</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-300">
                  {visibleTicketsByStation[column.key].length}
                </span>
              </div>

              {visibleTicketsByStation[column.key].length === 0 ? (
                <div className="rounded-2xl bg-neutral-800 p-6 text-center text-neutral-400">
                  目前沒有待處理訂單
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleTicketsByStation[column.key].map((ticket) => {
                    const currentStatus = normalizeStatus(ticket.status)
                    const isUpdating = updatingOrderId === ticket.batch_id
                    const cardClassName = getCardClassName(ticket.elapsedMinutes)
                    const waitBadgeClassName = getWaitBadgeClassName(ticket.elapsedMinutes)

                    return (
                      <div
                        key={`${ticket.batch_id}-${ticket.station}`}
                        className={`rounded-2xl border p-4 shadow transition ${cardClassName}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
  <div className="text-xl font-bold">{ticket.table_name}</div>
  <div className="mt-1 text-sm text-neutral-400">
    {formatTime(ticket.created_at)}
    {ticket.batch_no ? ` · 批次 ${ticket.batch_no}` : ''}
  </div>
</div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                ticket.status
                              )}`}
                            >
                              {getStatusLabel(ticket.status)}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${waitBadgeClassName}`}
                            >
                              {getWaitLabel(ticket.elapsedMinutes)} · {ticket.elapsedMinutes} 分
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {ticket.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2"
                            >
                              <div className="pr-3 text-base font-medium leading-snug">
                                {item.name}
                              </div>
                              <div className="text-lg font-bold">x{item.qty}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex gap-2">
                          {currentStatus === 'new' && (
                            <button
                              onClick={async () => {
  setUpdatingOrderId(ticket.batch_id)
  await updateStatus(ticket.batch_id, 'preparing')
}}
                              disabled={isUpdating}
                              className="flex-1 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating ? '更新中...' : '開始製作'}
                            </button>
                          )}

                          {currentStatus === 'preparing' && (
                            <button
                              onClick={async () => {
  setUpdatingOrderId(ticket.batch_id)
  await updateStatus(ticket.batch_id, 'ready')
}}
                              disabled={isUpdating}
                              className="flex-1 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating ? '更新中...' : '完成'}
                            </button>
                          )}

                          {currentStatus === 'ready' && (
                            <button
                              onClick={async () => {
  setUpdatingOrderId(ticket.batch_id)
  await updateStatus(ticket.batch_id, 'served')
}}
                              disabled={isUpdating}
                              className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating ? '更新中...' : '已送出'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  )
}