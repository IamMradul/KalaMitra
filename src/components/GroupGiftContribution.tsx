'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Users, DollarSign, Gift, User, Sparkles } from 'lucide-react'
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
      <div className="flex items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--heritage-red)]/30 border-t-[var(--heritage-red)] rounded-full animate-spin mb-4" />
        <div className="text-[var(--heritage-red)] font-semibold text-lg">{fetchError}</div>
      </div>
    )
  }

  if (!groupGift) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--heritage-blue)]/30 border-t-[var(--heritage-blue)] rounded-full animate-spin" />
      </div>
    )
  }

  const progressPercentage = Math.min((groupGift.current_amount / groupGift.target_amount) * 100, 100)
  const remainingAmount = Math.max(groupGift.target_amount - groupGift.current_amount, 0)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-3xl p-8 text-white mb-8 shadow-[0_10px_30px_rgba(30,58,138,0.2)] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="flex items-center gap-5 mb-8 relative z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shadow-lg">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">{t('groupGiftModal.headerTitle', 'Group Gift Contribution')}</h1>
            <p className="text-white/80 mt-1 font-medium">{t('groupGiftModal.headerSubtitle', 'Help your friend get their dream item')}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
            <h2 className="text-xl font-bold mb-2">{groupGift.product.title}</h2>
            <p className="text-white/80 text-sm font-medium">{t('groupGiftModal.productForRecipient', { name: groupGift.recipient.name }, `For ${groupGift.recipient.name}`)}</p>
            {groupGift.message && (
              <p className="mt-3 text-sm italic border-l-2 border-white/40 pl-3">&quot;{groupGift.message}&quot;</p>
            )}
          </div>
          <div className="flex flex-col justify-center items-end bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
            <p className="text-3xl font-bold mb-1">₹{groupGift.current_amount.toLocaleString()}</p>
            <p className="text-white/80 text-sm font-medium">of ₹{groupGift.target_amount.toLocaleString()} raised</p>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl mb-8 transition-colors duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-serif font-bold text-[var(--text)] flex items-center gap-2">
             <DollarSign className="w-5 h-5 text-[var(--heritage-gold)]" />
            {t('groupGiftModal.progressTitle', 'Progress')}
          </h3>
          <span className="font-bold text-[var(--heritage-gold)]">
            {t('groupGiftModal.progressComplete', { percent: progressPercentage.toFixed(1) }, `${progressPercentage.toFixed(1)}% Complete`)}
          </span>
        </div>
        
        <div className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-full h-5 mb-6 overflow-hidden p-1">
          <motion.div
            className="bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] h-full rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
          </motion.div>
        </div>

        {groupGift.status === 'completed' ? (
          <div className="text-center py-6 bg-[var(--heritage-green)]/10 border border-[var(--heritage-green)]/30 rounded-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--heritage-green)] to-[#2ecc71] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--heritage-green)]/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-serif font-bold text-[var(--text)] mb-2">{t('groupGiftModal.progressTargetReached', 'Target Reached!')}</p>
            <p className="text-[var(--muted)] font-medium">{t('groupGiftModal.progressReady', 'The gift is ready to be sent to the recipient.')}</p>
          </div>
        ) : (
          <div className="text-center bg-[var(--bg-2)] rounded-2xl p-4 border border-[var(--border)]">
            <p className="text-[var(--text)] font-medium text-lg">
              {t('groupGiftModal.progressStillNeeded', { amount: 'SPLIT_HERE' }).split('SPLIT_HERE').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="font-bold text-[var(--heritage-gold)]">₹{remainingAmount.toLocaleString()}</span>
                  )}
                </span>
              ))}
            </p>
          </div>
        )}
      </motion.div>

      {/* Contribution Form */}
      {groupGift.status !== 'completed' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-1)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl mb-8 transition-colors duration-300"
        >
          <h3 className="text-xl font-serif font-bold text-[var(--text)] mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-[var(--heritage-red)]" />
            {t('groupGiftModal.contributeTitle', 'Make a Contribution')}
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                {t('groupGiftModal.amountLabel', 'Amount (₹)')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-5 h-5 font-bold text-lg">₹</span>
                <input
                  type="number"
                  value={contributionAmount === 0 ? '' : contributionAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const maxAmount = Math.max(1, Math.min(Number(val), remainingAmount));
                    setContributionAmount(val === '' ? 0 : maxAmount);
                  }}
                  className="w-full pl-10 pr-4 py-3 sm:py-4 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--heritage-blue)] focus:outline-none focus:border-transparent bg-[var(--bg-2)] text-[var(--text)] font-bold text-lg transition-all"
                  placeholder={t('groupGiftModal.amountPlaceholder', { max: remainingAmount }, `Max: ₹${remainingAmount}`)}
                  min="1"
                  max={remainingAmount}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                {t('groupGiftModal.messageLabel', 'Personal Message (Optional)')}
              </label>
              <textarea
                value={contributionMessage}
                onChange={(e) => setContributionMessage(e.target.value)}
                className="w-full px-4 py-3 sm:py-4 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--heritage-blue)] focus:outline-none focus:border-transparent bg-[var(--bg-2)] text-[var(--text)] transition-all resize-none"
                rows={3}
                placeholder={t('groupGiftModal.messagePlaceholder', 'Write a message to accompany your contribution...')}
              />
            </div>

            <button
              onClick={handleContribute}
              disabled={contributing || typeof contributionAmount !== 'number' || contributionAmount <= 0}
              className="w-full bg-gradient-to-r from-[var(--heritage-blue)] to-[var(--heritage-green)] text-white py-4 px-6 rounded-xl font-bold hover:shadow-[0_10px_25px_rgba(30,58,138,0.3)] transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2 text-lg"
            >
              {contributing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('groupGiftModal.contributing', 'Processing...')}
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  {t('groupGiftModal.contributeButton', { amount: contributionAmount || 0 }, `Contribute ₹${contributionAmount || 0}`)}
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Contributors List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[var(--bg-1)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl transition-colors duration-300"
      >
        <h3 className="text-xl font-serif font-bold text-[var(--text)] mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--heritage-blue)]" />
          {t('groupGiftModal.contributorsTitle', { count: contributions.length }, `Contributors (${contributions.length})`)}
        </h3>
        {contributions.length === 0 ? (
          <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl py-12 text-center">
            <Users className="w-12 h-12 text-[var(--muted)] mx-auto mb-4 opacity-50" />
            <p className="text-[var(--text)] font-medium text-lg">{t('groupGiftModal.noContributions', 'No contributions yet.')}</p>
            <p className="text-[var(--muted)] mt-1">Be the first to contribute to this gift!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contributions.map((contribution, index) => (
              <motion.div
                key={contribution.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4 p-5 bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl hover:border-[var(--heritage-blue)]/30 hover:shadow-md transition-all group"
              >
                {contribution.contributor.profile_image ? (
                  <img
                    src={contribution.contributor.profile_image}
                    alt={contribution.contributor.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[var(--border)] group-hover:border-[var(--heritage-blue)]/50 transition-colors"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full flex items-center justify-center shadow-inner">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-[var(--text)] truncate">
                    {contribution.contributor.name}
                  </p>
                  {contribution.message && (
                    <p className="text-sm text-[var(--text)] italic opacity-90 truncate">
                      &quot;{contribution.message}&quot;
                    </p>
                  )}
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {new Date(contribution.created_at).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div className="text-right whitespace-nowrap pl-4">
                  <p className="font-bold text-xl text-[var(--heritage-gold)]">
                    ₹{contribution.amount.toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
