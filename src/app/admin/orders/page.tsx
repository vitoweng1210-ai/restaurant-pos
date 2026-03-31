import { requireAdminAccess } from '@/lib/auth'
import OrderList from '@/components/admin/OrderList'

export default async function AdminOrdersPage() {
  await requireAdminAccess()
  return <OrderList />
}