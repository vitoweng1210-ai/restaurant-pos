import { requireAdminAccess } from '@/lib/auth'
import TableManager from '@/components/admin/TableManager'

export default async function AdminTablesPage() {
  await requireAdminAccess()
  return <TableManager />
}