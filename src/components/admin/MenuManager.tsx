'use client'

import { useEffect, useState } from 'react'

type MenuItem = {
  id: string
  name: string
  price: number
  is_active: boolean
  station?: string
}

export default function MenuManager() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [station, setStation] = useState('main')

  async function load() {
    const res = await fetch('/api/menu')
    const data = await res.json()
    setMenu(Array.isArray(data) ? data : [])
  }

  async function create() {
    if (!name || !price) return

    await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        price: Number(price),
        station,
      }),
    })

    setName('')
    setPrice('')
    setStation('main')
    load()
  }

  async function toggle(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_active: !item.is_active,
      }),
    })

    load()
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-3xl font-bold">菜單管理</h1>

        <div className="mb-6 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            placeholder="名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border px-3 py-2"
          />
          <input
            placeholder="價格"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-xl border px-3 py-2"
          />
          <select
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="main">主餐</option>
            <option value="side">附餐</option>
            <option value="dessert_drink">飲料甜點</option>
          </select>
          <button
            onClick={create}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            新增
          </button>
        </div>

        <div className="space-y-3">
          {menu.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border p-4"
            >
              <div>
                {item.name} - NT$ {item.price} / {item.station || 'main'}
              </div>

              <button
                onClick={() => toggle(item)}
                className="rounded-xl border px-3 py-2"
              >
                {item.is_active ? '下架' : '上架'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}