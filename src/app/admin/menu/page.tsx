'use client'

import { useEffect, useState } from 'react'

type MenuRow = {
  id: string
  name: string
  price: number
  category_id: string | null
  station: 'main' | 'side' | 'dessert_drink' | null
}

type CategoryRow = {
  id: string
  name: string
}

const STATION_OPTIONS = [
  { value: 'main', label: '主餐' },
  { value: 'side', label: '附餐' },
  { value: 'dessert_drink', label: '飲料甜點' },
]

export default function AdminMenuPage() {
  const [menu, setMenu] = useState<MenuRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    try {
      const [menuRes, categoryRes] = await Promise.all([
        fetch('/api/menu', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ])

      const menuData = await menuRes.json()
      const categoryData = await categoryRes.json()

      setMenu(Array.isArray(menuData) ? menuData : [])
      setCategories(Array.isArray(categoryData) ? categoryData : [])
    } catch (err) {
      console.error(err)
      alert('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function updateStation(id: string, station: string) {
    try {
      setSavingId(id)

      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '更新失敗')
        return
      }

      setMenu((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, station } : item
        )
      )
    } catch (err) {
      console.error(err)
      alert('更新失敗')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return <div className="p-6">載入中...</div>
  }

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">菜單管理</h1>

      <div className="grid gap-4">
        {menu.map((item) => {
          const category = categories.find(
            (c) => c.id === item.category_id
          )

          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border p-4"
            >
              <div>
                <div className="font-bold">{item.name}</div>
                <div className="text-sm text-gray-500">
                  {category?.name || '未分類'} / ${item.price}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={item.station || 'main'}
                onChange={(e) =>
  updateStation(
    item.id,
    e.target.value as 'main' | 'side' | 'dessert_drink'
  )
}  
                  className="rounded border px-3 py-2"
                >
                  {STATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {savingId === item.id && (
                  <span className="text-sm text-gray-500">
                    儲存中...
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}