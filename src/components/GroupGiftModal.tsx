'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Users, DollarSign, User, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'


interface Product {
  id?: string;
  title?: string;
  price?: number;
  image_url?: string;
}

interface GroupGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
}

interface Friend {
  id: string
  name: string
  email: string
  profile_image: string | null
}

export default function GroupGiftModal({ 
  isOpen, 
  onClose, 
  productId, 
  productTitle, 
  productPrice, 
  productImage 
}: GroupGiftModalProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  
  // Debug logging
  console.log('GroupGiftModal props:', { isOpen, productId, productTitle, productPrice, productImage })
  const [step, setStep] = useState<'select' | 'amount' | 'recipient' | 'invite' | 'confirm'>('select');
  const [creatorContribution, setCreatorContribution] = useState<number | "">("");
  const [selectedProduct, setSelectedProduct] = useState<Product>({
    id: productId,
    title: productTitle,
    price: productPrice,
    image_url: productImage
  });
  const [selectedRecipient, setSelectedRecipient] = useState<Friend | null>(null)
  const [targetAmount, setTargetAmount] = useState<number | "">("")
  const [message, setMessage] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [groupGiftUrl, setGroupGiftUrl] = useState<string | null>(null)

  // Fetch friends/profiles for invitation
  useEffect(() => {
    if ((step === 'invite' || step === 'recipient') && user) {
      fetchFriends()
    }
  }, [step, user])

  useEffect(() => {
    // When product changes, set targetAmount to product price
    if (productPrice && step === 'amount') {
      setTargetAmount(productPrice);
    }
  }, [productPrice, step])

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, profile_image')
        .neq('id', user?.id)
        .limit(20)
      
      if (error) throw error
      setFriends(data || [])
    } catch (err) {
      console.error('Error fetching friends:', err)
    }
  }

  const handleCreateGroupGift = async () => {
      // Notify invited contributors (excluding initiator and recipient)
      for (const friend of selectedFriends) {
        const initiatorId = user?.id || null;
        const recipientId = selectedRecipient?.id || null;
        // Use profile name if available, fallback to user.email or 'Someone'
        let initiatorName = 'Someone';
        if (user?.id) {
          // Fetch profile for initiator
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          if (profile?.name) {
            initiatorName = profile.name;
          } else if (user.email) {
            initiatorName = user.email;
          }
        }
        const recipientName = selectedRecipient?.name || 'your friend';
        if (friend.id !== initiatorId && friend.id !== recipientId) {
          await supabase
            .from('notifications')
            .insert({
              user_id: friend.id,
              title: 'You were invited to a group gift!',
              body: `${initiatorName} invited you to contribute to a group gift for ${recipientName}.`,
              read: false,
              metadata: {
                type: 'group_gift_invite',
                group_gift_id: groupGiftUrl || null,
                product_id: selectedProduct.id,
                recipient_id: recipientId,
                initiator_id: initiatorId
              }
            })
        }
      }
    if (!user || !selectedProduct || !selectedProduct.id || !selectedRecipient) {
      alert('Please select a product and recipient for the group gift.');
      return;
    }
    setLoading(true)
    try {
  // Build member_ids array: initiator and selected friends (exclude recipient)
  const memberIds = [user.id, ...selectedFriends.map(f => f.id)]
      // Create group gift
      const initialAmount = Number(creatorContribution) || 0;
      const { data: groupGift, error } = await supabase
        .from('group_gifts')
        .insert({
          product_id: selectedProduct.id,
          recipient_id: selectedRecipient.id,
          initiator_id: user.id,
          target_amount: targetAmount,
          message: message,
          member_ids: memberIds,
          current_amount: initialAmount // set initial progress
        })
        .select()
        .single()

      if (error) throw error

      // Create initial contribution from initiator
      await supabase
        .from('group_gift_contributions')
        .insert({
          group_gift_id: groupGift.id,
          contributor_id: user.id,
          amount: initialAmount,
          message: `Started group gift for ${selectedProduct.title}${initialAmount > 0 ? ` (Contributed ₹${creatorContribution})` : ''}`
        })

      const url = `${window.location.origin}/group-gift/${groupGift.id}`;
      setGroupGiftUrl(url);
      setShowLinkModal(true);
    } catch (err) {
      console.error('Error creating group gift:', err)
      alert('Failed to create group gift. Please try again.')
    }
    setLoading(false)
  }

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[var(--bg-1)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-1)]/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h2 className="text-2xl font-display font-bold text-[var(--text)]">{t('groupGiftModal.title')}</h2>
                  <p className="text-sm text-[var(--muted)]">{t('groupGiftModal.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-2)] text-[var(--muted)] hover:text-[var(--text)] rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {showLinkModal && groupGiftUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 flex flex-col items-center justify-center min-h-[300px]"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full flex items-center justify-center shadow-glow mb-4">
                  <Gift className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[var(--text)] mb-2">{t('groupGiftModal.createdTitle')}</h3>
          
                  <p className="text-[var(--muted)] mb-4 text-center">{t('groupGiftModal.shareLink')}</p>
                <div className="flex items-center gap-2 w-full justify-center">
                  <input
                    type="text"
                    value={groupGiftUrl}
                    readOnly
                    className="w-2/3 px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--bg-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--heritage-blue)] transition-all"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(groupGiftUrl)}
                    className="px-6 py-3 bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                      {t('groupGiftModal.copy')}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    onClose();
                  }}
                  className="mt-6 px-8 py-3 bg-[var(--bg-2)] text-[var(--text)] border border-[var(--border)] rounded-xl font-semibold hover:bg-[var(--bg-3)] transition-all"
                  >
                    {t('groupGiftModal.close')}
                </button>
              </motion.div>
            ) : (
              <>
                {step === 'select' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-serif font-semibold text-[var(--text)] mb-4">{t('groupGiftModal.selectProduct')}</h3>
                        {productId ? (
                        <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-4 transition-all hover:border-[var(--heritage-blue)]/50 hover:shadow-md">
                          <div className="flex items-center gap-4">
                            {productImage && (
                              <img src={productImage} alt={productTitle} className="w-20 h-20 object-cover rounded-lg border border-[var(--border)] shadow-sm" />
                            )}
                            <div>
                              <h4 className="font-semibold text-lg text-[var(--text)] mb-1">{productTitle}</h4>
                              <p className="font-medium text-[var(--heritage-gold)] text-lg">₹{productPrice}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                  <p className="text-[var(--muted)]">{t('groupGiftModal.selectProductEmpty')}</p>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[var(--border)]">
                      <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] rounded-lg transition-colors font-medium"
                        >
                          {t('groupGiftModal.cancel')}
                      </button>
                      <button
                        onClick={() => setStep('amount')}
                        disabled={!productId}
                        className="px-8 py-2.5 bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:transform-none hover:-translate-y-0.5"
                        >
                          {t('groupGiftModal.next')}
                      </button>
                    </div>
                  </motion.div>
                )}
                {step === 'recipient' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-serif font-semibold text-[var(--text)] mb-4">{t('groupGiftModal.selectRecipient')}</h3>
                        <div className="mb-4 relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--heritage-blue)] focus:border-transparent bg-[var(--bg-2)] text-[var(--text)] transition-all"
                            placeholder={t('groupGiftModal.searchRecipient')}
                          />
                        </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {filteredFriends.map(friend => (
                          <div
                            key={friend.id}
                            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${selectedRecipient?.id === friend.id ? 'bg-[var(--heritage-blue)]/10 border-2 border-[var(--heritage-blue)] shadow-[0_0_10px_rgba(30,58,138,0.1)]' : 'hover:bg-[var(--bg-2)] border-2 border-transparent'}`}
                            onClick={() => setSelectedRecipient(friend)}
                          >
                            {friend.profile_image ? (
                              <img src={friend.profile_image} alt={friend.name} className="w-12 h-12 rounded-full object-cover border border-[var(--border)]" />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full flex items-center justify-center opacity-80">
                                <User className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-[var(--text)]">{friend.name}</p>
                              <p className="text-sm text-[var(--muted)]">{friend.email}</p>
                            </div>
                            {selectedRecipient?.id === friend.id && (
                              <div className="w-8 h-8 bg-[var(--heritage-blue)] rounded-full flex items-center justify-center shadow-sm">
                                <Heart className="w-4 h-4 text-white fill-current" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between pt-6 mt-6 border-t border-[var(--border)]">
                      <button
                        onClick={() => setStep('amount')}
                        className="px-6 py-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] rounded-lg transition-colors font-medium"
                        >
                          {t('groupGiftModal.back')}
                      </button>
                      <button
                        onClick={() => setStep('invite')}
                        disabled={!selectedRecipient}
                        className="px-8 py-2.5 bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:transform-none hover:-translate-y-0.5"
                        >
                          {t('groupGiftModal.next')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'amount' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-serif font-semibold text-[var(--text)] mb-6">{t('groupGiftModal.setTargetAmount')}</h3>
                        <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                              {t('groupGiftModal.targetAmountLabel')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-5 h-5 font-bold text-lg">₹</span>
                            <input
                              type="number"
                              value={targetAmount}
                              onChange={(e) => setTargetAmount(Number(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--heritage-blue)] focus:border-transparent bg-[var(--bg-2)] text-[var(--text)] font-semibold text-lg transition-all"
                                placeholder={t('groupGiftModal.targetAmountPlaceholder')}
                              min={productPrice || 1}
                              disabled={!!productPrice}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                              {t('groupGiftModal.messageLabel')}
                          </label>
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--heritage-blue)] focus:border-transparent bg-[var(--bg-2)] text-[var(--text)] transition-all resize-none"
                            rows={4}
                              placeholder={t('groupGiftModal.messagePlaceholder')}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-6 mt-6 border-t border-[var(--border)]">
                      <button
                        onClick={() => setStep('select')}
                        className="px-6 py-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] rounded-lg transition-colors font-medium"
                        >
                          {t('groupGiftModal.back')}
                      </button>
                      <button
                        onClick={() => setStep('recipient')}
                        disabled={Number(targetAmount) <= 0}
                        className="px-8 py-2.5 bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:transform-none hover:-translate-y-0.5"
                        >
                          {t('groupGiftModal.next')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'invite' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-serif font-semibold text-[var(--text)] mb-4">{t('groupGiftModal.inviteFriends')}</h3>
                      
                      <div className="mb-4">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--heritage-blue)] focus:border-transparent bg-[var(--bg-2)] text-[var(--text)] transition-all"
                          placeholder={t('groupGiftModal.searchFriends')}
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {filteredFriends.map(friend => (
                          <div
                            key={friend.id}
                            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                              selectedFriends.some(f => f.id === friend.id)
                                ? 'bg-[var(--heritage-blue)]/10 border-2 border-[var(--heritage-blue)] shadow-[0_0_10px_rgba(30,58,138,0.1)]'
                                : 'hover:bg-[var(--bg-2)] border-2 border-transparent'
                            }`}
                            onClick={() => {
                              if (selectedFriends.some(f => f.id === friend.id)) {
                                setSelectedFriends(prev => prev.filter(f => f.id !== friend.id))
                              } else {
                                setSelectedFriends(prev => [...prev, friend])
                              }
                            }}
                          >
                            {friend.profile_image ? (
                              <img src={friend.profile_image} alt={friend.name} className="w-12 h-12 rounded-full object-cover border border-[var(--border)]" />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full flex items-center justify-center opacity-80">
                                <User className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-[var(--text)]">{friend.name}</p>
                              <p className="text-sm text-[var(--muted)]">{friend.email}</p>
                            </div>
                            {selectedFriends.some(f => f.id === friend.id) && (
                              <div className="w-8 h-8 bg-[var(--heritage-blue)] rounded-full flex items-center justify-center shadow-sm">
                                <Heart className="w-4 h-4 text-white fill-current" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-6 mt-6 border-t border-[var(--border)]">
                      <button
                        onClick={() => setStep('amount')}
                        className="px-6 py-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] rounded-lg transition-colors font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep('confirm')}
                        className="px-8 py-2.5 bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
                      >
                        Continue
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'confirm' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[var(--text)] mb-6">{t('groupGiftModal.confirmTitle')}</h3>
                      <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-sm">
                        <div className="flex items-center gap-5 pb-5 border-b border-[var(--border)]">
                          {productImage && (
                            <img src={productImage} alt={productTitle} className="w-24 h-24 object-cover rounded-xl border border-[var(--border)] shadow-sm" />
                          )}
                          <div>
                            <h4 className="font-bold text-lg text-[var(--text)] mb-1">{productTitle}</h4>
                            <p className="font-semibold text-[var(--heritage-gold)] text-lg">{t('groupGiftModal.target', { amount: targetAmount })}</p>
                          </div>
                        </div>
                        {message && (
                          <div className="bg-[var(--bg-1)] border border-[var(--border)] rounded-xl p-4 shadow-inner">
                            <p className="text-[var(--text)] italic">&quot;{message}&quot;</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-semibold text-[var(--text)] mb-3">
                            {t('groupGiftModal.yourContributionLabel')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--muted)] font-bold">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={creatorContribution}
                              onChange={e => setCreatorContribution(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                              className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--bg-1)] text-[var(--text)] font-semibold focus:ring-2 focus:ring-[var(--heritage-blue)] focus:outline-none transition-all"
                              placeholder={t('groupGiftModal.yourContributionPlaceholder')}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)] mb-3">
                            {t('groupGiftModal.invitedFriends', { count: selectedFriends.length })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedFriends.map(friend => (
                              <div key={friend.id} className="flex items-center gap-2 bg-[var(--heritage-blue)]/10 border border-[var(--heritage-blue)]/30 px-4 py-2 rounded-full">
                                {friend.profile_image ? (
                                  <img src={friend.profile_image} alt={friend.name} className="w-6 h-6 rounded-full border border-[var(--border)]" />
                                ) : (
                                  <User className="w-5 h-5 text-[var(--heritage-blue)]" />
                                )}
                                <span className="text-sm font-medium text-[var(--heritage-blue)]">{friend.name}</span>
                              </div>
                            ))}
                            {selectedFriends.length === 0 && (
                                <span className="text-sm text-[var(--muted)] italic bg-[var(--bg-1)] px-4 py-2 rounded-full border border-[var(--border)]">No friends invited yet.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between pt-6 mt-6 border-t border-[var(--border)]">
                      <button
                        onClick={() => setStep('invite')}
                        className="px-6 py-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] rounded-lg transition-colors font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCreateGroupGift}
                        disabled={loading}
                        className="px-8 py-3 bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] text-white rounded-xl font-bold hover:shadow-[0_0_15px_rgba(30,58,138,0.3)] transition-all disabled:opacity-50 disabled:transform-none hover:-translate-y-0.5 flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Gift className="w-5 h-5" />
                            Create Group Gift
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
