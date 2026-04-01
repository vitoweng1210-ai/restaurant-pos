'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  type: ToastType
}

type ToastContextValue = {
  showToast: (title: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((title: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    const nextToast: ToastItem = { id, title, type }

    setToasts((prev) => [...prev, nextToast])

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 2600)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[320px] max-w-[calc(100vw-32px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur ${
              toast.type === 'success'
                ? 'border-emerald-300 bg-emerald-500 text-white'
                : toast.type === 'error'
                ? 'border-red-300 bg-red-500 text-white'
                : 'border-neutral-300 bg-neutral-900 text-white'
            }`}
          >
            {toast.title}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}