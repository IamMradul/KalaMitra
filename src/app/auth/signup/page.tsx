'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/components/ThemeProvider'
import { Eye, EyeOff, Palette, ShoppingBag, ArrowRight, Sparkles, Users, Star, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'

function SignUpContent() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'microsoft' | null>(null)

  const { signUp, signInWithGoogle, signInWithMicrosoft, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'seller' || roleParam === 'buyer') {
      setRole(roleParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signUp(email, password, name, role)
      // Show success message
      setError('')
      alert(t('auth.branding.accountCreatedSuccessfully'))
    } catch (error: unknown) {
      console.error('Signup error details:', error)
      setError(error instanceof Error ? error.message : t('auth.branding.errorOccurredDuringSignup'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async (selectedRole: 'buyer' | 'seller') => {
    setGoogleLoading(true)
    setError('')
    setShowRoleModal(false)

    try {
      await signInWithGoogle(selectedRole)
      // User will be redirected based on their role
    } catch (error: unknown) {
      console.error('Google signup error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(t('auth.branding.googleSignupFailed'))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleMicrosoftSignUp = async (selectedRole: 'buyer' | 'seller') => {
    setMicrosoftLoading(true)
    setError('')
    setShowRoleModal(false)

    try {
      await signInWithMicrosoft(selectedRole)
      // User will be redirected based on their role
    } catch (error: unknown) {
      console.error('Microsoft signup error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Microsoft sign up failed. Please try again.')
      }
    } finally {
      setMicrosoftLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-1)] via-[var(--bg-2)] to-[var(--bg-3)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[var(--saffron)]/20 to-[var(--turquoise)]/20 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-[var(--emerald)]/20 to-[var(--maroon)]/20 rounded-full blur-lg animate-float-slow"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-[var(--turquoise)]/20 to-[var(--saffron)]/20 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-br from-[var(--maroon)]/20 to-[var(--emerald)]/20 rounded-full blur-xl animate-float-slow"></div>
      </div>

      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <Image src="/kalamitra-symbol.png" alt="KalaMitra Symbol" fill className="object-contain drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--text)]">{t('auth.branding.kalaMitra')}</h1>
                <p className="text-[var(--text-muted)]">{t('auth.branding.yourArtisanMarketplace')}</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-[var(--text)] leading-tight">
              {t('auth.branding.startYourCreativeJourneyToday')}
            </h2>

            <p className="text-lg text-[var(--text-muted)] leading-relaxed">
              {t('auth.branding.joinThousandsOfArtisans')}
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--saffron)] to-[var(--turquoise)] rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-[var(--text)]">{t('auth.branding.premiumQuality')}</h3>
              <p className="text-sm text-[var(--text-muted)]">{t('auth.branding.curatedCollection')}</p>
            </div>

            <div className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--emerald)] to-[var(--maroon)] rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-[var(--text)]">{t('auth.branding.communityDriven')}</h3>
              <p className="text-sm text-[var(--text-muted)]">{t('auth.branding.supportLocalArtisans')}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--saffron)]">10K+</div>
              <div className="text-sm text-[var(--text-muted)]">{t('auth.branding.artisans')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--emerald)]">50K+</div>
              <div className="text-sm text-[var(--text-muted)]">{t('auth.branding.products')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--maroon)]">100K+</div>
              <div className="text-sm text-[var(--text-muted)]">{t('auth.branding.happyCustomers')}</div>
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="card-glass p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="relative w-24 h-24 mx-auto">
                <Image src="/kalamitra-symbol.png" alt="KalaMitra Symbol" fill className="object-contain" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--text)]">
                  {t('auth.signupTitle')}
                </h2>
                <p className="text-[var(--text-muted)] mt-2">
                  {t('auth.signupSubtitle')}
                </p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[var(--text)] mb-2">
                    {t('auth.fullName')}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--saffron)] focus:border-transparent transition-all duration-200 text-[var(--text)] placeholder-[var(--text-muted)]"
                    placeholder={t('auth.enterFullName')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-2">
                    {t('auth.emailAddress')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--saffron)] focus:border-transparent transition-all duration-200 text-[var(--text)] placeholder-[var(--text-muted)]"
                    placeholder={t('auth.enterYourEmail')}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text)] mb-2">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--saffron)] focus:border-transparent transition-all duration-200 text-[var(--text)] placeholder-[var(--text-muted)] pr-12"
                      placeholder={t('auth.password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-3">
                    {t('auth.chooseRoleTitle')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('buyer')}
                      className={`p-4 border-2 rounded-xl text-center transition-all duration-200 group ${role === 'buyer'
                        ? 'border-[var(--saffron)] bg-[var(--saffron)]/10 text-[var(--saffron)]'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--saffron)]/50 hover:text-[var(--text)]'
                        }`}
                    >
                      <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center transition-all duration-200 ${role === 'buyer'
                        ? 'bg-gradient-to-br from-[var(--saffron)] to-[var(--turquoise)]'
                        : 'bg-[var(--bg-3)] group-hover:bg-gradient-to-br group-hover:from-[var(--saffron)] group-hover:to-[var(--turquoise)]'
                        }`}>
                        <ShoppingBag className={`w-5 h-5 transition-colors duration-200 ${role === 'buyer' ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-white'
                          }`} />
                      </div>
                      <span className="font-medium block">{t('roles.buyer')}</span>
                      <p className="text-xs mt-1">{t('roles.buyerTagline')}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('seller')}
                      className={`p-4 border-2 rounded-xl text-center transition-all duration-200 group ${role === 'seller'
                        ? 'border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--emerald)]/50 hover:text-[var(--text)]'
                        }`}
                    >
                      <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center transition-all duration-200 ${role === 'seller'
                        ? 'bg-gradient-to-br from-[var(--emerald)] to-[var(--maroon)]'
                        : 'bg-[var(--bg-3)] group-hover:bg-gradient-to-br group-hover:from-[var(--emerald)] group-hover:to-[var(--maroon)]'
                        }`}>
                        <Palette className={`w-5 h-5 transition-colors duration-200 ${role === 'seller' ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-white'
                          }`} />
                      </div>
                      <span className="font-medium block">{t('roles.artisan')}</span>
                      <p className="text-xs mt-1">{t('roles.artisanTagline')}</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-[var(--saffron)] to-[var(--maroon)] hover:from-[var(--saffron)]/90 hover:to-[var(--maroon)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--saffron)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      {t('auth.creatingAccount')}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {t('auth.createAccount')}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border)]" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[var(--bg-1)] text-[var(--text-muted)]">{t('auth.orContinueWith')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider('google')
                    setShowRoleModal(true)
                  }}
                  disabled={googleLoading || microsoftLoading}
                  className="w-full flex justify-center items-center px-4 py-3 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] bg-[var(--bg-2)] hover:bg-[var(--bg-3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--saffron)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {googleLoading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
                      {t('auth.signingIn')}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {t('auth.signupWithGoogle')}
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider('microsoft')
                    setShowRoleModal(true)
                  }}
                  disabled={googleLoading || microsoftLoading}
                  className="w-full flex justify-center items-center px-4 py-3 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] bg-[var(--bg-2)] hover:bg-[var(--bg-3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--saffron)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {microsoftLoading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
                      {t('auth.signingIn')}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#F25022" d="M1 1h10v10H1z" />
                        <path fill="#7FBA00" d="M13 1h10v10H13z" />
                        <path fill="#00A4EF" d="M1 13h10v10H1z" />
                        <path fill="#FFB900" d="M13 13h10v10H13z" />
                      </svg>
                      Sign up with Microsoft
                    </div>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  {t('auth.alreadyHaveAccount')}{' '}
                  <Link href="/auth/signin" className="font-medium text-[var(--saffron)] hover:text-[var(--maroon)] transition-colors">
                    {t('navbar.signIn')}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-2)] border border-[var(--border)] shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-[var(--text)]">{t('auth.chooseRoleTitle')}</h3>
              <p className="text-[var(--text-muted)]">
                {t('auth.chooseRoleSubtitle')}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
              <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('auth.chooseRoleTip')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (selectedProvider === 'google') {
                    handleGoogleSignUp('buyer')
                  } else if (selectedProvider === 'microsoft') {
                    handleMicrosoftSignUp('buyer')
                  }
                }}
                disabled={googleLoading || microsoftLoading}
                className="w-full flex items-center justify-center px-6 py-4 border border-[var(--border)] rounded-xl text-[var(--text)] bg-[var(--bg-2)] hover:bg-[var(--bg-3)] transition-all duration-200 disabled:opacity-50 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--saffron)] to-[var(--turquoise)] rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{t('auth.continueAsBuyer')}</div>
                  <div className="text-xs text-[var(--text-muted)]">{t('auth.branding.shopForUniqueArt')}</div>
                </div>
              </button>

              <button
                onClick={() => {
                  if (selectedProvider === 'google') {
                    handleGoogleSignUp('seller')
                  } else if (selectedProvider === 'microsoft') {
                    handleMicrosoftSignUp('seller')
                  }
                }}
                disabled={googleLoading || microsoftLoading}
                className="w-full flex items-center justify-center px-6 py-4 border border-[var(--border)] rounded-xl text-[var(--text)] bg-[var(--bg-2)] hover:bg-[var(--bg-3)] transition-all duration-200 disabled:opacity-50 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--emerald)] to-[var(--maroon)] rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{t('auth.continueAsArtisan')}</div>
                  <div className="text-xs text-[var(--text-muted)]">{t('auth.branding.sellYourCreations')}</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}