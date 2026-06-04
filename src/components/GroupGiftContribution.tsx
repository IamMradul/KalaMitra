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
              title: t('groupGiftContribution.receivedGiftTitle'),
              body: t('groupGiftContribution.receivedGiftBody', { product: groupGift?.product?.title || 'a product' }),
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
      alert(t('groupGiftContribution.thankYou'))
    } catch (err) {
      console.error('Error contributing:', err)
      alert(t('groupGiftContribution.failed'))
    }
    setContributing(false)
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-heritage-red/30 border-t-heritage-red rounded-full animate-spin mb-4" />
        <div className="text-heritage-red font-semibold text-lg">{fetchError}</div>
      </div>
    )
  }

  if (!groupGift) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-heritage-blue/30 border-t-heritage-blue rounded-full animate-spin" />
      </div>
    )
  }

  const progressPercentage = Math.min((groupGift.current_amount / groupGift.target_amount) * 100, 100)
  const remainingAmount = Math.max(groupGift.target_amount - groupGift.current_amount, 0)

  const handlePresetClick = (amount: number) => {
    setContributionAmount(Math.min(amount, remainingAmount))
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header connection banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-1 border border-border-color rounded-3xl p-6 shadow-md transition-colors duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-heritage-blue/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-heritage-green/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              {groupGift.initiator.profile_image ? (
                <img
                  src={groupGift.initiator.profile_image}
                  alt={groupGift.initiator.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-heritage-blue/30 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-heritage-blue to-heritage-blue/60 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-heritage-blue text-white rounded-full p-1 shadow-sm">
                <Users className="w-3 h-3" />
              </span>
            </div>
            <div>
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Organizer</p>
              <h4 className="font-bold text-text text-lg leading-tight">{groupGift.initiator.name}</h4>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-[2px] w-12 md:w-20 bg-gradient-to-r from-heritage-blue/30 via-heritage-gold/50 to-heritage-green/30 hidden sm:block"></div>
            <div className="w-10 h-10 rounded-full bg-heritage-gold/10 flex items-center justify-center shadow-inner">
              <Heart className="w-5 h-5 text-heritage-gold fill-heritage-gold/25 animate-pulse" />
            </div>
            <div className="h-[2px] w-12 md:w-20 bg-gradient-to-r from-heritage-blue/30 via-heritage-gold/50 to-heritage-green/30 hidden sm:block"></div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              {groupGift.recipient.profile_image ? (
                <img
                  src={groupGift.recipient.profile_image}
                  alt={groupGift.recipient.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-heritage-green/30 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-heritage-green to-heritage-green/60 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-heritage-green text-white rounded-full p-1 shadow-sm">
                <Gift className="w-3 h-3" />
              </span>
            </div>
            <div>
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Recipient</p>
              <h4 className="font-bold text-text text-lg leading-tight">{groupGift.recipient.name}</h4>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Info & Contributors */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Product Detail Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-1 border border-border-color rounded-3xl p-6 shadow-md hover-lift transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {groupGift.product.image_url ? (
                <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden shadow-sm border border-border-color/30 flex-shrink-0 group">
                  <img
                    src={groupGift.product.image_url}
                    alt={groupGift.product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="w-full md:w-48 h-48 rounded-2xl bg-bg-3 border border-border-color/30 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-12 h-12 text-muted" />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-heritage-blue/10 text-heritage-blue mb-3 border border-heritage-blue/15 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    {t('groupGiftModal.title')}
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-text mb-2 tracking-tight">
                    {groupGift.product.title}
                  </h2>
                  <p className="text-sm text-muted font-medium mb-4">
                    {t('groupGiftModal.productForRecipient', { name: groupGift.recipient.name })}
                  </p>
                </div>
                
                {groupGift.message && (
                  <div className="relative mt-2 p-4 rounded-2xl bg-bg-2 border-l-4 border-heritage-gold/70 italic text-sm text-text opacity-90 shadow-inner">
                    &ldquo;{groupGift.message}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Contributors List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-bg-1 border border-border-color rounded-3xl p-6 sm:p-8 shadow-md transition-colors duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif font-bold text-text flex items-center gap-2">
                <Users className="w-5 h-5 text-heritage-blue" />
                {t('groupGiftModal.contributorsTitle', { count: contributions.length })}
              </h3>
              {contributions.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-heritage-blue/10 text-heritage-blue border border-heritage-blue/15">
                  Active Contributors
                </span>
              )}
            </div>

            {contributions.length === 0 ? (
              <div className="bg-bg-2 border border-border-color rounded-2xl py-12 text-center shadow-inner">
                <Users className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                <p className="text-text font-bold text-lg">{t('groupGiftModal.noContributions', 'No contributions yet.')}</p>
                <p className="text-muted mt-1 text-sm">{t('groupGiftContribution.noContributionsPrompt')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {contributions.map((contribution, index) => (
                  <motion.div
                    key={contribution.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="flex flex-col p-5 bg-bg-2 border border-border-color rounded-2xl hover:border-heritage-blue/30 hover:shadow-sm transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-border-color/60 group-hover:border-heritage-blue/40 transition-colors flex-shrink-0">
                          {contribution.contributor.profile_image ? (
                            <img
                              src={contribution.contributor.profile_image}
                              alt={contribution.contributor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-heritage-blue to-heritage-green flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-text leading-snug">
                            {contribution.contributor.name}
                          </p>
                          <p className="text-[10px] text-muted font-medium">
                            {new Date(contribution.created_at).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg text-heritage-gold font-serif">
                          ₹{contribution.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {contribution.message && (
                      <div className="relative mt-3 p-3 bg-bg-1 rounded-xl border border-border-color/60 italic text-sm text-text opacity-95 shadow-sm before:content-[''] before:absolute before:-top-1.5 before:left-5 before:w-3 before:h-3 before:bg-bg-1 before:border-t before:border-l before:border-border-color/60 before:rotate-45">
                        &ldquo;{contribution.message}&rdquo;
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

        </div>

        {/* Right Column: Progress & Contribution Form */}
        <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
          
          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-bg-1 border border-border-color rounded-3xl p-6 sm:p-8 shadow-md transition-colors duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-text flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-heritage-gold" />
                {t('groupGiftModal.progressTitle', 'Progress')}
              </h3>
              <span className="font-bold text-heritage-gold text-lg">
                {t('groupGiftModal.progressComplete', { percent: progressPercentage.toFixed(1) })}
              </span>
            </div>

            <div className="w-full bg-bg-3 border border-border-color/20 rounded-full h-4 mb-6 overflow-hidden p-0.5">
              <motion.div
                className="bg-gradient-to-r from-heritage-blue to-heritage-green h-full rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
              </motion.div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold">Raised</p>
                <p className="text-lg font-bold text-text">₹{groupGift.current_amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold">Goal</p>
                <p className="text-lg font-bold text-text">₹{groupGift.target_amount.toLocaleString()}</p>
              </div>
            </div>

            {groupGift.status === 'completed' ? (
              <div className="text-center py-6 bg-heritage-green/10 border border-heritage-green/20 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-heritage-green to-heritage-green/80 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Sparkles className="w-6 h-6 text-white animate-pulse" />
                </div>
                <p className="text-xl font-serif font-bold text-text mb-1">{t('groupGiftModal.progressTargetReached', 'Target Reached!')}</p>
                <p className="text-xs text-muted font-medium">{t('groupGiftModal.progressReady', 'The gift is ready to be sent.')}</p>
              </div>
            ) : (
              <div className="text-center bg-bg-2 rounded-2xl p-4 border border-border-color shadow-inner">
                <p className="text-text font-medium text-base">
                  {t('groupGiftModal.progressStillNeeded', { amount: 'SPLIT_HERE' }).split('SPLIT_HERE').map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="font-bold text-heritage-gold ml-1">₹{remainingAmount.toLocaleString()}</span>
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
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-b from-bg-1 to-bg-2 border border-border-color rounded-3xl p-6 sm:p-8 shadow-lg transition-colors duration-300"
            >
              <h3 className="text-lg font-serif font-bold text-text mb-6 flex items-center gap-2">
                <Heart className="w-5 h-5 text-heritage-red fill-heritage-red/10" />
                {t('groupGiftModal.contributeTitle', 'Make a Contribution')}
              </h3>
              
              <div className="space-y-6">
                
                {/* Contribution amount block */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-text">
                      {t('groupGiftModal.amountLabel', 'Amount (₹)')}
                    </label>
                    <span className="text-xs text-muted font-semibold">
                      Max ₹{remainingAmount.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Preset Quick Select Buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[250, 500, 1000, 2000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePresetClick(val)}
                        disabled={val > remainingAmount}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all active:scale-95 cursor-pointer text-center ${
                          contributionAmount === val
                            ? 'bg-heritage-blue text-white border-transparent shadow-sm'
                            : 'bg-bg-1 border-border-color text-text hover:border-heritage-blue/40 disabled:opacity-40 disabled:pointer-events-none'
                        }`}
                      >
                        +₹{val}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePresetClick(remainingAmount)}
                    className={`w-full py-2.5 mb-4 text-xs font-bold rounded-xl border transition-all active:scale-95 cursor-pointer text-center ${
                      contributionAmount === remainingAmount
                        ? 'bg-heritage-gold text-white border-transparent shadow-sm'
                        : 'bg-bg-1 border-border-color text-heritage-gold hover:border-heritage-gold/40'
                    }`}
                  >
                    Contribute Full Remaining (₹{remainingAmount.toLocaleString()})
                  </button>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted font-bold text-lg select-none">₹</span>
                    <input
                      type="number"
                      value={contributionAmount === 0 ? '' : contributionAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setContributionAmount(0);
                        } else {
                          const num = Number(val);
                          setContributionAmount(Math.max(1, Math.min(num, remainingAmount)));
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-border-color rounded-xl focus:ring-2 focus:ring-heritage-blue focus:outline-none focus:border-transparent bg-bg-1 text-text font-bold text-lg transition-all"
                      placeholder={t('groupGiftModal.amountPlaceholder', { max: remainingAmount })}
                      min="1"
                      max={remainingAmount}
                    />
                  </div>
                </div>

                {/* Contribution message block */}
                <div>
                  <label className="block text-sm font-bold text-text mb-2">
                    {t('groupGiftModal.messageLabel', 'Personal Message (Optional)')}
                  </label>
                  <textarea
                    value={contributionMessage}
                    onChange={(e) => setContributionMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-border-color rounded-xl focus:ring-2 focus:ring-heritage-blue focus:outline-none focus:border-transparent bg-bg-1 text-text text-sm transition-all resize-none shadow-inner"
                    rows={3}
                    placeholder={t('groupGiftModal.messagePlaceholder', 'Write a message to accompany your contribution...')}
                  />
                </div>

                <button
                  onClick={handleContribute}
                  disabled={contributing || typeof contributionAmount !== 'number' || contributionAmount <= 0}
                  className="w-full bg-gradient-to-r from-heritage-blue to-heritage-green text-white py-4 px-6 rounded-xl font-bold hover:shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2 text-lg cursor-pointer border border-transparent"
                >
                  {contributing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('groupGiftModal.contributing', 'Processing...')}
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      {t('groupGiftModal.contributeButton', { amount: contributionAmount || 0 })}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
