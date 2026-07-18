'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSessionUserAsync } from '@/lib/session'

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    getSessionUserAsync().then(u => router.replace(u ? '/home' : '/login'))
  }, [router])
  return null
}
