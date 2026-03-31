'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ReportOrder = {
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

type FilterKey = 'today' | 'paid' | 'unpaid'

export default function ReportDashboard() {
  const supabase = createClient()

  const [orders, setOrders] = useState<ReportOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('today')

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        table_id,
        status,
        total,
        payment_method,
        received_amount,
        change_amount,
        paid_at,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const mapped: ReportOrder[] = (data as any[]).map((order) => ({
        id: order.id,
        table_id: order.table_id,
        status: String(order.status || ''),
        total: Number(order.total || 0),
        payment_method: order.payment_method || null,
        received_amount:
          order.received_amount !== null ? Number(order.received_amount) : null,
        change_amount:
          order.change_amount !== null ? Number(order.change_amount) : null,
        paid_at: order.paid_at || null,
        created_at: order.created_at,
      }))

      setOrders(mapped)
    }

    setLoading(false)
  }

  function isToday(dateString: string | null) {
    if (!dateString) return false

    const date = new Date(dateString)
    const now = new Date()

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }

  function formatTime(time: string | null) {
    if (!time) return '-'
    return new Date(time).toLocaleString()
  }

  const todayOrders = useMemo(() => {
    return orders.filter((order) => isToday(order.created_at))
  }, [orders])

  const todayPaidOrders = useMemo(() => {
    return todayOrders.filter((order) => order.status === 'paid')
  }, [todayOrders])

  const todayUnpaidOrders = useMemo(() => {
    return todayOrders.filter((order) => order.status !== 'paid')
  }, [todayOrders])

  const todayRevenue = useMemo(() => {
    return todayPaidOrders.reduce((sum, order) => sum + order.total, 0)
  }, [todayPaidOrders])

  const todayCash = useMemo(() => {
    return todayPaidOrders
      .filter((order) => order.payment_method === 'cash')
      .reduce((sum, order) => sum + order.total, 0)
  }, [todayPaidOrders])

  const todayCard = useMemo(() => {
    return todayPaidOrders
      .filter((order) => order.payment_method === 'card')
      .reduce((sum, order) => sum + order.total, 0)
  }, [todayPaidOrders])

  const todayLinePay = useMemo(() => {
    return todayPaidOrders
      .filter((order) => order.payment_method === 'linepay')
      .reduce((sum, order) => sum + order.total, 0)
  }, [todayPaidOrders])

  const filteredOrders = useMemo(() => {
    switch (filter) {
      case 'paid':
        return todayPaidOrders
      case 'unpaid':
        return todayUnpaidOrders
      case 'today':
      default:
        return todayOrders
    }
  }, [filter, todayOrders, todayPaidOrders, todayUnpaidOrders])

  function filterButtonClass(key: FilterKey) {
    return `rounded-xl px-4 py-2 text-sm font-semibold ${
      filter === key
        ? 'bg-black text-white'
        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
    }`
  }

  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">日結報表</h1>
          <p className="mt-1 text-sm text-neutral-500">
            查看今日營業額、付款方式與訂單狀態
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">今日營業額</div>
            <div className="mt-2 text-3xl font-bold">NT$ {todayRevenue}</div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">今日訂單數</div>
            <div className="mt-2 text-3xl font-bold">{todayOrders.length}</div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">今日已付款</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {todayPaidOrders.length}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">今日未付款</div>
            <div className="mt-2 text-3xl font-bold text-orange-500">
              {todayUnpaidOrders.length}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">今日現金</div>
            <div className="mt-2 text-3xl font-bold">NT$ {todayCash}</div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">今日刷卡</div>
            <div className="mt-2 text-3xl font-bold">NT$ {todayCard}</div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-neutral-500">今日 LINE Pay</div>
            <div className="mt-2 text-3xl font-bold">NT$ {todayLinePay}</div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('today')}
              className={filterButtonClass('today')}
            >
              今日全部
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={filterButtonClass('paid')}
            >
              今日已付款
            </button>
            <button
              onClick={() => setFilter('unpaid')}
              className={filterButtonClass('unpaid')}
            >
              今日未付款
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-neutral-500">載入中...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-8 text-neutral-400">今天沒有符合條件的訂單</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="px-3 py-3">時間</th>
                    <th className="px-3 py-3">桌號</th>
                    <th className="px-3 py-3">狀態</th>
                    <th className="px-3 py-3">付款方式</th>
                    <th className="px-3 py-3">金額</th>
                    <th className="px-3 py-3">實收</th>
                    <th className="px-3 py-3">找零</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <td className="px-3 py-3">{formatTime(order.created_at)}</td>
                      <td className="px-3 py-3">
                        {order.table_id?.slice(0, 6) || '外帶'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            order.status === 'paid'
                              ? 'font-semibold text-green-600'
                              : 'font-semibold text-orange-500'
                          }
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">{order.payment_method || '-'}</td>
                      <td className="px-3 py-3">NT$ {order.total}</td>
                      <td className="px-3 py-3">
                        {order.received_amount !== null
                          ? `NT$ ${order.received_amount}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3">
                        {order.change_amount !== null
                          ? `NT$ ${order.change_amount}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}