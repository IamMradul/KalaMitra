
'use client'
import React from 'react';

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

  // Onboarding modal state
  const [showGuide, setShowGuide] = React.useState(false);
  const [guideStep, setGuideStep] = React.useState(0);
  const guideSteps = [
    {
      title: "Welcome to KalaMitra!",
      description: "Let's take a quick tour of the main features.",
    },
    {
      title: "Marketplace",
      description: "Browse stalls and products from various sellers.",
    },
    {
      title: "Cart",
      description: "Add products to your cart and proceed to checkout.",
    },
    {
      title: "Group Gifts",
      description: "Contribute to group gifts with friends and family.",
    },
    {
      title: "Leaderboard",
      description: "See top contributors and sellers in the leaderboard.",
    },
    {
      title: "Enjoy!",
      description: "Explore more features as you use the app.",
    },
  ];

  // Show guide only once per user (localStorage)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('hasSeenKalaMitraGuide');
      if (!seen) {
        setShowGuide(true);
      }
    }
  }, []);

  const handleNext = () => {
    if (guideStep < guideSteps.length - 1) {
      setGuideStep(guideStep + 1);
    } else {
      setShowGuide(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenKalaMitraGuide', 'true');
      }
    }
  };
  const handleSkip = () => {
    setShowGuide(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasSeenKalaMitraGuide', 'true');
    }
  };

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
      {/* Onboarding Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border-2 border-yellow-400">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">{guideSteps[guideStep].title}</h2>
            <p className="mb-6 text-gray-700">{guideSteps[guideStep].description}</p>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 rounded bg-yellow-500 text-white font-bold"
                onClick={handleNext}
              >
                {guideStep < guideSteps.length - 1 ? 'Next' : 'Finish'}
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-300 text-gray-700 font-bold"
                onClick={handleSkip}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
