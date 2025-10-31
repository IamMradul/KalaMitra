'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Users, DollarSign, Gift, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next';

interface GroupGiftContributionProps {
  groupGiftId: string
}

interface Contribution {
  id: string
  amount: number
  message: string
  created_at: string
  contributor: {
    name: string
    profile_image: string | null
  }
}

interface GroupGift {
  id: string
  product: {
    title: string
    image_url: string
    price: number
  }
  target_amount: number
  current_amount: number
  message: string
  status: string
  recipient: {
    name: string
    profile_image: string | null
  }
  initiator: {
    name: string
    profile_image: string | null
  }
}

export default function GroupGiftContribution({ groupGiftId }: GroupGiftContributionProps) {
  const { user } = useAuth()
    const { t, i18n } = useTranslation();
  const [groupGift, setGroupGift] = useState<GroupGift | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [contributionAmount, setContributionAmount] = useState<number>(0)

  const [contributionMessage, setContributionMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [contributing, setContributing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetchGroupGift()
    fetchContributions()
  }, [groupGiftId])

  const fetchGroupGift = async () => {
    try {
      const { data, error } = await supabase
        .from('group_gifts')
        .select(`
          id, target_amount, current_amount, message, status,
          product:products(title, image_url, price),
          recipient:profiles(name, profile_image),
          initiator:profiles(name, profile_image)
        `)
        .eq('id', groupGiftId)
        .single()

      if (error || !data) {
        // Fallback: fetch without join
        const { data: rawGift, error: rawError } = await supabase
          .from('group_gifts')
          .select('*')
          .eq('id', groupGiftId)
          .single();
        if (rawError || !rawGift) {
          setFetchError('Could not find this group gift. It may have been deleted or does not exist.')
          return;
        }
        // Fetch product
        let product = null;
        if (rawGift.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('id, title, image_url, price')
            .eq('id', rawGift.product_id)
            .single();
          product = prod;
        }
        // Fetch recipient
        let recipient = null;
        if (rawGift.recipient_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, name, profile_image')
            .eq('id', rawGift.recipient_id)
            .single();
          recipient = prof;
        }
        // Fetch initiator
        let initiator = null;
        if (rawGift.initiator_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, name, profile_image')
            .eq('id', rawGift.initiator_id)
            .single();
          initiator = prof;
        }
        setGroupGift({
          ...rawGift,
          product,
          recipient,
          initiator,
        });
        setFetchError(null);
        return;
      }
      setGroupGift({
        ...data,
        product: Array.isArray(data.product) ? data.product[0] : data.product,
        recipient: Array.isArray(data.recipient) ? data.recipient[0] : data.recipient,
        initiator: Array.isArray(data.initiator) ? data.initiator[0] : data.initiator,
      })
      setFetchError(null);
    } catch (err) {
      console.error('Error fetching group gift:', err)
      setFetchError('An unexpected error occurred while loading the group gift.')
    }
  }

  const fetchContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('group_gift_contributions')
        .select(`
          id, amount, message, created_at,
          contributor:profiles(name, profile_image)
        `)
        .eq('group_gift_id', groupGiftId)
        .order('created_at', { ascending: false })

      if (error) throw error
      // Supabase join returns arrays for joined objects, but we expect single objects
      if (data) {
        setContributions(
          data.map((c) => {
            let contributorObj: { name: string; profile_image: string | null } = { name: '', profile_image: null };
            if (Array.isArray(c.contributor)) {
              contributorObj = c.contributor[0] as { name: string; profile_image: string | null };
            } else if (c.contributor && typeof c.contributor === 'object') {
              contributorObj = c.contributor as { name: string; profile_image: string | null };
            }
            return {
              id: c.id,
              amount: c.amount,
              message: c.message,
              created_at: c.created_at,
              contributor: contributorObj,
            };
          })
        );
      } else {
        setContributions([]);
      }
    } catch (err) {
      console.error('Error fetching contributions:', err)
    }
  }

  const handleContribute = async () => {
        // Create a gift record for the recipient
        // Use member_ids from group_gifts table as contributors, excluding recipient
    let contributorIds: string[] = [];
    if (groupGift && typeof groupGift.id === 'string') {
      const { data: giftRow } = await supabase
        .from('group_gifts')
        .select('member_ids, recipient_id')
        .eq('id', groupGiftId)
        .single();
      if (giftRow && Array.isArray(giftRow.member_ids)) {
        contributorIds = giftRow.member_ids.filter((id: string) => id !== giftRow.recipient_id);
      }
    }
    // Check if a gift record already exists for this group gift and recipient
    const recipientId = (groupGift && 'recipient_id' in groupGift) ? (groupGift as { recipient_id?: string }).recipient_id : undefined;
    const productId = (groupGift && 'product_id' in groupGift) ? (groupGift as { product_id?: string }).product_id : undefined;
    const initiatorId = (groupGift && 'initiator_id' in groupGift) ? (groupGift as { initiator_id?: string }).initiator_id : undefined;
    if (recipientId) {
      const { data: existingGift } = await supabase
        .from('gifts')
        .select('id')
        .eq('recipient_id', recipientId)
        .eq('metadata->>group_gift_id', groupGiftId)
        .single();
      if (!existingGift) {
        // Insert into gifts table
        await supabase
          .from('gifts')
          .insert({
            product_id: productId,
            sender_id: initiatorId,
            recipient_id: recipientId,
            message: groupGift?.message || '',
            status: 'sent',
            metadata: {
              type: 'group_gift',
              group_gift_id: groupGiftId,
              contributors: contributorIds
            }
          });
      }
    }
    if (!user || typeof contributionAmount !== 'number' || contributionAmount <= 0) return;

    setContributing(true)
    try {
      // Add contribution
      const { error: contribError } = await supabase
        .from('group_gift_contributions')
        .insert({
          group_gift_id: groupGiftId,
          contributor_id: user.id,
          amount: Number(contributionAmount),
          message: contributionMessage
        })

      if (contribError) throw contribError

      // Update current amount
      const { error: updateError } = await supabase
        .from('group_gifts')
        .update({ 
          current_amount: (groupGift?.current_amount || 0) + Number(contributionAmount)
        })
        .eq('id', groupGiftId)

      if (updateError) throw updateError

      // Check if target reached
      const newAmount = (groupGift?.current_amount || 0) + Number(contributionAmount)
      if (newAmount >= (groupGift?.target_amount || 0)) {
        await supabase
          .from('group_gifts')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', groupGiftId)

        // Send notification to recipient
        // Use rawGift fallback for IDs if needed
        // Use already extracted recipientId, productId, initiatorId
        if (recipientId) {
          await supabase
            .from('notifications')
            .insert({
              user_id: recipientId,
              title: 'You received a group gift!',
              body: `Your friends contributed and sent you "${groupGift?.product?.title || 'a product'}" as a group gift!`,
              read: false,
              metadata: {
                type: 'group_gift_received',
                group_gift_id: groupGiftId,
                product_id: productId,
                initiator_id: initiatorId
              }
            });
        }
      }

      // Refresh data
      await fetchGroupGift()
      await fetchContributions()
      
      setContributionAmount(0)
      setContributionMessage('')
      alert('Thank you for your contribution! 🎉')
    } catch (err) {
      console.error('Error contributing:', err)
      alert('Failed to contribute. Please try again.')
    }
    setContributing(false)
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mb-4" />
        <div className="text-red-600 dark:text-red-400 font-semibold text-lg">{fetchError}</div>
      </div>
    )
  }

  if (!groupGift) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  const progressPercentage = Math.min((groupGift.current_amount / groupGift.target_amount) * 100, 100)
  const remainingAmount = Math.max(groupGift.target_amount - groupGift.current_amount, 0)

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8 text-white mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Gift className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('groupGiftModal.headerTitle')}</h1>
            <p className="text-purple-100">{t('groupGiftModal.headerSubtitle')}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">{groupGift.product.title}</h2>
            <p className="text-purple-100">{t('groupGiftModal.productForRecipient', { name: groupGift.recipient.name })}</p>
            {groupGift.message && (
              <p className="mt-2 text-sm italic">&quot;{groupGift.message}&quot;</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">₹{groupGift.current_amount.toLocaleString()}</p>
            <p className="text-purple-100">of ₹{groupGift.target_amount.toLocaleString()} raised</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('groupGiftModal.progressTitle')}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('groupGiftModal.progressComplete', { percent: progressPercentage.toFixed(1) })}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        {groupGift.status === 'completed' ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-lg font-semibold text-green-600">{t('groupGiftModal.progressTargetReached')}</p>
            <p className="text-gray-600 dark:text-gray-400">{t('groupGiftModal.progressReady')}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-purple-600">₹{remainingAmount.toLocaleString()}</span> {t('groupGiftModal.progressStillNeeded')}
            </p>
          </div>
        )}
      </div>

      {/* Contribution Form */}
      {groupGift.status !== 'completed' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('groupGiftModal.contributeTitle')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('groupGiftModal.amountLabel')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 font-bold">₹</span>
                <input
                  type="number"
                  value={contributionAmount === 0 ? '' : contributionAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const maxAmount = Math.max(1, Math.min(Number(val), remainingAmount));
                    setContributionAmount(val === '' ? 0 : maxAmount);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t('groupGiftModal.amountPlaceholder', { max: remainingAmount })}
                  min="1"
                  max={remainingAmount}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('groupGiftModal.messageLabel')}
              </label>
              <textarea
                value={contributionMessage}
                onChange={(e) => setContributionMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder={t('groupGiftModal.messagePlaceholder')}
              />
            </div>

            <button
              onClick={handleContribute}
              disabled={contributing || typeof contributionAmount !== 'number' || contributionAmount <= 0}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {contributing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('groupGiftModal.contributing')}
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  {t('groupGiftModal.contributeButton', { amount: contributionAmount || 0 })}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Contributors List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('groupGiftModal.contributorsTitle', { count: contributions.length })}
        </h3>
        {contributions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('groupGiftModal.noContributions')}</p>
        ) : (
          <div className="space-y-3">
            {contributions.map((contribution) => (
              <motion.div
                key={contribution.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                {contribution.contributor.profile_image ? (
                  <img
                    src={contribution.contributor.profile_image}
                    alt={contribution.contributor.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {contribution.contributor.name}
                  </p>
                  {contribution.message && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      &quot;{contribution.message}&quot;
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(contribution.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-purple-600 dark:text-purple-400">
                    ₹{contribution.amount.toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
