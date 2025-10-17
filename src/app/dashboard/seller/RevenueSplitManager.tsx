'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
// translations not currently used in this component
import { DollarSign, X, TrendingUp, AlertCircle, Check, Clock, XCircle, Loader2 } from 'lucide-react'
// supabase not used in this component; API calls use fetch to server routes

interface RevenueSplitManagerProps {
  collaborativeProductId: string
  collaborationId: string
  productTitle: string
  currentSplit: {
    initiator: number
    partner: number
  } | null
  isInitiator: boolean
  partnerName: string
  userId: string
  onClose: () => void
}

type SplitProposal = {
  id: string
  proposed_by: string
  proposed_split: {
    initiator: number
    partner: number
  }
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  responded_by: string | null
  responded_at: string | null
  created_at: string
  expires_at: string
  proposer: {
    id: string
    name: string
    profile_image: string | null
  }
  responder: {
    id: string
    name: string
    profile_image: string | null
  } | null
}

export default function RevenueSplitManager({
  collaborativeProductId,
  collaborationId,
  productTitle,
  currentSplit,
  isInitiator,
  partnerName,
  userId: userIdProp,
  onClose
}: RevenueSplitManagerProps) {
  // translation hook not used here
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [proposals, setProposals] = useState<SplitProposal[]>([])
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [userId] = useState<string>(userIdProp) // Initialize with prop (readonly)
  
  // Proposal form state
  const [initiatorPercentage, setInitiatorPercentage] = useState(currentSplit?.initiator || 50)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch(
        `/api/collaboration/split-proposal?collaborationId=${collaborationId}`
      )
      
      if (!response.ok) {
        console.error('Failed to fetch proposals:', response.status)
        // Don't throw error, just set empty array
        setProposals([])
        return
      }
      
      const data = await response.json()
      setProposals(data.proposals || [])
    } catch (error) {
      console.error('Error fetching proposals:', error)
      // Set empty array on error - table might not exist yet
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [collaborationId])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  // fetchProposals is provided via useCallback above

  const handleCreateProposal = async () => {
    if (!userId) {
      alert('User not authenticated. Please refresh the page and try again.')
      return
    }

    if (initiatorPercentage < 0 || initiatorPercentage > 100) {
      alert('Invalid percentage')
      return
    }

    const partnerPercentage = 100 - initiatorPercentage

    try {
      setSubmitting(true)
      
      const response = await fetch('/api/collaboration/split-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaborativeProductId,
          collaborationId,
          proposedSplit: {
            initiator: initiatorPercentage,
            partner: partnerPercentage
          },
          reason,
          userId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to create proposal'
        console.error('Create proposal error:', errorMsg, data)
        
        // Show helpful message if table doesn't exist
        if (errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
          alert('Revenue split proposals feature is not yet set up. Please run the database migration first.')
        } else {
          alert(errorMsg)
        }
        return
      }

      alert(data.message || 'Proposal created successfully')
      setShowProposalForm(false)
      setReason('')
      fetchProposals()
    } catch (error) {
      console.error('Error creating proposal:', error)
      alert('Failed to create proposal. Please check console for details.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRespondToProposal = async (proposalId: string, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this proposal?`)) {
      return
    }

    try {
      const response = await fetch('/api/collaboration/split-proposal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          action,
          userId // Add userId to request
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || `Failed to ${action} proposal`)
        return
      }

      alert(data.message || `Proposal ${action}d successfully`)
      fetchProposals()
      
      // If approved, refresh the parent component
      if (action === 'approve') {
        setTimeout(() => {
          onClose()
        }, 1000)
      }
    } catch (error) {
      console.error(`Error ${action}ing proposal:`, error)
      alert(`Failed to ${action} proposal`)
    }
  }

  const partnerPercentage = 100 - initiatorPercentage

  const pendingProposals = proposals.filter(p => p.status === 'pending')
  const historyProposals = proposals.filter(p => p.status !== 'pending')

  if (!mounted) {
    return null
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Revenue Split Manager
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {productTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Split */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Revenue Split
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isInitiator ? 'You' : partnerName}
                  </p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {currentSplit?.initiator || 50}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isInitiator ? partnerName : 'You'}
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {currentSplit?.partner || 50}%
                  </p>
                </div>
              </div>
            </div>

            {/* Pending Proposals */}
            {pendingProposals.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Proposals
                </h3>
                <div className="space-y-3">
                  {pendingProposals.map((proposal) => {
                    const isMyProposal = proposal.proposed_by === userId

                    return (
                      <div
                        key={proposal.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {isMyProposal ? 'Your Proposal' : `Proposal from ${proposal.proposer.name}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Expires: {new Date(proposal.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          {isMyProposal && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                              Waiting
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {isInitiator ? 'You' : partnerName}
                            </p>
                            <p className="text-xl font-bold text-yellow-600">
                              {proposal.proposed_split.initiator}%
                            </p>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {isInitiator ? partnerName : 'You'}
                            </p>
                            <p className="text-xl font-bold text-orange-600">
                              {proposal.proposed_split.partner}%
                            </p>
                          </div>
                        </div>

                        {proposal.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                            &quot;{proposal.reason}&quot;
                          </p>
                        )}

                        {!isMyProposal && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespondToProposal(proposal.id, 'approve')}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRespondToProposal(proposal.id, 'reject')}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Propose New Split */}
            {!showProposalForm && pendingProposals.length === 0 && (
              <button
                onClick={() => setShowProposalForm(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <TrendingUp className="h-5 w-5" />
                Propose New Split
              </button>
            )}

            {/* Proposal Form */}
            {showProposalForm && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Propose New Revenue Split
                </h3>

                <div className="space-y-4">
                  {/* Split Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Adjust Split Percentage
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px]">
                        {isInitiator ? 'You' : partnerName}: {initiatorPercentage}%
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={initiatorPercentage}
                        onChange={(e) => setInitiatorPercentage(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-right">
                        {isInitiator ? partnerName : 'You'}: {partnerPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Split Display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {isInitiator ? 'You' : partnerName}
                      </p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {initiatorPercentage}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {isInitiator ? partnerName : 'You'}
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {partnerPercentage}%
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason for Change (Optional)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why this split makes sense..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                    <p>
                      Your partner will receive a notification and must approve this change before it takes effect. The proposal expires in 7 days.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateProposal}
                      disabled={submitting}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Submit Proposal
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowProposalForm(false)
                        setReason('')
                        setInitiatorPercentage(currentSplit?.initiator || 50)
                      }}
                      disabled={submitting}
                      className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            {historyProposals.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Proposal History
                </h3>
                <div className="space-y-2">
                  {historyProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-sm"
                    >
                      <div>
                        <span className="text-gray-900 dark:text-gray-100">
                          {proposal.proposed_split.initiator}% / {proposal.proposed_split.partner}%
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 mx-2">•</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          proposal.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : proposal.status === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {proposal.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          Close
        </button>
      </motion.div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
