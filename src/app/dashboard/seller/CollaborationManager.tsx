'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MessageInputModal from '@/components/MessageInputModal'
import { useTranslation } from 'react-i18next'
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  Package,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Search,
  Loader2
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Database } from '@/lib/supabase'
import CollaborativeProductsManager from './CollaborativeProductsManager'  

type Profile = Database['public']['Tables']['profiles']['Row']
type Collaboration = Database['public']['Tables']['collaborations']['Row'] & {
  partnerInfo: Profile
  isInitiator: boolean
  productCount: number
  revenueSplit?: {
    initiator_percentage?: number | null
    partner_percentage?: number | null
  } | null
}

interface Props {
  userId: string
  userName: string
}

export default function CollaborationManager({ userId, userName }: Props) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'active' | 'pending-received' | 'pending-sent' | 'search'>('active')
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Seller[]>([])
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showProductsManager, setShowProductsManager] = useState<{ collaborationId: string, partnerName: string } | null>(null)
  const [showMessageModal, setShowMessageModal] = useState<null | { partnerId: string }>(null)

  // Fetch collaborations
  useEffect(() => {
    fetchCollaborations()
  }, [userId])

  const fetchCollaborations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/collaboration/list?userId=${userId}&status=all`)
      const data = await response.json()
      
      if (data.success) {
        setCollaborations(data.collaborations || [])
      }
    } catch (error) {
      console.error('Error fetching collaborations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Search sellers
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      const response = await fetch(
        `/api/collaboration/search-sellers?userId=${userId}&query=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.sellers || [])
      }
    } catch (error) {
      console.error('Error searching sellers:', error)
    } finally {
      setSearching(false)
    }
  }

  // Send collaboration request (now uses modal)
  const sendRequest = (partnerId: string) => {
    setShowMessageModal({ partnerId })
  }

  // Actually send after modal input
  const handleSendRequestWithMessage = async (partnerId: string, message: string) => {
    try {
      setActionLoading(partnerId)
      const response = await fetch('/api/collaboration/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiatorId: userId,
          partnerId,
          message: message && message.trim() ? message.trim() : (t('collaboration.defaultRequestMessage') || "I'd love to collaborate with you!")
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(t('collaboration.requestSent') || 'Collaboration request sent successfully!')
        await fetchCollaborations()
        await handleSearch() // Refresh search results
      } else {
        alert(data.error || 'Failed to send request')
      }
    } catch (error) {
      console.error('Error sending request:', error)
      alert('Failed to send collaboration request')
    } finally {
      setActionLoading(null)
    }
  }

  // Respond to collaboration request
  const respondToRequest = async (collaborationId: string, action: 'accept' | 'reject') => {
    try {
      setActionLoading(collaborationId)
      const response = await fetch('/api/collaboration/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaborationId,
          userId,
          action
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message || `Request ${action}ed successfully!`)
        await fetchCollaborations()
      } else {
        alert(data.error || `Failed to ${action} request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      alert(`Failed to ${action} collaboration request`)
    } finally {
      setActionLoading(null)
    }
  }

  // End collaboration
  const endCollaboration = async (collaborationId: string) => {
    if (!confirm(t('collaboration.confirmEnd') || 'Are you sure you want to end this collaboration?')) {
      return
    }

    try {
      setActionLoading(collaborationId)
      const response = await fetch('/api/collaboration/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaborationId,
          userId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(t('collaboration.ended') || 'Collaboration ended successfully')
        await fetchCollaborations()
      } else {
        alert(data.error || 'Failed to end collaboration')
      }
    } catch (error) {
      console.error('Error ending collaboration:', error)
      alert('Failed to end collaboration')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter collaborations by tab
  const filteredCollaborations = collaborations.filter(c => {
    if (activeTab === 'active') return c.status === 'accepted'
    if (activeTab === 'pending-received') return c.status === 'pending' && !c.isInitiator
    if (activeTab === 'pending-sent') return c.status === 'pending' && c.isInitiator
    return false
  })

  const pendingReceivedCount = collaborations.filter(c => c.status === 'pending' && !c.isInitiator).length
  const pendingSentCount = collaborations.filter(c => c.status === 'pending' && c.isInitiator).length
  const activeCount = collaborations.filter(c => c.status === 'accepted').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text, #111827)' }}>
            <Users className="h-6 w-6" style={{ color: 'var(--text, #111827)' }} />
            {t('collaboration.title') || 'Collaborations'}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
            {t('collaboration.subtitle') || 'Partner with other artisans to create amazing products together'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-px -mx-2 px-2 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-xs sm:text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'active'
              ? 'border-yellow-600 text-yellow-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span className="hidden sm:inline">{t('collaboration.active') || 'Active'}</span>
          <span className="sm:hidden">Active</span>
          <span className="ml-1">({activeCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('pending-received')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-xs sm:text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'pending-received'
              ? 'border-yellow-600 text-yellow-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span className="hidden sm:inline">{t('collaboration.received') || 'Received'}</span>
          <span className="sm:hidden">Received</span>
          {pendingReceivedCount > 0 && (
            <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {pendingReceivedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending-sent')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-xs sm:text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'pending-sent'
              ? 'border-yellow-600 text-yellow-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <span className="hidden sm:inline">{t('collaboration.sent') || 'Sent'}</span>
          <span className="sm:hidden">Sent</span>
          <span className="ml-1">({pendingSentCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-3 sm:px-4 py-2.5 font-medium text-xs sm:text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'search'
              ? 'border-yellow-600 text-yellow-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
          <span className="hidden sm:inline">{t('collaboration.findPartners') || 'Find Partners'}</span>
          <span className="sm:hidden">Find</span>
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'search' ? (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('collaboration.searchPlaceholder') || 'Search sellers by name, description...'}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-[var(--border)] rounded-lg bg-[var(--bg-1)] text-[var(--text)] focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t('common.search') || 'Search'}
              </button>
            </div>

            {/* Search Results */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <AnimatePresence>
                {searchResults.map((seller) => (
                  <SellerCard
                    key={seller.id}
                    seller={seller}
                    onSendRequest={() => sendRequest(seller.id)}
                    loading={actionLoading === seller.id}
                  />
                ))}
              </AnimatePresence>
            </div>

            {searchResults.length === 0 && searchQuery && !searching && (
              <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                <UserPlus className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm sm:text-base">{t('collaboration.noResults') || 'No sellers found'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
            <AnimatePresence>
              {filteredCollaborations.map((collab) => (
                <CollaborationCard
                  key={collab.id}
                  collaboration={collab}
                  currentTab={activeTab}
                  onAccept={() => respondToRequest(collab.id, 'accept')}
                  onReject={() => respondToRequest(collab.id, 'reject')}
                  onEnd={() => endCollaboration(collab.id)}
                  onManageProducts={() => setShowProductsManager({ 
                    collaborationId: collab.id, 
                    partnerName: collab.partnerInfo.name 
                  })}
                  loading={actionLoading === collab.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredCollaborations.length === 0 && activeTab !== 'search' && (
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">{t(`collaboration.no${activeTab === 'active' ? 'Active' : 'Pending'}`) || `No ${activeTab} collaborations`}</p>
          </div>
        )}
      </div>

      {/* Message Input Modal for Collaboration Request */}
      {showMessageModal && (
        <MessageInputModal
          open={!!showMessageModal}
          onClose={() => setShowMessageModal(null)}
          onSend={msg => {
            handleSendRequestWithMessage(showMessageModal.partnerId, msg)
            setShowMessageModal(null)
          }}
          defaultMessage={t('collaboration.defaultRequestMessage') || "I'd love to collaborate with you!"}
          maxWords={100}
        />
      )}

      {/* Collaborative Products Manager Modal */}
      {showProductsManager && (
        <CollaborativeProductsManager
          collaborationId={showProductsManager.collaborationId}
          userId={userId}
          partnerName={showProductsManager.partnerName}
          onClose={() => {
            setShowProductsManager(null)
            // Refresh collaborations to update product counts
            fetchCollaborations()
          }}
        />
      )}
    </div>
  )
}

type Seller = Profile & {
  productCount?: number
  activeCollaborations?: number
  store_description?: string | null
  bio?: string | null
}

// Seller Card Component
function SellerCard({ seller, onSendRequest, loading }: { seller: Seller; onSendRequest: () => void; loading?: boolean }) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[var(--bg-2)] rounded-xl p-3 sm:p-4 border border-[var(--border)] hover:shadow-lg transition-shadow"
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          {seller.profile_image ? (
            <Image
              src={seller.profile_image}
              alt={seller.name}
              width={48}
              height={48}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base text-yellow-800 dark:text-gray-100 truncate">
            <Link href={`/stall/${seller.id}`} className="hover:underline text-orange-700 dark:text-yellow-300">
              {seller.name}
            </Link>
          </h3>
          <p className="text-xs sm:text-sm text-orange-900/80 dark:text-gray-400 line-clamp-2 mt-1">
            {seller.store_description || seller.bio || t('collaboration.noDescription')}
          </p>
          <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-orange-700/80 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3 text-orange-500 dark:text-yellow-400" />
              <span className="hidden sm:inline">{seller.productCount}</span>
              <span className="sm:hidden">{seller.productCount}p</span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              <span className="hidden sm:inline">{seller.activeCollaborations} collabs</span>
              <span className="sm:hidden">{seller.activeCollaborations}c</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onSendRequest}
        disabled={loading}
        className="w-full mt-3 sm:mt-4 px-3 sm:px-4 py-2 text-sm sm:text-base bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            {t('collaboration.sendRequest') || 'Send Request'}
          </>
        )}
      </button>
    </motion.div>
  )
}

// Collaboration Card Component
type CollaborationCardProps = {
  collaboration: Collaboration
  currentTab: 'active' | 'pending-received' | 'pending-sent'
  onAccept?: () => void
  onReject?: () => void
  onEnd?: () => void
  onManageProducts?: () => void
  loading?: boolean
}

function CollaborationCard({ collaboration, currentTab, onAccept, onReject, onEnd, onManageProducts, loading }: CollaborationCardProps) {
  const { t } = useTranslation()
  const partner = collaboration.partnerInfo

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[var(--bg-2)] rounded-xl p-3 sm:p-4 border border-[var(--border)] hover:shadow-lg transition-shadow"
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Partner Image */}
        <div className="flex-shrink-0">
          {partner.profile_image ? (
            <Image
              src={partner.profile_image}
              alt={partner.name}
              width={48}
              height={48}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-base text-yellow-800 dark:text-gray-100 truncate">
              <Link href={`/stall/${partner.id}`} className="hover:underline text-orange-700 dark:text-yellow-300">
                {partner.name}
              </Link>
            </h3>
            {currentTab === 'active' && (
              <span className="px-2 py-0.5 sm:py-1 text-xs bg-green-500/10 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-400/40 dark:border-none rounded-full flex-shrink-0 font-semibold">
                {t('collaboration.active') || 'Active'}
              </span>
            )}
            {currentTab !== 'active' && (
              <span className={`px-2 py-0.5 sm:py-1 text-xs rounded-full flex items-center gap-1 flex-shrink-0 font-semibold border dark:border-none ${currentTab === 'pending-received' ? 'bg-blue-600 text-white border-blue-600 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-none' : 'bg-blue-500/20 text-blue-900 border-blue-500/40 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-none'}`}>
                <Clock className={`h-3 w-3 ${currentTab === 'pending-received' ? 'text-white dark:text-yellow-400' : 'text-blue-700 dark:text-yellow-400'}`} />
                <span className="hidden sm:inline">{t('collaboration.statusPending') || 'Pending'}</span>
              </span>
            )}
          </div>

          {/* Show the request message only in pending-received and pending-sent tabs */}
          {(currentTab === 'pending-received' || currentTab === 'pending-sent') && (() => {
            // Helper to truncate to 25 words
            const truncateWords = (msg: string, maxWords = 25) => {
              const words = msg.split(/\s+/)
              if (words.length <= maxWords) return msg
              return words.slice(0, maxWords).join(' ') + '...'
            }
            const message = (collaboration.message && collaboration.message.trim() !== '')
              ? truncateWords(collaboration.message.trim())
              : t('collaboration.defaultRequestMessage') || "I'd love to collaborate with you!"
            return (
              <div
                className="mt-2 text-xs sm:text-sm rounded p-2 w-full"
                style={{
                  background: 'linear-gradient(90deg, #fffbe6 0%, #fff7cc 100%)',
                  color: '#7c4a00',
                  border: '1px solid #ffe066',
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  maxHeight: '6em',
                  display: 'block',
                }}
              >
                <MessageSquare className="h-3 w-3 inline mr-1 text-yellow-700 align-text-top" />
                <span style={{wordBreak: 'break-word'}}>{message}</span>
              </div>
            )
          })()}

          {currentTab === 'active' && (
            <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-orange-700/80 dark:text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3 text-orange-500 dark:text-yellow-400" />
                <span className="hidden sm:inline">{collaboration.productCount} products</span>
                <span className="sm:hidden">{collaboration.productCount}p</span>
              </span>
              {collaboration.revenueSplit && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  {collaboration.isInitiator 
                    ? collaboration.revenueSplit.initiator_percentage 
                    : collaboration.revenueSplit.partner_percentage}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2">
        {currentTab === 'pending-received' && (
          <>
            <button
              onClick={onAccept}
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('collaboration.accept') || 'Accept'}
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('collaboration.reject') || 'Reject'}
            </button>
          </>
        )}
        
        {currentTab === 'active' && (
          <>
            <button
              onClick={onManageProducts}
              className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Package className="h-4 w-4" />
              <span className="hidden xs:inline">{t('collaboration.manageProducts') || 'Manage Products'}</span>
              <span className="xs:hidden">Manage</span>
            </button>
            <div className="flex gap-2">
              <Link
                href={`/stall/${partner.id}`}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                <span className="sm:hidden">View</span>
              </Link>
              <button
                onClick={onEnd}
                disabled={loading}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {t('collaboration.end') || 'End'}
              </button>
            </div>
          </>
        )}

        {currentTab === 'pending-sent' && (
          <div className="w-full text-center text-sm text-gray-500 dark:text-gray-400 py-2">
            <Clock className="h-4 w-4 inline mr-1" />
            {t('collaboration.waitingResponse') || 'Waiting for response...'}
          </div>
        )}
      </div>
    </motion.div>
  )
}
