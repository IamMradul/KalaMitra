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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('groupGiftModal.title')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('groupGiftModal.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('groupGiftModal.createdTitle')}</h3>
          
                  <p className="text-gray-700 dark:text-gray-300 mb-4 text-center">{t('groupGiftModal.shareLink')}</p>
                <div className="flex items-center gap-2 w-full justify-center">
                  <input
                    type="text"
                    value={groupGiftUrl}
                    readOnly
                    className="w-2/3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(groupGiftUrl)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      {t('groupGiftModal.copy')}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    onClose();
                  }}
                  className="mt-6 px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('groupGiftModal.selectProduct')}</h3>
                        {productId ? (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                          <div className="flex items-center gap-4">
                            {productImage && (
                              <img src={productImage} alt={productTitle} className="w-16 h-16 object-cover rounded-lg" />
                            )}
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{productTitle}</h4>
                              <p className="text-gray-500 dark:text-gray-400">₹{productPrice}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                  <p className="text-gray-500 dark:text-gray-400">{t('groupGiftModal.selectProductEmpty')}</p>
                      )}
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {t('groupGiftModal.cancel')}
                      </button>
                      <button
                        onClick={() => setStep('amount')}
                        disabled={!productId}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('groupGiftModal.selectRecipient')}</h3>
                        <div className="mb-4">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder={t('groupGiftModal.searchRecipient')}
                          />
                        </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {filteredFriends.map(friend => (
                          <div
                            key={friend.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedRecipient?.id === friend.id ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'}`}
                            onClick={() => setSelectedRecipient(friend)}
                          >
                            {friend.profile_image ? (
                              <img src={friend.profile_image} alt={friend.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{friend.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</p>
                            </div>
                            {selectedRecipient?.id === friend.id && (
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <Heart className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <button
                        onClick={() => setStep('amount')}
                        className="px-6 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {t('groupGiftModal.back')}
                      </button>
                      <button
                        onClick={() => setStep('invite')}
                        disabled={!selectedRecipient}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('groupGiftModal.setTargetAmount')}</h3>
                        <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t('groupGiftModal.targetAmountLabel')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5">₹</span>
                            <input
                              type="number"
                              value={targetAmount}
                              onChange={(e) => setTargetAmount(Number(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder={t('groupGiftModal.targetAmountPlaceholder')}
                              min={productPrice || 1}
                              disabled={!!productPrice}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t('groupGiftModal.messageLabel')}
                          </label>
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={3}
                              placeholder={t('groupGiftModal.messagePlaceholder')}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={() => setStep('select')}
                        className="px-6 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {t('groupGiftModal.back')}
                      </button>
                      <button
                        onClick={() => setStep('recipient')}
                        disabled={Number(targetAmount) <= 0}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('groupGiftModal.inviteFriends')}</h3>
                      
                      <div className="mb-4">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder={t('groupGiftModal.searchFriends')}
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {filteredFriends.map(friend => (
                          <div
                            key={friend.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedFriends.some(f => f.id === friend.id)
                                ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-600'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
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
                              <img src={friend.profile_image} alt={friend.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{friend.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</p>
                            </div>
                            {selectedFriends.some(f => f.id === friend.id) && (
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <Heart className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={() => setStep('amount')}
                        className="px-6 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep('confirm')}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('groupGiftModal.confirmTitle')}</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-4">
                          {productImage && (
                            <img src={productImage} alt={productTitle} className="w-16 h-16 object-cover rounded-lg" />
                          )}
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{productTitle}</h4>
                            <p className="text-gray-500 dark:text-gray-400">{t('groupGiftModal.target', { amount: targetAmount })}</p>
                          </div>
                        </div>
                        {message && (
                          <div className="bg-white dark:bg-gray-600 rounded-lg p-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">&quot;{message}&quot;</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('groupGiftModal.yourContributionLabel')}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={creatorContribution}
                            onChange={e => setCreatorContribution(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder={t('groupGiftModal.yourContributionPlaceholder')}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('groupGiftModal.invitedFriends', { count: selectedFriends.length })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedFriends.map(friend => (
                              <div key={friend.id} className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                                {friend.profile_image ? (
                                  <img src={friend.profile_image} alt={friend.name} className="w-5 h-5 rounded-full" />
                                ) : (
                                  <User className="w-4 h-4 text-purple-600" />
                                )}
                                <span className="text-sm text-purple-700 dark:text-purple-300">{friend.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <button
                        onClick={() => setStep('invite')}
                        className="px-6 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCreateGroupGift}
                        disabled={loading}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Gift className="w-4 h-4" />
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
