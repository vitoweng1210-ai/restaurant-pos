import { requireStaff } from '@/lib/auth'
import PosShell from '@/components/pos/PosShell'

export default async function PosPage() {
  const staff = await requireStaff()

  return <PosShell staff={staff} />
}