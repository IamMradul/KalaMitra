'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle Google session from OAuth callback
    const googleSession = searchParams.get('google_session')
    if (googleSession) {
      try {
        const googleUser = JSON.parse(decodeURIComponent(googleSession))
        localStorage.setItem('googleUserSession', JSON.stringify(googleUser))
        console.log('Google session stored:', googleUser)
        // Reload the page to trigger auth context update
        window.location.href = window.location.pathname
        return
      } catch (error) {
        console.error('Error parsing Google session:', error)
      }
    }

    // Handle Microsoft session from OAuth callback
    const microsoftSession = searchParams.get('microsoft_session')
    if (microsoftSession) {
      try {
        const microsoftUser = JSON.parse(decodeURIComponent(microsoftSession))
        localStorage.setItem('microsoftUserSession', JSON.stringify(microsoftUser))
        console.log('Microsoft session stored:', microsoftUser)
        // Reload the page to trigger auth context update
        window.location.href = window.location.pathname
        return
      } catch (error) {
        console.error('Error parsing Microsoft session:', error)
      }
    }

    if (!loading) {
      if (!user) {
        router.push('/auth/signin')
      } else if (profile) {
        if (profile.role === 'seller') {
          router.push('/dashboard/seller')
        } else {
          router.push('/marketplace')
        }
      }
    }
  }, [user, profile, loading, router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center heritage-bg">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-heritage-gold border-t-heritage-red rounded-full mx-auto mb-4"
        />
        <p className="text-[var(--heritage-brown)] heritage-title">Redirecting...</p>
      </div>
    </div>
  )
}