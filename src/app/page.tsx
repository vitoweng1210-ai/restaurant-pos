import Link from 'next/link'
import { getSessionStaff } from '@/lib/auth'

export default async function HomePage() {
  const staff = await getSessionStaff()

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-sm">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Restaurant POS</h1>
            <p className="mt-3 text-sm text-neutral-500">
              Next.js + Supabase
            </p>
          </div>

          {staff ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-lg font-semibold">{staff.name}</div>
                <div className="text-sm text-neutral-500">{staff.email}</div>
                <div className="mt-2 inline-flex rounded-full bg-black px-3 py-1 text-xs text-white">
                  {staff.role}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/pos"
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white"
                >
                  進入 POS
                </Link>

                <Link
                  href="/kitchen"
                  className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-semibold"
                >
                  進入廚房
                </Link>

                {(staff.role === 'manager' || staff.role === 'admin') && (
                  <Link
                    href="/admin"
                    className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-semibold"
                  >
                    進入後台
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white"
              >
                前往登入
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}