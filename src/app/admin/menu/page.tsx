import { requireAdminAccess } from '@/lib/auth'
import MenuManager from '@/components/admin/MenuManager'

export default async function AdminMenuPage() {
  await requireAdminAccess()
  return <MenuManager />
}