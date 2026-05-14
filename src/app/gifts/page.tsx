'use client'
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { Gift, User, Heart, ArrowRight, Sparkles, Users } from 'lucide-react';
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

  const uniqueIds = (values: Array<string | null | undefined>) => Array.from(new Set(values.filter(Boolean) as string[]));

  const buildProfileMap = async (profileIds: string[]) => {
    if (!profileIds.length) {
      return new Map<string, { id: string; name: string; profile_image?: string | null }>();
    }

    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, profile_image')
      .in('id', profileIds);

    if (profilesError) {
      throw profilesError;
    }

    return new Map((data || []).map((profileRow) => [profileRow.id, profileRow]));
  };

  const buildProductMap = async (productIds: string[]) => {
    if (!productIds.length) {
      return new Map<string, { id: string; title: string; image_url?: string }>();
    }

    const { data, error: productsError } = await supabase
      .from('products')
      .select('id, title, image_url')
      .in('id', productIds);

    if (productsError) {
      throw productsError;
    }

    return new Map((data || []).map((productRow) => [productRow.id, productRow]));
  };

  const enrichGift = (gift: Gift, productMap: Map<string, { id: string; title: string; image_url?: string }>, profileMap: Map<string, { id: string; name: string; profile_image?: string | null }>): Gift => {
    const contributors = gift.metadata?.type === 'group_gift' && Array.isArray(gift.metadata?.contributors)
      ? gift.metadata.contributors
        .map((contributorId) => profileMap.get(contributorId))
        .filter((contributor): contributor is Contributor => Boolean(contributor))
      : [];

    return {
      ...gift,
      product: gift.product_id ? productMap.get(gift.product_id) : undefined,
      sender: gift.sender_id ? profileMap.get(gift.sender_id) : undefined,
      recipient: gift.recipient_id ? profileMap.get(gift.recipient_id) : undefined,
      contributors,
    };
  };

  const enrichGroupGift = (gift: GroupGift, productMap: Map<string, { id: string; title: string; image_url?: string }>, profileMap: Map<string, { id: string; name: string; profile_image?: string | null }>): GroupGift => ({
    ...gift,
    product: gift.product_id ? productMap.get(gift.product_id) : undefined,
    recipient: gift.recipient_id ? profileMap.get(gift.recipient_id) : undefined,
    initiator: gift.initiator_id ? profileMap.get(gift.initiator_id) : undefined,
  });

  const fetchGifts = async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = profile?.id || user?.id;
      if (!userId) {
        setGiftsR([]);
        setGiftsS([]);
        setGroupGifts([]);
        return;
      }

      const [receivedResult, sentResult, groupResult] = await Promise.all([
        supabase
          .from('gifts')
          .select('id, product_id, sender_id, recipient_id, message, created_at, status, viewed, metadata')
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('gifts')
          .select('id, product_id, sender_id, recipient_id, message, created_at, status, viewed, metadata')
          .eq('sender_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('group_gifts')
          .select('id, product_id, recipient_id, initiator_id, message, created_at, target_amount, member_ids')
          .or(`initiator_id.eq.${userId},member_ids.cs.{${userId}}`)
          .not('recipient_id', 'eq', userId),
      ]);

      const received = receivedResult.data || [];
      const sent = sentResult.data || [];
      const group = groupResult.data || [];

      const productIds = uniqueIds([
        ...received.map((gift) => gift.product_id),
        ...sent.map((gift) => gift.product_id),
        ...group.map((gift) => gift.product_id),
      ]);

      const profileIds = uniqueIds([
        ...received.flatMap((gift) => [gift.sender_id, gift.recipient_id, ...(Array.isArray(gift.metadata?.contributors) ? gift.metadata.contributors : [])]),
        ...sent.flatMap((gift) => [gift.sender_id, gift.recipient_id, ...(Array.isArray(gift.metadata?.contributors) ? gift.metadata.contributors : [])]),
        ...group.flatMap((gift) => [gift.recipient_id, gift.initiator_id]),
      ]);

      const [productMap, profileMap] = await Promise.all([
        buildProductMap(productIds),
        buildProfileMap(profileIds),
      ]);

      const receivedEnriched: Gift[] = received.map((gift) => enrichGift(gift, productMap, profileMap));
      const sentEnriched: Gift[] = sent.map((gift) => enrichGift(gift, productMap, profileMap));
      const groupEnriched: GroupGift[] = group.map((gift) => enrichGroupGift(gift, productMap, profileMap));

      if (receivedResult.error) {
        throw receivedResult.error;
      }
      if (sentResult.error) {
        throw sentResult.error;
      }
      if (groupResult.error) {
        throw groupResult.error;
      }

      setGiftsR(receivedEnriched);
      setGiftsS(sentEnriched);
      setGroupGifts(groupEnriched);
    } catch (err) {
      console.error('Error fetching gifts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load gifts.')
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always trigger fetchGifts when either profile or user changes
    if (profile?.id || user?.id) {
      fetchGifts();
    }
    // Listen for giftUpdated event to refetch gifts in real-time (sync with Navbar)
    const handleGiftUpdate = () => {
      fetchGifts();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('giftUpdated', handleGiftUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('giftUpdated', handleGiftUpdate);
      }
    };
  }, [profile, user]);

  const handleUnbox = async (giftId: string) => {
    if (!profile) return;
    await supabase.from('gifts').update({ viewed: true }).eq('id', giftId).eq('recipient_id', profile.id);
    // Update local state for the unwrapped gift
    setGiftsR(prev => prev.map(g => g.id === giftId ? { ...g, viewed: true } : g));
    setConfettiGiftId(giftId);
    setTimeout(() => setConfettiGiftId(null), 1500);
    // Dispatch event so Navbar and this page update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('giftUpdated'));
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center heritage-bg relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--heritage-gold) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full mix-blend-multiply filter blur-3xl opacity-20 floating-element pointer-events-none"></div>

        <div className="relative z-10 card-glass p-12 rounded-3xl max-w-lg w-full flex flex-col items-center shadow-2xl border border-[var(--border)]">
          <div className="w-24 h-24 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center mb-6 shadow-glow animate-float-slow">
            <Gift className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-[var(--heritage-red)] dark:text-[var(--heritage-gold)] mb-4">{t('gifts.signInTitle', 'Sign in to see your gifts')}</h1>
          <p className="text-lg text-[var(--muted)] mb-8">{t('gifts.signInSubtitle', 'Join KalaMitra to send and receive beautiful heritage gifts.')}</p>
          <Link href="/auth/signin" className="btn-primary flex items-center gap-2">
            {t('gifts.signInButton', 'Sign In')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center heritage-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--heritage-gold)] rounded-full animate-spin"></div>
          <span className="text-[var(--heritage-gold)] animate-pulse text-xl font-serif font-bold">{t('gifts.loading', 'Loading your gifts...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 heritage-bg relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--heritage-gold) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[var(--bg-1)] to-transparent z-0"></div>
      <div className="absolute top-20 left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full mix-blend-multiply filter blur-[100px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-20 right-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full mix-blend-multiply filter blur-[100px] opacity-10 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">

        {/* Premium Hero Section */}
        <div className="flex flex-col items-center text-center py-16 md:py-24 space-y-6">
          <div className="inline-flex items-center px-4 py-1.5 bg-[var(--heritage-gold)]/10 dark:bg-[var(--heritage-gold)]/5 border border-[var(--heritage-gold)]/30 rounded-full shadow-sm mb-2 animate-slide-in-up">
            <Sparkles className="w-4 h-4 text-[var(--heritage-gold)] mr-2 animate-pulse" />
            <span className="text-sm font-semibold text-[var(--heritage-gold)] uppercase tracking-widest">{t('gifts.heroBadge', 'KalaMitra Gifting')}</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-red)] to-[var(--heritage-gold)] dark:from-[var(--heritage-gold)] dark:to-[var(--heritage-accent)] tracking-tight animate-slide-in-up animate-delay-100 pb-2">
            {t('gifts.centerTitle', 'Your Gifts')}
          </h1>

          <p className="text-xl md:text-2xl text-[var(--muted)] max-w-2xl font-serif animate-slide-in-up animate-delay-200">
            {t('gifts.centerSubtitle', 'Celebrate craftsmanship and shared heritage with every present.')}
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center animate-slide-in-up animate-delay-300">
            <Link
              href="/marketplace"
              className="btn-primary flex items-center gap-3 px-8 py-4 rounded-xl text-lg hover-scale shadow-glow"
            >
              <Gift className="w-6 h-6" />
              {t('gifts.sendIndividualGift', 'Send a Gift')}
            </Link>
            <button
              className="btn-secondary flex items-center gap-3 px-8 py-4 rounded-xl text-lg hover-scale border-[var(--heritage-gold)]/30 text-[var(--heritage-gold)] bg-[var(--bg-1)] hover:bg-[var(--heritage-gold)]/10 transition-colors"
              onClick={() => window.location.href = '/marketplace'}
            >
              <Users className="w-6 h-6" />
              {t('gifts.startGroupGift', 'Start Group Gift')}
            </button>
          </div>
        </div>

        {/* Premium Segmented Tabs */}
        <div className="flex justify-center mb-16 animate-slide-in-up animate-delay-400">
          <div className="inline-flex p-1.5 bg-[var(--bg-2)]/80 backdrop-blur-md rounded-2xl border border-[var(--border)] shadow-soft overflow-x-auto max-w-full">
            {(['received', 'sent', 'group'] as const).map((tab) => (
              <button
                key={tab}
                className={`relative px-6 md:px-8 py-3 rounded-xl font-semibold text-base md:text-lg transition-all duration-300 whitespace-nowrap ${activeTab === tab
                    ? 'text-white shadow-md'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-1)]/50'
                  }`}
                onClick={() => setActiveTab(tab)}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTabBackground"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab === 'received' ? 'from-[var(--heritage-red)] to-[var(--heritage-gold)]' :
                        tab === 'sent' ? 'from-[var(--heritage-gold)] to-[var(--heritage-accent)]' :
                          'from-[var(--heritage-blue)] to-[var(--heritage-green)]'
                      }`}
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {t(`gifts.${tab}Tab`, tab.charAt(0).toUpperCase() + tab.slice(1))}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--muted)]'
                    }`}>
                    {tab === 'received' ? giftsR.length : tab === 'sent' ? giftsS.length : groupGifts.length}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Render Tab Content */}
        <div className="animate-slide-in-up animate-delay-500">
          {activeTab === 'received' && (
            giftsR.length === 0 ? (
              <EmptyState
                icon={<Gift className="w-16 h-16" />}
                title={t('gifts.receivedEmpty', 'No gifts received yet')}
                actionText={t('gifts.sendGiftNow', 'Browse Marketplace')}
                actionHref="/marketplace"
                colorClass="from-[var(--heritage-red)] to-[var(--heritage-gold)]"
              />
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {giftsR.map((gift, idx) => (
                  <ReceivedGiftCard key={gift.id} gift={gift} index={idx} handleUnbox={handleUnbox} handleThank={handleThank} thankedGifts={thankedGifts} confettiGiftId={confettiGiftId} t={t} user={user} />
                ))}
              </div>
            )
          )}

          {activeTab === 'sent' && (
            giftsS.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-16 h-16" />}
                title={t('gifts.sentEmpty', 'No gifts sent yet')}
                actionText={t('gifts.sendGiftNow', 'Send a Gift')}
                actionHref="/marketplace"
                colorClass="from-[var(--heritage-gold)] to-[var(--heritage-accent)]"
              />
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {giftsS.map((gift, idx) => (
                  <SentGiftCard key={gift.id} gift={gift} index={idx} t={t} />
                ))}
              </div>
            )
          )}

          {activeTab === 'group' && (
            groupGifts.length === 0 ? (
              <EmptyState
                icon={<Users className="w-16 h-16" />}
                title={t('gifts.groupEmpty', 'No group gifts yet')}
                actionText={t('gifts.startGroupGiftNow', 'Start a Group Gift')}
                actionHref="/marketplace"
                colorClass="from-[var(--heritage-blue)] to-[var(--heritage-green)]"
              />
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {groupGifts.map((gift, idx) => (
                  <GroupGiftCard key={gift.id} gift={gift} index={idx} t={t} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted UI Components for Maintainability

function EmptyState({ icon, title, actionText, actionHref, colorClass }: { icon: React.ReactNode, title: string, actionText: string, actionHref: string, colorClass: string }) {
  return (
    <div className="card-glass py-24 px-8 text-center flex flex-col items-center justify-center max-w-2xl mx-auto border border-[var(--border)] shadow-soft">
      <div className={`w-28 h-28 bg-gradient-to-br ${colorClass} rounded-full flex items-center justify-center mb-8 shadow-glow text-white animate-float`}>
        {icon}
      </div>
      <h3 className="text-2xl font-serif font-bold text-[var(--text)] mb-6">{title}</h3>
      <Link href={actionHref} className="btn-primary flex items-center gap-2 hover-scale shadow-glow">
        {actionText}
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}

function ReceivedGiftCard({ gift, index, handleUnbox, handleThank, thankedGifts, confettiGiftId, t, user }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`card-glass p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover-lift ${!gift.viewed ? 'border-[var(--heritage-gold)]/50 shadow-[0_0_30px_rgba(176,141,85,0.15)] dark:shadow-[0_0_30px_rgba(176,141,85,0.1)]' : 'border-[var(--border)]'}`}
    >
      {/* Decorative inner glow for unviewed */}
      {!gift.viewed && (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--heritage-gold)]/5 to-transparent pointer-events-none animate-pulse-glow"></div>
      )}

      {/* Confetti Premium Effect */}
      {confettiGiftId === gift.id && (
        <div className="absolute inset-0 z-20 pointer-events-none flex justify-center items-center bg-[var(--bg-1)]/80 backdrop-blur-sm rounded-xl">
          <motion.div initial={{ scale: 0 }} animate={{ scale: [1.2, 1] }} className="w-32 h-32 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center shadow-glow">
            <Sparkles className="w-16 h-16 text-white animate-spin-slow" />
          </motion.div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
        {/* Product Image / Placeholder */}
        <div className="flex-shrink-0 w-full sm:w-auto flex justify-center">
          {gift.viewed ? (
            gift.product?.image_url ? (
              <div className="w-32 h-32 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-medium border border-[var(--border)] relative group">
                <img src={gift.product.image_url} alt={gift.product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
            ) : (
              <div className="w-32 h-32 sm:w-28 sm:h-28 bg-[var(--bg-2)] rounded-2xl flex items-center justify-center border border-[var(--border)] shadow-sm">
                <Gift className="w-10 h-10 text-[var(--muted)]" />
              </div>
            )
          ) : (
            <div className="w-32 h-32 sm:w-28 sm:h-28 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-2xl flex items-center justify-center shadow-glow border border-white/20">
              <Gift className="w-12 h-12 text-white animate-bounce-gentle" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {gift.viewed ? (
            <Link href={`/product/${gift.product?.id}`} className="block">
              <h3 className="text-2xl font-serif font-bold text-[var(--text)] hover:text-[var(--heritage-gold)] transition-colors truncate mb-1">
                {gift.product?.title || t('gifts.gift', 'Gift')}
              </h3>
            </Link>
          ) : (
            <h3 className="text-2xl font-serif font-bold text-[var(--heritage-gold)] mb-1">
              {t('gifts.gift', 'A Special Gift')}
            </h3>
          )}
          <p className="text-sm text-[var(--muted)] mb-4">{t('gifts.receivedOn', 'Received on {{date}}', { date: new Date(gift.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}</p>

          {/* Sender Info */}
          <div className="flex items-center justify-center sm:justify-start gap-3">
            {gift.viewed ? (
              gift.metadata?.type === 'group_gift' && Array.isArray(gift.contributors) && gift.contributors.length > 0 ? (
                <div className="flex -space-x-3">
                  {gift.contributors.slice(0, 4).map((c: any, idx: number) => (
                    c.profile_image ? (
                      <img key={c.id} src={c.profile_image} alt={c.name} className="w-10 h-10 rounded-full border-2 border-[var(--bg-1)] shadow-sm object-cover" style={{ zIndex: 10 - idx }} />
                    ) : (
                      <div key={c.id} className="w-10 h-10 bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] rounded-full flex items-center justify-center border-2 border-[var(--bg-1)] shadow-sm text-white text-xs font-bold" style={{ zIndex: 10 - idx }}>
                        {c.name?.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                    )
                  ))}
                  {gift.contributors.length > 4 && (
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-2)] flex items-center justify-center text-xs font-bold border-2 border-[var(--bg-1)] text-[var(--muted)] shadow-sm">
                      +{gift.contributors.length - 4}
                    </div>
                  )}
                </div>
              ) : (
                gift.sender?.profile_image ? (
                  <img src={gift.sender.profile_image} alt={gift.sender?.name || 'Sender'} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--bg-1)] shadow-sm" />
                ) : (
                  <div className="w-10 h-10 bg-[var(--bg-2)] rounded-full flex items-center justify-center border-2 border-[var(--bg-1)] shadow-sm">
                    <User className="w-5 h-5 text-[var(--muted)]" />
                  </div>
                )
              )
            ) : (
              <div className="w-10 h-10 bg-[var(--bg-2)] rounded-full flex items-center justify-center border-2 border-[var(--bg-1)] shadow-sm">
                <User className="w-5 h-5 text-[var(--muted)]" />
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs text-[var(--muted)] uppercase tracking-wider">{t('gifts.from', 'From')}</span>
              <span className="font-semibold text-[var(--text)]">
                {gift.viewed ? (
                  gift.metadata?.type === 'group_gift' && Array.isArray(gift.contributors) && gift.contributors.length > 0
                    ? gift.contributors.map((c: any) => c.name).join(', ')
                    : (gift.sender?.name || t('gifts.unknownSender', 'Unknown Sender'))
                ) : t('gifts.senderHidden', 'Someone Special')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {gift.message && (
        <div className="relative z-10 mt-2 p-4 bg-[var(--bg-2)]/50 rounded-xl border border-[var(--border)] italic text-[var(--text)]">
          <QuoteIcon className="w-6 h-6 text-[var(--heritage-gold)]/20 absolute top-2 left-2" />
          <p className="relative z-10 pl-6 text-sm leading-relaxed">&quot;{gift.message}&quot;</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 relative z-10">
        {!gift.viewed && user && (
          <button
            className="w-full btn-primary bg-gradient-to-r from-[var(--heritage-red)] to-[var(--heritage-gold)] py-3 rounded-xl font-bold text-lg shadow-glow hover:shadow-[0_0_30px_rgba(176,141,85,0.4)] transition-all overflow-hidden relative group"
            onClick={() => handleUnbox(gift.id)}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              {t('gifts.unwrapGift', 'Unwrap Gift')}
            </span>
          </button>
        )}
        {gift.viewed && !thankedGifts.has(gift.id) && (
          <button
            className="w-full btn-secondary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--heritage-red)]/5 hover:text-[var(--heritage-red)] hover:border-[var(--heritage-red)]/30 transition-all group"
            onClick={() => handleThank(gift.id)}
          >
            <Heart className="w-5 h-5 group-hover:fill-[var(--heritage-red)] transition-all" />
            {t('gifts.thankSender', 'Say Thank You')}
          </button>
        )}
        {thankedGifts.has(gift.id) && (
          <div className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
            <Heart className="w-5 h-5 fill-[var(--success)]" />
            {t('gifts.thanked', 'Thanked')}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SentGiftCard({ gift, index, t }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="card-glass p-6 md:p-8 flex flex-col gap-6 border-[var(--border)] hover-lift transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="flex-shrink-0 w-full sm:w-auto flex justify-center">
          {gift.product?.image_url ? (
            <div className="w-32 h-32 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-medium border border-[var(--border)] relative group">
              <img src={gift.product.image_url} alt={gift.product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
          ) : (
            <div className="w-32 h-32 sm:w-24 sm:h-24 bg-[var(--bg-2)] rounded-2xl flex items-center justify-center border border-[var(--border)] shadow-sm">
              <Gift className="w-10 h-10 text-[var(--muted)]" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <Link href={`/product/${gift.product?.id}`} className="block mb-1">
            <h3 className="text-xl font-serif font-bold text-[var(--text)] hover:text-[var(--heritage-gold)] transition-colors truncate">
              {gift.product?.title || t('gifts.gift', 'Gift')}
            </h3>
          </Link>
          <p className="text-sm text-[var(--muted)] mb-4">{t('gifts.sentOn', 'Sent on {{date}}', { date: new Date(gift.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}</p>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            {gift.recipient?.profile_image ? (
              <img src={gift.recipient.profile_image} alt={gift.recipient?.name || 'Recipient'} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--bg-1)] shadow-sm" />
            ) : (
              <div className="w-10 h-10 bg-[var(--bg-2)] rounded-full flex items-center justify-center border-2 border-[var(--bg-1)] shadow-sm">
                <User className="w-5 h-5 text-[var(--muted)]" />
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs text-[var(--muted)] uppercase tracking-wider">{t('gifts.to', 'To')}</span>
              <span className="font-semibold text-[var(--text)]">{gift.recipient?.name || t('gifts.unknownRecipient', 'Unknown Recipient')}</span>
            </div>
          </div>
        </div>
      </div>

      {gift.message && (
        <div className="mt-2 p-4 bg-[var(--bg-2)]/50 rounded-xl border border-[var(--border)] italic text-[var(--text)] relative">
          <QuoteIcon className="w-6 h-6 text-[var(--heritage-gold)]/20 absolute top-2 left-2" />
          <p className="relative z-10 pl-6 text-sm leading-relaxed">&quot;{gift.message}&quot;</p>
        </div>
      )}
    </motion.div>
  );
}

function GroupGiftCard({ gift, index, t }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="card-glass p-6 md:p-8 flex flex-col gap-6 border-[var(--border)] hover-lift transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--heritage-blue)]/10 to-transparent rounded-bl-full pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
        <div className="flex-shrink-0 w-full sm:w-auto flex justify-center">
          {gift.product?.image_url ? (
            <div className="w-32 h-32 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-medium border border-[var(--border)] relative group">
              <img src={gift.product.image_url} alt={gift.product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
          ) : (
            <div className="w-32 h-32 sm:w-24 sm:h-24 bg-[var(--bg-2)] rounded-2xl flex items-center justify-center border border-[var(--border)] shadow-sm">
              <Users className="w-10 h-10 text-[var(--muted)]" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <Link href={`/group-gift/${gift.id}`} className="block mb-1">
            <h3 className="text-xl font-serif font-bold text-[var(--text)] hover:text-[var(--heritage-blue)] transition-colors truncate">
              {gift.product?.title || t('gifts.groupTab', 'Group Gift')}
            </h3>
          </Link>
          <p className="text-sm text-[var(--muted)] mb-4">{t('gifts.createdOn', 'Created on {{date}}', { date: new Date(gift.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}</p>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            {gift.initiator?.profile_image ? (
              <img src={gift.initiator.profile_image} alt={gift.initiator?.name || 'Initiator'} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--bg-1)] shadow-sm" />
            ) : (
              <div className="w-10 h-10 bg-[var(--bg-2)] rounded-full flex items-center justify-center border-2 border-[var(--bg-1)] shadow-sm">
                <User className="w-5 h-5 text-[var(--muted)]" />
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs text-[var(--muted)] uppercase tracking-wider">{t('gifts.organizedBy', 'Organized By')}</span>
              <span className="font-semibold text-[var(--text)]">{gift.initiator?.name || t('gifts.unknownInitiator', 'Unknown')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="p-4 bg-[var(--bg-2)] rounded-xl border border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">{t('gifts.targetAmount', 'Target Amount')}</div>
          <div className="font-bold text-[var(--text)] text-lg">₹{gift.target_amount}</div>
        </div>
        <div className="p-4 bg-[var(--bg-2)] rounded-xl border border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">{t('gifts.recipient', 'Recipient')}</div>
          <div className="font-bold text-[var(--text)] text-lg truncate">{gift.recipient?.name || t('gifts.unknownRecipient', 'Unknown')}</div>
        </div>
      </div>

      {gift.message && (
        <div className="p-4 bg-[var(--bg-2)]/50 rounded-xl border border-[var(--border)] italic text-[var(--text)] relative">
          <QuoteIcon className="w-6 h-6 text-[var(--heritage-blue)]/20 absolute top-2 left-2" />
          <p className="relative z-10 pl-6 text-sm leading-relaxed">&quot;{gift.message}&quot;</p>
        </div>
      )}

      <Link href={`/group-gift/${gift.id}`} className="mt-2 btn-secondary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--heritage-blue)]/5 hover:text-[var(--heritage-blue)] hover:border-[var(--heritage-blue)]/30 transition-all group w-full relative z-10 text-center">
        {t('gifts.viewGroupGift', 'View Group Gift')}
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
}

function QuoteIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  )
}
