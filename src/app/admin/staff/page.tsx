import { requireAdminOnly } from '@/lib/auth'
import StaffManager from '@/components/admin/StaffManager'

export default async function AdminStaffPage() {
  await requireAdminOnly()
  return <StaffManager />
}