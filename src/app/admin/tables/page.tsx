'use client'

import { useEffect, useState } from 'react'

type Table = {
  id: string
  name: string
  status: string
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/tables', { cache: 'no-store' })
      const data = await res.json()
      setTables(data || [])
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className="p-6">載入中...</div>
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">桌位管理</h1>

      <div className="grid gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="flex items-center justify-between border rounded-xl p-4"
          >
            <div>
              <div className="font-bold">{table.name}</div>
              <div className="text-sm text-gray-500">{table.status}</div>
            </div>

            <div className="flex items-center gap-3">
  <a
    href={`/qr/${table.id}`}
    target="_blank"
    className="text-blue-500 underline text-sm"
  >
    QR點餐
  </a>

  <a
    href={`/admin/tables/${table.id}/qr`}
    target="_blank"
    className="text-green-600 underline text-sm"
  >
    列印桌貼
  </a>
</div>
          </div>
        ))}
      </div>
    </main>
  )
}