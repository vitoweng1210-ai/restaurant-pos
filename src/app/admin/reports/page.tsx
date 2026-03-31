import { requireAdminAccess } from '@/lib/auth'
import ReportDashboard from '@/components/admin/ReportDashboard'

export default async function AdminReportsPage() {
  await requireAdminAccess()
  return <ReportDashboard />
}