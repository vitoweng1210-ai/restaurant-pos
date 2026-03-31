import AutoPrint from '@/components/print/AutoPrint'

type Ticket = {
  order_id: string
  table_name: string
  created_at: string
  status: string
  printable_lines: string[]
}

async function getTicket(id: string): Promise<Ticket | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/orders/${id}/ticket`, {
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = await res.json()
    if (data?.error) return null

    return data
  } catch {
    return null
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ticket = await getTicket(id)

  if (!ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        找不到訂單
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-200 p-4 print:bg-white print:p-0">
      <AutoPrint />

      <div className="mx-auto w-[302px] bg-white p-3 text-[12px] leading-5 shadow print:w-[80mm] print:shadow-none">
        <div className="text-center text-[18px] font-bold">夜店 POS</div>
        <div className="text-center text-[12px]">收據明細</div>

        <div className="my-2 border-t border-dashed border-black" />

        <div>桌位：{ticket.table_name}</div>
        <div className="break-all">訂單：{ticket.order_id}</div>
        <div>
          時間：
          {new Date(ticket.created_at).toLocaleString('zh-TW', {
            hour12: false,
          })}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="space-y-1">
          {ticket.printable_lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <div className="mt-4 text-center text-[11px]">謝謝光臨</div>
      </div>
    </main>
  )
}