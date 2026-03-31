'use client'

import { useEffect, useState } from 'react'

type TableItem = {
  id: string
  name: string
  status: string
}

export default function TableManager() {
  const [tables, setTables] = useState<TableItem[]>([])
  const [name, setName] = useState('')

  async function load() {
    const res = await fetch('/api/tables')
    const data = await res.json()
    setTables(Array.isArray(data) ? data : [])
  }

  async function create() {
    if (!name) return

    await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    setName('')
    load()
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-3xl font-bold">桌位管理</h1>

        <div className="mb-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="桌號"
            className="rounded-xl border px-3 py-2"
          />
          <button
            onClick={create}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            新增
          </button>
        </div>

        <div className="space-y-2">
          {tables.map((t) => (
            <div key={t.id} className="rounded-2xl border p-4">
              {t.name} - {t.status}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}