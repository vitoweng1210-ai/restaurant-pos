'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CategoryRow,
  CurrentOrder,
  MenuRow,
  SessionStaff,
  TableRow,
} from '@/lib/types'
import TableSidebar from '@/components/pos/TableSidebar'
import MenuGrid from '@/components/pos/MenuGrid'
import OrderPanel from '@/components/pos/OrderPanel'

export type CartItem = {
  menu_id: string
  name: string
  price: number
  qty: number
}

export default function PosShell({ staff }: { staff: SessionStaff }) {
  const [tables, setTables] = useState<TableRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [menu, setMenu] = useState<MenuRow[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const initializedRef = useRef(false)

  async function loadTablesOnly() {
    try {
      const res = await fetch('/api/tables', { cache: 'no-store' })
      const data = await res.json()

      if (Array.isArray(data)) {
        setTables(data)

        if (!selectedTableId && data.length > 0) {
          setSelectedTableId(data[0].id)
        }

        if (
          selectedTableId &&
          !data.some((table: TableRow) => table.id === selectedTableId)
        ) {
          setSelectedTableId(data[0]?.id || null)
        }
      }
    } catch (error) {
      console.error('讀取桌位失敗', error)
    }
  }

  async function loadCurrentOrder(tableId: string | null) {
    if (!tableId) {
      setCurrentOrder(null)
      return
    }

    try {
      const res = await fetch(`/api/tables/${tableId}/current-order`, {
        cache: 'no-store',
      })
      const data = await res.json()
      setCurrentOrder(data && !data.error ? data : null)
    } catch (error) {
      console.error('讀取目前訂單失敗', error)
      setCurrentOrder(null)
    }
  }

  async function loadAll() {
    try {
      const [tablesRes, categoriesRes, menuRes] = await Promise.all([
        fetch('/api/tables', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/menu', { cache: 'no-store' }),
      ])

      const [tablesData, categoriesData, menuData] = await Promise.all([
        tablesRes.json(),
        categoriesRes.json(),
        menuRes.json(),
      ])

      if (Array.isArray(tablesData)) {
        setTables(tablesData)

        if (!initializedRef.current && tablesData.length > 0) {
          setSelectedTableId(tablesData[0].id)
        }
      }

      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      setMenu(Array.isArray(menuData) ? menuData.filter((x) => x.is_active !== false) : [])

      initializedRef.current = true
    } catch (error) {
      console.error('載入 POS 資料失敗', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    loadCurrentOrder(selectedTableId)
    setCart([])
  }, [selectedTableId])

  useEffect(() => {
    const timer = setInterval(() => {
      loadTablesOnly()
      loadCurrentOrder(selectedTableId)
    }, 3000)

    return () => clearInterval(timer)
  }, [selectedTableId])

  const filteredMenu = useMemo(() => {
    if (selectedCategoryId === 'all') return menu
    return menu.filter((item) => item.category_id === selectedCategoryId)
  }, [menu, selectedCategoryId])

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  }, [cart])

  function addToCart(item: MenuRow) {
    setCart((prev) => {
      const found = prev.find((x) => x.menu_id === item.id)

      if (found) {
        return prev.map((x) =>
          x.menu_id === item.id ? { ...x, qty: x.qty + 1 } : x
        )
      }

      return [
        ...prev,
        {
          menu_id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
        },
      ]
    })
  }

  function increaseQty(menuId: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.menu_id === menuId ? { ...item, qty: item.qty + 1 } : item
      )
    )
  }

  function decreaseQty(menuId: string) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.menu_id === menuId ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    )
  }

  function removeItem(menuId: string) {
    setCart((prev) => prev.filter((item) => item.menu_id !== menuId))
  }

  async function submitOrder() {
    if (!selectedTableId) {
      alert('請先選擇桌位')
      return
    }

    if (!cart.length) {
      alert('請先加入商品')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTableId,
          items: cart.map((item) => ({
            menu_id: item.menu_id,
            qty: item.qty,
            price: item.price,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '送單失敗')
        return
      }

      alert(currentOrder ? '加點成功' : '送單成功')
      setCart([])
      await loadTablesOnly()
      await loadCurrentOrder(selectedTableId)
    } catch (error) {
      console.error('送單失敗', error)
      alert('送單失敗')
    } finally {
      setSubmitting(false)
    }
  }

  async function payOrder(paymentMethod: string, receivedAmount: number) {
    if (!currentOrder?.id) {
      alert('目前沒有可結帳訂單')
      return
    }

    setPaying(true)

    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          received_amount: receivedAmount,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '結帳失敗')
        return
      }

      if (paymentMethod === 'cash') {
        alert(`結帳成功，找零 NT$ ${data.change}`)
      } else {
        alert('結帳成功')
      }

      await loadTablesOnly()
      await loadCurrentOrder(selectedTableId)
      setCart([])
    } catch (error) {
      console.error('結帳失敗', error)
      alert('結帳失敗')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="text-lg font-semibold">載入中...</div>
      </main>
    )
  }

  return (
    <main className="h-screen bg-neutral-100 p-4">
      <div className="grid h-full grid-cols-[280px_1fr_420px] gap-4">
        <TableSidebar
          staff={staff}
          tables={tables}
          selectedTableId={selectedTableId}
          onSelectTable={setSelectedTableId}
        />

        <MenuGrid
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          items={filteredMenu}
          onAdd={addToCart}
        />

        <OrderPanel
          tables={tables}
          selectedTableId={selectedTableId}
          cart={cart}
          total={cartTotal}
          currentOrder={currentOrder}
          onIncrease={increaseQty}
          onDecrease={decreaseQty}
          onRemove={removeItem}
          onSubmit={submitOrder}
          onPay={payOrder}
          submitting={submitting}
          paying={paying}
        />
      </div>
    </main>
  )
}