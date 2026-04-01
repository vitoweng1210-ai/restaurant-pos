'use client'

import { useEffect } from 'react'

export default function AutoPrint() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.print()
    }, 300)

    const handleAfterPrint = () => {
      window.close()
    }

    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  return null
}