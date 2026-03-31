import Link from 'next/link'
import { requireAdminAccess } from '@/lib/auth'

export default async function AdminPage() {
  const staff = await requireAdminAccess()

  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold">後台管理</h1>

        <p className="mt-4 text-xl text-neutral-500">
          目前登入：{staff.name} / {staff.role}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Link
            href="/admin/orders"
            className="rounded-2xl border border-neutral-300 px-6 py-5 text-center text-lg font-semibold hover:bg-neutral-100"
          >
            訂單管理
          </Link>

          <Link
            href="/admin/orders?view=paid"
            className="rounded-2xl border border-neutral-300 px-6 py-5 text-center text-lg font-semibold hover:bg-neutral-100"
          >
            已結帳
          </Link>

          <Link
            href="/admin/menu"
            className="rounded-2xl border border-neutral-300 px-6 py-5 text-center text-lg font-semibold hover:bg-neutral-100"
          >
            菜單管理
          </Link>

          <Link
            href="/admin/tables"
            className="rounded-2xl border border-neutral-300 px-6 py-5 text-center text-lg font-semibold hover:bg-neutral-100"
          >
            桌位管理
          </Link>

          <Link
            href="/admin/staff"
            className="rounded-2xl border border-neutral-300 px-6 py-5 text-center text-lg font-semibold hover:bg-neutral-100"
          >
            員工管理
          </Link>

          <Link
            href="/kitchen"
            className="rounded-2xl border border-neutral-300 px-6 py-5 text-center text-lg font-semibold hover:bg-neutral-100"
          >
            廚房 KDS
          </Link>
        </div>
      </div>
    </main>
  )
}