import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const metadata: Metadata = {
  title: 'Restaurant POS',
  description: 'Restaurant POS System',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-Hant">
      <body>
  <ToastProvider>{children}</ToastProvider>
</body>
    </html>
  )
}