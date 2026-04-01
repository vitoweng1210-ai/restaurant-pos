'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'

type MenuItem = {
  id: string
  name: string
  price: number
  category_id: string | null
  is_active?: boolean
}

type Category = {
  id: string
  name: string
}

export default function QrOrderPage() {
  const params = useParams()
  const tableId = params.tableId as string
  const { showToast } = useToast()

  const [menu, setMenu] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setErrorText('')

        const [menuRes, categoryRes] = await Promise.all([
          fetch('/api/menu', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ])

        const menuText = await menuRes.text()
        const categoryText = await categoryRes.text()

        let menuData: unknown = []
        let categoryData: unknown = []

        try {
          menuData = menuText ? JSON.parse(menuText) : []
        } catch {
          throw new Error('/api/menu 不是有效 JSON')
        }

        try {
          categoryData = categoryText ? JSON.parse(categoryText) : []
        } catch {
          throw new Error('/api/categories 不是有效 JSON')
        }

        if (!menuRes.ok) {
          const err =
            typeof menuData === 'object' && menuData && 'error' in menuData
              ? String((menuData as { error?: unknown }).error || '')
              : ''
          throw new Error(err || '讀取菜單失敗')
        }

        if (!categoryRes.ok) {
          const err =
            typeof categoryData === 'object' && categoryData && 'error' in categoryData
              ? String((categoryData as { error?: unknown }).error || '')
              : ''
          throw new Error(err || '讀取分類失敗')
        }

        setMenu(
          Array.isArray(menuData)
            ? menuData.filter((x) => (x as MenuItem).is_active !== false)
            : []
        )
        setCategories(Array.isArray(categoryData) ? categoryData : [])
      } catch (error) {
        console.error('QR load error:', error)
        setErrorText(error instanceof Error ? error.message : '載入失敗')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  function add(id: string) {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }))
  }

  function remove(id: string) {
    setCart((prev) => {
      const next = { ...prev }
      if (!next[id]) return next
      next[id] -= 1
      if (next[id] <= 0) delete next[id]
      return next
    })
  }

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  }, [cart])

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [menuId, qty]) => {
      const item = menu.find((x) => x.id === menuId)
      return sum + (item?.price || 0) * qty
    }, 0)
  }, [cart, menu])

  async function submit() {
    try {
      const items = Object.entries(cart).map(([menu_id, qty]) => {
        const m = menu.find((x) => x.id === menu_id)
        return {
          menu_id,
          qty,
          price: m?.price || 0,
        }
      })

      if (!items.length) {
        showToast('請先選擇商品', 'error')
        return
      }

      setSubmitting(true)

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          items,
        }),
      })

      const text = await res.text()

      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }

      if (!res.ok) {
        showToast(data?.error || '送單失敗', 'error')
        return
      }

      showToast('送單成功', 'success')
      setCart({})
    } catch (error) {
      console.error('QR submit error:', error)
      showToast('送單失敗', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6">載入中...</div>
  }

  if (errorText) {
    return (
      <main className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          載入失敗：{errorText}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-100 p-4">
      <div className="mx-auto max-w-md space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm text-neutral-500">桌號</div>
          <div className="text-2xl font-bold">{tableId}</div>
        </div>

        {categories.map((cat) => {
          const items = menu.filter((m) => m.category_id === cat.id)
          if (!items.length) return null

          return (
            <section key={cat.id} className="space-y-3">
              <h2 className="text-lg font-bold">{cat.name}</h2>

              <div className="grid gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">{item.name}</div>
                        <div className="mt-1 text-sm text-neutral-500">${item.price}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => remove(item.id)}
                          className="h-9 w-9 rounded-full bg-neutral-200 text-lg"
                        >
                          -
                        </button>
                        <span className="min-w-6 text-center font-bold">
                          {cart[item.id] || 0}
                        </span>
                        <button
                          onClick={() => add(item.id)}
                          className="h-9 w-9 rounded-full bg-black text-lg text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        <div className="h-24" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-500">已選 {cartCount} 項</div>
            <div className="text-lg font-bold">${cartTotal}</div>
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-black px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? '送單中...' : '送出訂單'}
          </button>
        </div>
      </div>
    </main>
  )
}