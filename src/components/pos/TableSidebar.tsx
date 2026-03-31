'use client'

import type { SessionStaff, TableRow } from '@/lib/types'

function getTableBadge(status: string) {
  if (status === 'ready') {
    return {
      dot: 'bg-green-400',
      badge: 'bg-green-500/15 text-green-300',
      text: '可出餐',
    }
  }

  if (status === 'preparing') {
    return {
      dot: 'bg-yellow-400',
      badge: 'bg-yellow-500/15 text-yellow-300',
      text: '製作中',
    }
  }

  if (status === 'new' || status === 'occupied') {
    return {
      dot: 'bg-red-400',
      badge: 'bg-red-500/15 text-red-300',
      text: '使用中',
    }
  }

  return {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300',
    text: '空桌',
  }
}

export default function TableSidebar({
  staff,
  tables,
  selectedTableId,
  onSelectTable,
}: {
  staff: SessionStaff
  tables: TableRow[]
  selectedTableId: string | null
  onSelectTable: (id: string) => void
}) {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="flex h-full flex-col rounded-3xl bg-[#111111] p-4 text-white shadow-sm">
      <div className="mb-5">
        <div className="text-2xl font-bold">POS</div>
        <div className="mt-2 text-sm text-neutral-400">
          {staff.name} / {staff.role}
        </div>
      </div>

      <div className="mb-3 text-sm font-semibold text-neutral-400">桌位列表</div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {tables.map((table) => {
          const active = selectedTableId === table.id
          const badge = getTableBadge(table.status)

          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table.id)}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${badge.dot}`} />
                    <div className="truncate text-base font-semibold">
                      {table.name}
                    </div>
                  </div>

                  <div
                    className={`mt-2 text-xs ${
                      active ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    狀態：{table.status}
                  </div>
                </div>

                <div
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${badge.badge}`}
                >
                  {badge.text}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-2">
        <a
          href="/admin"
          className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
        >
          後台管理
        </a>

        <a
          href="/kitchen"
          className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
        >
          廚房 KDS
        </a>

        <button
          onClick={handleLogout}
          className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          登出
        </button>
      </div>
    </aside>
  )
}