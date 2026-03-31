import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { SessionStaff } from '@/lib/types'

const COOKIE_NAME = 'pos_staff_session'

export async function getSessionStaff(): Promise<SessionStaff | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value

  if (!raw) return null

  try {
    return JSON.parse(raw) as SessionStaff
  } catch {
    return null
  }
}

export async function requireStaff() {
  const staff = await getSessionStaff()

  if (!staff) {
    redirect('/login')
  }

  return staff
}

export async function requireAdminAccess() {
  const staff = await requireStaff()

  if (staff.role !== 'manager' && staff.role !== 'admin') {
    redirect('/pos')
  }

  return staff
}

export async function requireAdminOnly() {
  const staff = await requireStaff()

  if (staff.role !== 'admin') {
    redirect('/admin')
  }

  return staff
}