'use client'

import { useState } from 'react'
import type { CurrentOrder, TableRow } from '@/lib/types'
import type { CartItem } from '@/components/pos/PosShell'

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
  onPay: () => void
  submitting: boolean
  paying: boolean
}) {
  const [tab, setTab] = useState<'cart' | 'checkout'>('cart')

  const table = tables.find((t) => t.id === selectedTableId)

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

                <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                  按下下方「確認結帳」後，會打開新的結帳面板。
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 border-t pt-4">
            <button
              onClick={onPay}
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