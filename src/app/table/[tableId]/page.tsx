import { requireStaff } from '@/lib/auth'

export default async function TableOrderPage() {
  await requireStaff()

  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">桌邊點餐頁</h1>
      </div>
    </main>
  )
}