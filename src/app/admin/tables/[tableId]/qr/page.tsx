'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'

type TableRow = {
  id: string
  name: string
  status?: string
}

export default function TableQrPage() {
  const params = useParams()
  const tableId = params.tableId as string

  const [table, setTable] = useState<TableRow | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/tables', { cache: 'no-store' })
      const data = await res.json()

      const found = Array.isArray(data)
        ? data.find((x: TableRow) => x.id === tableId)
        : null

      setTable(found || null)

      const url = `http://192.168.1.107:3000/qr/${tableId}`
      setQrUrl(url)

      const qr = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
      })

      setQrDataUrl(qr)
    }

    load()
  }, [tableId])

  function handlePrint() {
    window.print()
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white;
          }
        }
      `}</style>

      <main className="min-h-screen bg-neutral-100 p-6">
        <div className="no-print mb-6 flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            列印桌貼
          </button>
        </div>

        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow">
          <div className="text-center">
            <div className="text-sm text-neutral-500">掃碼點餐</div>
            <div className="mt-2 text-4xl font-bold">
              {table?.name || `桌號 ${tableId}`}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="h-72 w-72"
              />
            ) : (
              <div className="flex h-72 w-72 items-center justify-center text-neutral-400">
                產生中...
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-lg font-semibold">
            請使用手機掃描 QR Code 點餐
          </div>

          <div className="mt-3 break-all text-center text-xs text-neutral-400">
            {qrUrl || '產生中...'}
          </div>
        </div>
      </main>
    </>
  )
}