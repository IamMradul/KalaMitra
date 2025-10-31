'use client'
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { Gift, User, Heart } from 'lucide-react';
import { useTranslation } from 'next-i18next';
export default function GiftsPage() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'group'>('received');

  interface Contributor {
    id: string;
    name: string;
    profile_image: string | null;
  }

  interface GiftMetadata {
    type?: string;
    contributors?: string[];
  }

  interface Gift {
    id: string;
    product_id?: string;
    sender_id?: string;
    recipient_id?: string;
    message?: string;
    created_at: string;
    status?: string;
    viewed?: boolean;
    metadata?: GiftMetadata;
    product?: { id: string; title: string; image_url?: string };
    sender?: { id: string; name: string; profile_image?: string | null };
    recipient?: { id: string; name: string; profile_image?: string | null };
    contributors?: Contributor[];
  }

  interface GroupGift {
    id: string;
    product_id?: string;
    recipient_id?: string;
    initiator_id?: string;
    message?: string;
    created_at: string;
    target_amount?: number;
    product?: { id: string; title: string; image_url?: string };
    recipient?: { id: string; name: string; profile_image?: string | null };
    initiator?: { id: string; name: string; profile_image?: string | null };
  }

  const [giftsR, setGiftsR] = useState<Gift[]>([]); // Received
  const [giftsS, setGiftsS] = useState<Gift[]>([]); // Sent
  const [groupGifts, setGroupGifts] = useState<GroupGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confettiGiftId, setConfettiGiftId] = useState<string | null>(null);
  const [thankedGifts, setThankedGifts] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thankedGifts');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    }
    return new Set();
  });


  // Helper to enrich a gift with product and profile info
  async function enrichGift(gift: Gift): Promise<Gift> {
    // Fetch product
    let product: { id: string; title: string; image_url?: string } | undefined = undefined;
    if (gift.product_id) {
      const { data: prod } = await supabase
        .from('products')
        .select('id, title, image_url')
        .eq('id', gift.product_id)
        .single();
      product = prod || undefined;
    }
    // Fetch sender profile
    let sender: { id: string; name: string; profile_image?: string | null } | undefined = undefined;
    if (gift.sender_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, profile_image')
        .eq('id', gift.sender_id)
        .single();
      sender = prof || undefined;
    }
    // Fetch recipient profile
    let recipient: { id: string; name: string; profile_image?: string | null } | undefined = undefined;
    if (gift.recipient_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, profile_image')
        .eq('id', gift.recipient_id)
        .single();
      recipient = prof || undefined;
    }
    // Fetch contributor profiles for group gifts
    let contributors: Contributor[] = [];
    if (gift.metadata?.type === 'group_gift' && Array.isArray(gift.metadata?.contributors) && gift.metadata.contributors.length > 0) {
      const { data: contribProfiles } = await supabase
        .from('profiles')
        .select('id, name, profile_image')
        .in('id', gift.metadata.contributors);
      contributors = contribProfiles || [];
    }
    return { ...gift, product, sender, recipient, contributors };
  }

  // Helper to enrich a group gift with product and profile info
  async function enrichGroupGift(gift: GroupGift): Promise<GroupGift> {
    let product: { id: string; title: string; image_url?: string } | undefined = undefined;
    if (gift.product_id) {
      const { data: prod } = await supabase
        .from('products')
        .select('id, title, image_url')
        .eq('id', gift.product_id)
        .single();
      product = prod || undefined;
    }
    let recipient: { id: string; name: string; profile_image?: string | null } | undefined = undefined;
    if (gift.recipient_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, profile_image')
        .eq('id', gift.recipient_id)
        .single();
      recipient = prof || undefined;
    }
    let initiator: { id: string; name: string; profile_image?: string | null } | undefined = undefined;
    if (gift.initiator_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, profile_image')
        .eq('id', gift.initiator_id)
        .single();
      initiator = prof || undefined;
    }
    return { ...gift, product, recipient, initiator };
  }

  const fetchGifts = async () => {
    setLoading(true);
    setError(null);
    let received = [];
    let sent = [];
    let errR = null;
    let errS = null;
    if (profile?.id) {
      const { data: r, error: eR } = await supabase
        .from('gifts')
        .select('*')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false });
      received = r || [];
      errR = eR;
      const { data: s, error: eS } = await supabase
        .from('gifts')
        .select('*')
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false });
      sent = s || [];
      errS = eS;
    }
    if ((!received.length && !sent.length) && user?.id) {
      const { data: r, error: eR } = await supabase
        .from('gifts')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });
      received = r || [];
      errR = eR;
      const { data: s, error: eS } = await supabase
        .from('gifts')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });
      sent = s || [];
      errS = eS;
    }
    // Enrich gifts with product/profile info
  const receivedEnriched: Gift[] = await Promise.all(received.map(enrichGift));
  const sentEnriched: Gift[] = await Promise.all(sent.map(enrichGift));
    if (errR) setError(errR.message); else setGiftsR(receivedEnriched);
    if (errS) setError(errS.message); else setGiftsS(sentEnriched);
    setLoading(false);
  };

  const fetchGroupGifts = async () => {
    if (!user && !profile) return;
  const userId = profile?.id || user?.id;
    // Fetch group gifts where user is a contributor or initiator (not recipient)
    const { data: memberGifts, error: memberError } = await supabase
      .from('group_gifts')
      .select('*')
      .or(`initiator_id.eq.${userId},member_ids.cs.{${userId}}`)
      .not('recipient_id', 'eq', userId);
    // Enrich
  const enriched: GroupGift[] = memberGifts ? await Promise.all(memberGifts.map(enrichGroupGift)) : [];
  setGroupGifts(enriched);
  };

  useEffect(() => {
    // Always trigger fetchGifts when either profile or user changes
    if (profile?.id || user?.id) {
      fetchGifts();
      fetchGroupGifts();
    }
  }, [profile, user]);

  const handleUnbox = async (giftId: string) => {
  if (!profile) return;
  await supabase.from('gifts').update({ viewed: true }).eq('id', giftId).eq('recipient_id', profile.id);
  // Update local state for the unwrapped gift
  setGiftsR(prev => prev.map(g => g.id === giftId ? { ...g, viewed: true } : g));
  setConfettiGiftId(giftId);
  setTimeout(() => setConfettiGiftId(null), 1200);
  };

  const handleThank = (giftId: string) => {
    setThankedGifts(prev => {
      const updated = new Set([...prev, giftId]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('thankedGifts', JSON.stringify(Array.from(updated)));
      }
      return updated;
    });
    // Send a thank-you notification to all contributors for group gifts, or sender for individual gifts
    const gift = giftsR.find(g => g.id === giftId);
    (async () => {
      if (gift && profile?.id) {
        if (gift.metadata?.type === 'group_gift' && Array.isArray(gift.contributors) && gift.contributors.length > 0) {
          await Promise.all(gift.contributors.map((contributor: Contributor) => {
            if (contributor.id) {
              return supabase
                .from('notifications')
                .insert({
                  user_id: contributor.id,
                  title: 'You were thanked for your group gift!',
                  body: `${profile.name || 'Recipient'} thanked you for contributing to "${gift.product?.title || 'a product'}"!`,
                  read: false,
                  metadata: {
                    type: 'gift_thanked',
                    gift_id: gift.id,
                    product_id: gift.product?.id,
                    recipient_id: profile.id
                  }
                });
            }
            return Promise.resolve();
          }));
        } else if (gift.sender?.id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: gift.sender.id,
              title: 'You were thanked for your gift!',
              body: `${profile.name || 'Recipient'} thanked you for gifting "${gift.product?.title || 'a product'}"!`,
              read: false,
              metadata: {
                type: 'gift_thanked',
                gift_id: gift.id,
                product_id: gift.product?.id,
                recipient_id: profile.id
              }
            });
        }
      }
    })();
  };

  // Modern, professional, and responsive UI with improved contrast and theme switching
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <Gift className="w-16 h-16 text-pink-500 dark:text-pink-400 mx-auto mb-6 animate-bounce drop-shadow-lg" />
        <h1 className="text-4xl font-extrabold text-pink-700 dark:text-pink-400 mb-2">{t('gifts.signInTitle')}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">{t('gifts.signInSubtitle')}</p>
        <Link href="/auth/signin" className="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl text-lg font-semibold shadow-lg hover:from-pink-600 hover:to-orange-500 transition-all">{t('gifts.signInButton')}</Link>
      </div>
    );
  }
  if (loading) {
    // ...existing code...
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-pink-500 dark:text-pink-400 animate-pulse text-2xl font-bold">{t('gifts.loading')}</span>
      </div>
    );
  }
  return (
  <div className="min-h-screen py-10 px-2 md:px-0">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center mb-10">
          <Gift className="w-20 h-20 text-pink-500 dark:text-pink-400 mb-4 animate-bounce drop-shadow-lg" />
          <h1 className="text-5xl font-extrabold mb-2 text-pink-700 dark:text-pink-400 tracking-tight">{t('gifts.centerTitle')}</h1>
          <p className="text-xl text-pink-600 dark:text-pink-300 font-medium mb-2">{t('gifts.centerSubtitle')}</p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <Link 
              href="/marketplace" 
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-2xl font-semibold shadow-lg hover:from-pink-600 hover:to-orange-600 transition-all flex items-center gap-2"
            >
              <Gift className="w-6 h-6" />
              {t('gifts.sendIndividualGift')}
            </Link>
            <button 
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
              onClick={() => window.location.href = '/marketplace'}
            >
              <span className="text-xl">👥</span>
              {t('gifts.startGroupGift')}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex justify-center mb-10 gap-2">
          <button
            className={`px-8 py-3 rounded-t-2xl font-semibold transition border-b-4 shadow-sm text-lg ${activeTab === 'received' ? 'border-pink-500 text-pink-700 dark:text-pink-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
            onClick={() => setActiveTab('received')}
          >{t('gifts.receivedTab')} <span className="font-bold">({giftsR.length})</span></button>
          <button
            className={`px-8 py-3 rounded-t-2xl font-semibold transition border-b-4 shadow-sm text-lg ${activeTab === 'sent' ? 'border-orange-400 text-orange-700 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
            onClick={() => setActiveTab('sent')}
          >{t('gifts.sentTab')} <span className="font-bold">({giftsS.length})</span></button>
          <button
            className={`px-8 py-3 rounded-t-2xl font-semibold transition border-b-4 shadow-sm text-lg ${activeTab === 'group' ? 'border-purple-500 text-purple-700 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
            onClick={() => setActiveTab('group')}
          >{t('gifts.groupTab')} <span className="font-bold">({groupGifts.length})</span></button>
        </div>
        {/* Received Gifts */}
        {activeTab === 'received' && (
          giftsR.length === 0 ? (
            <div className="text-center py-20 rounded-2xl shadow-lg">
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{t('gifts.receivedEmpty')}</p>
              <Link href="/marketplace" className="inline-block mt-4 px-8 py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-2xl font-semibold shadow-lg hover:from-pink-500 hover:to-orange-400 transition-all">{t('gifts.sendGiftNow')}</Link>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
              {giftsR.map((gift: Gift) => (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`rounded-3xl shadow-lg p-6 flex flex-col gap-4 border border-gray-200 dark:border-gray-800 relative overflow-hidden transition-transform bg-white dark:bg-gray-900 ${!gift.viewed ? 'ring-4 ring-pink-300 dark:ring-pink-500 ring-inset animate-pulse' : ''} hover:-translate-y-2 hover:shadow-2xl`}
                >
                  {/* Confetti for new (unviewed) gifts */}
                  {confettiGiftId === gift.id && (
                    <div className="absolute z-10 inset-0 pointer-events-none flex justify-center items-center">
                      <span className="text-4xl animate-bounce">🎉🎊🎁</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {/* Hide product details until unwrapped */}
                    {gift.viewed ? (
                      gift.product?.image_url ? (
                        <img src={gift.product.image_url} alt={gift.product.title} className="w-24 h-24 object-cover rounded-xl border border-pink-200 shadow bg-white" />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-pink-50 to-white rounded-xl flex items-center justify-center"><Gift className="w-10 h-10 text-pink-600" /></div>
                      )
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-orange-50 to-pink-100 rounded-xl flex items-center justify-center"><Gift className="w-10 h-10 text-pink-400" /></div>
                    )}
                    <div className="flex-1">
                      {/* Hide product title until unwrapped */}
                      {gift.viewed ? (
                        <Link href={`/product/${gift.product?.id}`}
                          className="text-xl font-bold text-pink-700 dark:text-pink-300 hover:underline">
                          {gift.product?.title}
                        </Link>
                      ) : (
                        <span className="text-xl font-bold text-pink-800 dark:text-pink-300">{t('gifts.gift')}</span>
                      )}
                      <div className="mt-1 text-sm text-gray-800 dark:text-gray-300">{t('gifts.receivedOn', { date: new Date(gift.created_at).toLocaleString() })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {/* Hide sender details until unwrapped */}
                    {gift.viewed ? (
                      gift.metadata?.type === 'group_gift' && Array.isArray(gift.contributors) && gift.contributors.length > 0 ? (
                        <div className="flex -space-x-2">
                          {gift.contributors.slice(0, 4).map((c: Contributor, idx: number) => (
                            c.profile_image ? (
                              <img key={c.id} src={c.profile_image} alt={c.name} className="w-8 h-8 rounded-full border-2 border-white shadow" style={{ zIndex: 10 - idx }} />
                            ) : (
                              <div key={c.id} className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center border-2 border-white shadow" style={{ zIndex: 10 - idx }}>
                                <User className="w-4 h-4 text-white" />
                              </div>
                            )
                          ))}
                          {gift.contributors.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold border-2 border-white shadow">+{gift.contributors.length - 4}</div>
                          )}
                        </div>
                      ) : (
                        gift.sender?.profile_image ? (
                          <img src={gift.sender.profile_image} alt={gift.sender?.name || 'Sender'} className="w-10 h-10 rounded-full object-cover border border-orange-200 shadow" />
                        ) : (
                          <User className="w-8 h-8 text-orange-400" />
                        )
                      )
                    ) : (
                      <User className="w-8 h-8 text-orange-400" />
                    )}
                    <span className="font-medium text-purple-800 dark:text-purple-300 text-lg">
                      {gift.viewed ? (
                        gift.metadata?.type === 'group_gift' && Array.isArray(gift.contributors) && gift.contributors.length > 0
                          ? gift.contributors.map((c: Contributor) => c.name).join(', ')
                          : (gift.sender?.name ? gift.sender.name : t('gifts.unknownSender'))
                      ) : t('gifts.senderHidden')}
                    </span>
                    <span className="text-sm text-gray-800 dark:text-gray-300">{t('gifts.sentYouGift')}</span>
                  </div>
                  {gift.message && (
                    <div className="py-3 px-5 mt-2 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 font-medium border border-pink-200 dark:border-pink-700 shadow">
                      <span className="italic">&quot;{gift.message}&quot;</span>
                    </div>
                  )}
                  {!gift.viewed && user && (
                    <button
                      className="mt-4 text-white bg-gradient-to-r from-pink-500 to-orange-400 py-3 px-8 rounded-full font-bold shadow-lg hover:from-pink-600 hover:to-orange-500 transition-all text-xl"
                      onClick={() => handleUnbox(gift.id)}
                    >{t('gifts.unwrapGift')}</button>
                  )}
                  {gift.viewed && !thankedGifts.has(gift.id) && (
                    <button
                      className="mt-4 text-white bg-gradient-to-r from-pink-500 to-orange-400 py-3 px-8 rounded-full font-bold shadow-lg hover:from-pink-600 hover:to-orange-500 transition-all text-xl flex items-center gap-2"
                      onClick={() => handleThank(gift.id)}
                    ><Heart className="w-5 h-5" /> {t('gifts.thankSender')}</button>
                  )}
                  {thankedGifts.has(gift.id) && (
                    <div className="mt-4 text-green-700 font-semibold text-xl flex items-center gap-2">
                      <Heart className="w-5 h-5" /> {t('gifts.thanked')}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )
        )}
        {/* Gifts Sent */}
        {activeTab === 'sent' && (
          giftsS.length === 0 ? (
            <div className="text-center py-20 rounded-2xl shadow-lg">
              <p className="text-xl text-gray-700 mb-4">{t('gifts.sentEmpty')}</p>
              <Link href="/marketplace" className="inline-block mt-4 px-8 py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-2xl font-semibold shadow-lg hover:from-pink-500 hover:to-orange-400 transition-all">{t('gifts.sendGiftNow')}</Link>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
              {giftsS.map((gift: Gift) => (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-3xl shadow-lg p-6 flex flex-col gap-4 border border-gray-200 dark:border-gray-800 relative transition-transform bg-white dark:bg-gray-900 hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className="flex items-center gap-4">
                    {gift.product?.image_url ? (
                      <img src={gift.product.image_url} alt={gift.product.title} className="w-24 h-24 object-cover rounded-xl border border-orange-200 shadow bg-white" />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-orange-50 to-white rounded-xl flex items-center justify-center"><Gift className="w-10 h-10 text-orange-600" /></div>
                    )}
                    <div className="flex-1">
                      <Link href={`/product/${gift.product?.id}`}
                        className="text-xl font-bold text-pink-800 dark:text-pink-300 hover:underline">
                        {gift.product?.title}
                      </Link>
                      <div className="mt-1 text-sm text-gray-800 dark:text-gray-300">{t('gifts.sentOn', { date: new Date(gift.created_at).toLocaleString() })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {gift.recipient?.profile_image ? (
                      <img src={gift.recipient.profile_image} alt={gift.recipient?.name || 'Recipient'} className="w-10 h-10 rounded-full object-cover border border-pink-200 shadow" />
                    ) : (
                      <User className="w-8 h-8 text-pink-400" />
                    )}
                    <span className="font-medium text-purple-800 dark:text-purple-300 text-lg">{gift.recipient?.name ? gift.recipient.name : t('gifts.unknownRecipient')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-300">{t('gifts.receivedYourGift')}</span>
                  </div>
                  {gift.message && (
                    <div className="py-3 px-5 mt-2 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium border border-orange-200 dark:border-orange-700 shadow">
                      <span className="italic">&quot;{gift.message}&quot;</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )
        )}
        {/* Group Gifts */}
        {activeTab === 'group' && (
          groupGifts.length === 0 ? (
            <div className="text-center py-20 rounded-2xl shadow-lg">
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{t('gifts.groupEmpty')}</p>
              <Link href="/marketplace" className="inline-block mt-4 px-8 py-3 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-2xl font-semibold shadow-lg hover:from-pink-500 hover:to-purple-400 transition-all">{t('gifts.startGroupGiftNow')}</Link>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
              {groupGifts.map((gift: GroupGift) => (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-3xl shadow-lg p-6 flex flex-col gap-4 border border-purple-200 dark:border-purple-800 relative transition-transform bg-white dark:bg-gray-900 hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className="flex items-center gap-4">
                    {gift.product?.image_url ? (
                      <img src={gift.product.image_url} alt={gift.product.title} className="w-24 h-24 object-cover rounded-xl border border-purple-200 shadow bg-white" />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-50 to-white rounded-xl flex items-center justify-center"><Gift className="w-10 h-10 text-purple-600" /></div>
                    )}
                    <div className="flex-1">
                      <Link href={`/group-gift/${gift.id}`}
                        className="text-xl font-bold text-purple-800 dark:text-purple-300 hover:underline">
                        {gift.product?.title || t('gifts.groupTab')}
                      </Link>
                      <div className="mt-1 text-sm text-gray-800 dark:text-gray-300">{t('gifts.createdOn', { date: new Date(gift.created_at).toLocaleString() })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {gift.initiator?.profile_image ? (
                      <img src={gift.initiator.profile_image} alt={gift.initiator?.name || 'Initiator'} className="w-10 h-10 rounded-full object-cover border border-purple-200 shadow" />
                    ) : (
                      <User className="w-8 h-8 text-purple-400" />
                    )}
                    <span className="font-medium text-purple-800 dark:text-purple-300 text-lg">{gift.initiator?.name ? gift.initiator.name : t('gifts.unknownInitiator')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-300">{t('gifts.startedGroupGift')}</span>
                  </div>
                  {gift.message && (
                    <div className="py-3 px-5 mt-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-700 shadow">
                      <span className="italic">&quot;{gift.message}&quot;</span>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-800 dark:text-gray-300">{t('gifts.targetAmount')} <span className="font-bold">₹{gift.target_amount}</span></div>
                  <div className="mt-2 text-sm text-gray-800 dark:text-gray-300">{t('gifts.recipient')} <span className="font-bold">{gift.recipient?.name || t('gifts.unknownRecipient')}</span></div>
                  <Link href={`/group-gift/${gift.id}`} className="mt-4 text-white bg-gradient-to-r from-purple-500 to-pink-500 py-3 px-8 rounded-full font-bold shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all text-xl text-center">{t('gifts.viewGroupGift')}</Link>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
