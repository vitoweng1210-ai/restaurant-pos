'use client'

import { useMemo, useState } from 'react'
import type { CurrentOrder, TableRow } from '@/lib/types'
import type { CartItem } from '@/components/pos/PosShell'

const PAYMENT_OPTIONS = [
  { value: 'cash', label: '現金' },
  { value: 'card', label: '刷卡' },
  { value: 'linepay', label: 'LINE Pay' },
]

export default function OrderPanel({
  tables,
  selectedTableId,
  cart,
  total,
  currentOrder,
  onIncrease,
  onDecrease,
  onRemove,
  onSubmit,
  onPay,
  submitting,
  paying,
}: {
  tables: TableRow[]
  selectedTableId: string | null
  cart: CartItem[]
  total: number
  currentOrder: CurrentOrder
  onIncrease: (menuId: string) => void
  onDecrease: (menuId: string) => void
  onRemove: (menuId: string) => void
  onSubmit: () => void
  onPay: (paymentMethod: string, receivedAmount: number) => void
  submitting: boolean
  paying: boolean
}) {
  const [tab, setTab] = useState<'cart' | 'checkout'>('cart')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashInput, setCashInput] = useState('')

  const table = tables.find((t) => t.id === selectedTableId)

  const orderTotal = Number(currentOrder?.total || 0)
  const receivedAmount = Number(cashInput || 0)

  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0
    return Math.max(receivedAmount - orderTotal, 0)
  }, [paymentMethod, receivedAmount, orderTotal])

  function appendCashInput(value: string) {
    setCashInput((prev) => {
      if (prev === '0') return value
      return `${prev}${value}`
    })
  }

  function clearCashInput() {
    setCashInput('')
  }

  function backspaceCashInput() {
    setCashInput((prev) => prev.slice(0, -1))
  }

  async function handlePay() {
    if (!currentOrder) {
      alert('目前沒有可結帳訂單')
      return
    }

    if (paymentMethod === 'cash' && receivedAmount < orderTotal) {
      alert('收款金額不足')
      return
    }

    await onPay(paymentMethod, receivedAmount)
    setCashInput('')
    setTab('cart')
  }

  return (
    <aside className="flex h-full flex-col rounded-3xl bg-white p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-2xl font-bold">{table ? table.name : '未選擇桌位'}</div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setTab('cart')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              tab === 'cart' ? 'bg-black text-white' : 'bg-neutral-100'
            }`}
          >
            點餐
          </button>
          <button
            onClick={() => setTab('checkout')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              tab === 'checkout' ? 'bg-black text-white' : 'bg-neutral-100'
            }`}
          >
            結帳
          </button>
        </div>
      </div>

      {tab === 'cart' ? (
        <>
          <div className="mb-3 rounded-2xl bg-neutral-50 p-4">
            <div className="text-sm font-semibold text-neutral-500">整桌目前未結帳</div>

            {!currentOrder ? (
              <div className="mt-2 text-sm text-neutral-500">目前沒有已送出訂單</div>
            ) : (
              <div className="mt-3 space-y-2">
                {currentOrder.items.map((item) => (
                  <div key={item.menu_id} className="flex items-center justify-between">
                    <div>
                      {item.name} x {item.qty}
                    </div>
                    <div>NT$ {item.qty * item.price}</div>
                  </div>
                ))}
                <div className="border-t pt-2 text-right font-bold">
                  已送出小計 NT$ {currentOrder.total}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            <div className="text-sm font-semibold text-neutral-500">
              本次加點 / 新點單
            </div>

            {cart.length === 0 ? (
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                尚未加入商品
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.menu_id}
                  className="rounded-2xl border border-neutral-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="mt-1 text-sm text-neutral-500">
                        NT$ {item.price}
                      </div>
                    </div>

                    <button
                      onClick={() => onRemove(item.menu_id)}
                      className="text-sm font-semibold text-red-500"
                    >
                      刪除
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => onDecrease(item.menu_id)}
                      className="rounded-xl border px-3 py-1"
                    >
                      -
                    </button>
                    <div className="min-w-8 text-center font-semibold">{item.qty}</div>
                    <button
                      onClick={() => onIncrease(item.menu_id)}
                      className="rounded-xl border px-3 py-1"
                    >
                      +
                    </button>
                    <div className="ml-auto font-semibold">
                      NT$ {item.qty * item.price}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="mb-2 flex items-center justify-between text-base font-semibold">
              <span>本次送單</span>
              <span>NT$ {total}</span>
            </div>

            {currentOrder && (
              <div className="mb-4 flex items-center justify-between text-lg font-bold">
                <span>整桌累計</span>
                <span>NT$ {currentOrder.total + total}</span>
              </div>
            )}

            <button
              onClick={onSubmit}
              disabled={!cart.length || submitting}
              className="w-full rounded-2xl bg-black px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? '送單中...' : currentOrder ? '加點送出' : '送單'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            {!currentOrder ? (
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                目前沒有可結帳訂單
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-2 text-sm text-neutral-500">目前訂單狀態</div>
                  <div className="text-lg font-bold">{currentOrder.status}</div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-3 text-sm font-semibold text-neutral-500">
                    整桌未結帳內容
                  </div>

                  <div className="space-y-2">
                    {currentOrder.items.map((item) => (
                      <div key={item.menu_id} className="flex items-center justify-between">
                        <div>
                          {item.name} x {item.qty}
                        </div>
                        <div>NT$ {item.qty * item.price}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t pt-3 text-right text-lg font-bold">
                    總計 NT$ {currentOrder.total}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-4">
                  <div className="mb-3 text-sm font-semibold text-neutral-500">
                    付款方式
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPaymentMethod(option.value)}
                        className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                          paymentMethod === option.value
                            ? 'bg-black text-white'
                            : 'bg-neutral-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <div className="mb-3 text-sm font-semibold text-neutral-500">
                      收款金額
                    </div>

                    <div className="mb-3 rounded-2xl bg-neutral-100 px-4 py-4 text-right text-3xl font-bold">
                      {cashInput || '0'}
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '←'].map(
                        (key) => (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === '←') {
                                backspaceCashInput()
                                return
                              }
                              appendCashInput(key)
                            }}
                            className="rounded-2xl bg-neutral-100 px-4 py-4 text-lg font-bold"
                          >
                            {key}
                          </button>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[100, 500, 1000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setCashInput(String(amount))}
                          className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                        >
                          {amount}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={clearCashInput}
                      className="mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
                    >
                      清除
                    </button>

                    <div className="mt-4 space-y-2 rounded-2xl bg-neutral-50 p-4">
                      <div className="flex items-center justify-between">
                        <span>應收</span>
                        <span className="font-bold">NT$ {orderTotal}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>實收</span>
                        <span className="font-bold">NT$ {receivedAmount}</span>
                      </div>
                      <div className="flex items-center justify-between text-lg">
                        <span>找零</span>
                        <span className="font-bold">NT$ {change}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 border-t pt-4">
            <button
              onClick={handlePay}
              disabled={!currentOrder || paying}
              className="w-full rounded-2xl bg-black px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {paying ? '結帳中...' : '確認結帳'}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}