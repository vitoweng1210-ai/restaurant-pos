'use client'

import { useEffect, useMemo, useState } from 'react'

type PaymentMethod = 'cash' | 'card' | 'linepay'

type Props = {
  open: boolean
  onClose: () => void
  subtotal: number
  serviceChargeEnabled: boolean
  onToggleServiceCharge: (enabled: boolean) => void
  onConfirm: (payload: {
    paymentMethod: PaymentMethod
    subtotal: number
    serviceCharge: number
    total: number
    receivedAmount: number
    changeAmount: number
  }) => Promise<void> | void
}

const QUICK_AMOUNTS = [100, 500, 1000]

export default function PaymentDrawer({
  open,
  onClose,
  subtotal,
  serviceChargeEnabled,
  onToggleServiceCharge,
  onConfirm,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (!open) {
      setPaymentMethod('cash')
      setInputValue('')
    }
  }, [open])

  const serviceCharge = useMemo(() => {
    if (!serviceChargeEnabled) return 0
    return Math.round(subtotal * 0.1)
  }, [subtotal, serviceChargeEnabled])

  const total = subtotal + serviceCharge

  const receivedAmount = Number(inputValue || 0)
  const changeAmount = Math.max(receivedAmount - total, 0)
  const isEnough = paymentMethod !== 'cash' || receivedAmount >= total

  function appendNumber(num: string) {
    setInputValue((prev) => {
      if (prev === '0') return num
      return `${prev}${num}`
    })
  }

  function clearAll() {
    setInputValue('')
  }

  function backspace() {
    setInputValue((prev) => prev.slice(0, -1))
  }

  function addQuickAmount(amount: number) {
    setInputValue(String(receivedAmount + amount))
  }

  async function handleConfirm() {
    if (total <= 0) return

    const finalReceived =
      paymentMethod === 'cash' ? receivedAmount : total

    const finalChange =
      paymentMethod === 'cash'
        ? Math.max(finalReceived - total, 0)
        : 0

    if (paymentMethod === 'cash' && finalReceived < total) {
      alert('實收金額不足')
      return
    }

    await onConfirm({
      paymentMethod,
      subtotal,
      serviceCharge,
      total,
      receivedAmount: finalReceived,
      changeAmount: finalChange,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-xl font-bold">結帳</h2>
            <button
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              關閉
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <div className="rounded-2xl border p-4">
                <div className="mb-3 text-sm font-semibold text-gray-500">
                  付款方式
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                      paymentMethod === 'cash'
                        ? 'border-black bg-black text-white'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    現金
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                      paymentMethod === 'card'
                        ? 'border-black bg-black text-white'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    刷卡
                  </button>

                  <button
                    onClick={() => setPaymentMethod('linepay')}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                      paymentMethod === 'linepay'
                        ? 'border-black bg-black text-white'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    LINE Pay
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-500">
                    服務費
                  </div>

                  <button
                    onClick={() => onToggleServiceCharge(!serviceChargeEnabled)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      serviceChargeEnabled
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {serviceChargeEnabled ? '已開啟 10%' : '未收取'}
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">小計</span>
                    <span>${subtotal}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">服務費</span>
                    <span>${serviceCharge}</span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2 text-lg font-bold">
                    <span>應收</span>
                    <span>${total}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 text-sm font-semibold text-gray-500">
                  實收金額
                </div>

                <div className="mb-3 rounded-2xl bg-gray-50 px-4 py-4 text-right text-3xl font-bold">
                  ${paymentMethod === 'cash' ? receivedAmount : total}
                </div>

                {paymentMethod === 'cash' ? (
                  <>
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      {QUICK_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => addQuickAmount(amount)}
                          className="rounded-xl border px-3 py-3 text-sm font-medium hover:bg-gray-50"
                        >
                          +{amount}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
                        (n) => (
                          <button
                            key={n}
                            onClick={() => appendNumber(n)}
                            className="rounded-2xl border px-3 py-4 text-xl font-semibold hover:bg-gray-50"
                          >
                            {n}
                          </button>
                        )
                      )}

                      <button
                        onClick={clearAll}
                        className="rounded-2xl border px-3 py-4 text-base font-semibold hover:bg-gray-50"
                      >
                        清除
                      </button>

                      <button
                        onClick={() => appendNumber('0')}
                        className="rounded-2xl border px-3 py-4 text-xl font-semibold hover:bg-gray-50"
                      >
                        0
                      </button>

                      <button
                        onClick={backspace}
                        className="rounded-2xl border px-3 py-4 text-base font-semibold hover:bg-gray-50"
                      >
                        刪除
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    非現金付款預設為足額收款
                  </div>
                )}
              </div>

              <div className="rounded-2xl border p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">付款方式</span>
                    <span className="font-medium">
                      {paymentMethod === 'cash'
                        ? '現金'
                        : paymentMethod === 'card'
                        ? '刷卡'
                        : 'LINE Pay'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">應收</span>
                    <span className="font-medium">${total}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">實收</span>
                    <span className="font-medium">
                      $
                      {paymentMethod === 'cash' ? receivedAmount : total}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2 text-lg font-bold">
                    <span>找零</span>
                    <span>${paymentMethod === 'cash' ? changeAmount : 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t p-5">
            <button
              onClick={handleConfirm}
              disabled={!isEnough || total <= 0}
              className="w-full rounded-2xl bg-black px-4 py-4 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              確認結帳
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}