'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('admin@test.com')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登入失敗')
        setLoading(false)
        return
      }

      if (data.role === 'manager' || data.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/pos')
      }

      router.refresh()
    } catch {
      setError('系統錯誤，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">員工登入</h1>
          <p className="mt-2 text-sm text-neutral-500">請輸入帳號密碼</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none"
              placeholder="請輸入 email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none"
              placeholder="請輸入密碼"
            />
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </main>
  )
}