'use client'

import { useState } from 'react'

export default function StaffManager() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function create() {
    if (!email || !password) return

    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || '新增失敗')
      return
    }

    setEmail('')
    setPassword('')
    alert('新增完成')
  }

  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-3xl font-bold">員工管理</h1>

        <div className="flex gap-2">
          <input
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border px-3 py-2"
          />
          <input
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border px-3 py-2"
          />
          <button
            onClick={create}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            新增員工
          </button>
        </div>
      </div>
    </main>
  )
}