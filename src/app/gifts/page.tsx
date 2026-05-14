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

  function SectionShell({ children }: { children: React.ReactNode }) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-1)_0%,var(--bg-2)_100%)] shadow-[0_22px_70px_rgba(0,0,0,0.07)]">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--heritage-gold) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute -left-24 top-0 h-60 w-60 rounded-full bg-[radial-gradient(circle,var(--heritage-gold)_0%,transparent_70%)] blur-3xl opacity-12 pointer-events-none" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--heritage-blue)_0%,transparent_72%)] blur-3xl opacity-10 pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  function GiftsHero() {
    return (
      <SectionShell>
        <div className="grid gap-8 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--heritage-gold)]/20 bg-[var(--heritage-gold)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--heritage-gold)] shadow-[0_8px_22px_rgba(176,141,85,0.12)]">
              <Sparkles className="h-4 w-4" />
              {t('gifts.heroBadge', 'KalaMitra gifting')}
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] md:text-5xl lg:text-6xl">
                {t('gifts.centerTitle', 'Your Gifts')}
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg lg:mx-0">
                {t('gifts.centerSubtitle', 'Celebrate craftsmanship and shared heritage with every present.')}
              </p>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--muted)]/90 lg:mx-0">
                One place for received surprises, sent moments, and shared celebrations.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--heritage-red)_0%,var(--heritage-gold)_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(169,68,66,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(169,68,66,0.24)]"
              >
                <Gift className="h-5 w-5" />
                {t('gifts.sendIndividualGift', 'Send a Gift')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] px-5 py-3 text-sm font-semibold text-[var(--text)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--heritage-blue)]/30 hover:bg-[var(--heritage-blue)]/5"
                onClick={() => window.location.href = '/marketplace'}
              >
                <Users className="h-5 w-5 text-[var(--heritage-blue)]" />
                {t('gifts.startGroupGift', 'Start Group Gift')}
              </button>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-1)]/75 p-5 backdrop-blur-sm shadow-[0_18px_40px_rgba(0,0,0,0.05)]">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-2)_0%,var(--bg-1)_100%)] px-4 py-5 shadow-sm">
                <div className="text-2xl font-bold text-[var(--heritage-red)]">{giftsR.length}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Received</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-2)_0%,var(--bg-1)_100%)] px-4 py-5 shadow-sm">
                <div className="text-2xl font-bold text-[var(--heritage-gold)]">{giftsS.length}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Sent</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-2)_0%,var(--bg-1)_100%)] px-4 py-5 shadow-sm">
                <div className="text-2xl font-bold text-[var(--heritage-blue)]">{groupGifts.length}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Group</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,var(--heritage-blue)_0%,var(--heritage-green)_100%)] p-5 text-white shadow-[0_18px_40px_rgba(59,89,152,0.16)]">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Gift pulse</p>
              <p className="mt-2 text-lg font-semibold">
                Track every gift, open surprises cleanly, and keep shared gifts readable at a glance.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  function GiftTabs() {
    const tabs = [
      { id: 'received', label: 'Received', icon: Gift, hint: 'Open what arrived for you', tone: 'from-[var(--heritage-red)] to-[var(--heritage-gold)]' },
      { id: 'sent', label: 'Sent', icon: Heart, hint: 'Review your outgoing gifts', tone: 'from-[var(--heritage-gold)] to-[var(--heritage-accent)]' },
      { id: 'group', label: 'Group', icon: Users, hint: 'Shared gifts and contributions', tone: 'from-[var(--heritage-blue)] to-[var(--heritage-green)]' },
    ] as const;

    return (
      <div className="flex justify-center">
        <div className="grid w-full max-w-4xl gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-1)]/85 p-2.5 shadow-[0_14px_50px_rgba(0,0,0,0.06)] backdrop-blur-md md:grid-cols-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative overflow-hidden rounded-2xl px-4 py-4 text-left transition-all duration-300 ${isActive ? 'text-white shadow-[0_16px_35px_rgba(0,0,0,0.15)]' : 'bg-[var(--bg-2)]/70 text-[var(--muted)] hover:-translate-y-0.5 hover:bg-[var(--bg-2)] hover:text-[var(--text)]'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="gift-tab-active"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.tone}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                {isActive && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />}
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-semibold uppercase tracking-[0.16em]">{tab.label}</span>
                    </div>
                    <p className={`text-sm ${isActive ? 'text-white/80' : 'text-[var(--muted)]'}`}>
                      {tab.hint}
                    </p>
                  </div>
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold ring-1 ${isActive ? 'bg-white/20 text-white ring-white/20' : 'bg-[var(--bg-1)] text-[var(--text)] shadow-sm ring-[var(--border)]'}`}>
                    {tab.id === 'received' ? giftsR.length : tab.id === 'sent' ? giftsS.length : groupGifts.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function EmptyState({ icon, title, description, actionText, actionHref, colorClass }: { icon: React.ReactNode, title: string, description: string, actionText: string, actionHref: string, colorClass: string }) {
    return (
      <div className="relative mx-auto flex max-w-2xl flex-col items-center overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-1)_0%,var(--bg-2)_100%)] px-8 py-16 text-center shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colorClass}`} />
        <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${colorClass} text-white shadow-[0_18px_30px_rgba(0,0,0,0.12)] ring-1 ring-white/10`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-[var(--text)]">{title}</h3>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">{description}</p>
        <Link href={actionHref} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[var(--heritage-gold)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(176,141,85,0.20)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(176,141,85,0.26)]">
          {actionText}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  function ReceivedCard({ gift, index, handleUnbox, handleThank, thankedGifts, confettiGiftId, t, user }: any) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.08 }}
        className={`relative overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(180deg,var(--bg-1)_0%,var(--bg-2)_100%)] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.055)] transition-transform duration-300 hover:-translate-y-1 md:p-7 ${gift.viewed ? 'border-[var(--border)]' : 'border-[var(--heritage-gold)]/35'}`}
      >
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${gift.viewed ? 'from-[var(--heritage-blue)]/50 via-[var(--heritage-green)]/60 to-[var(--heritage-blue)]/50' : 'from-[var(--heritage-gold)] via-[var(--heritage-red)] to-[var(--heritage-gold)]'}`} />
        {!gift.viewed && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(176,141,85,0.16),transparent_45%)]" />}
        {confettiGiftId === gift.id && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-1)]/75 backdrop-blur-sm">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex-shrink-0">
              {gift.viewed ? (
                gift.product?.image_url ? (
                  <img src={gift.product.image_url} alt={gift.product.title} className="h-28 w-28 rounded-[1.25rem] object-cover shadow-[0_12px_30px_rgba(0,0,0,0.12)] ring-1 ring-[var(--border)]" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-2)] text-[var(--muted)]">
                    <Gift className="h-10 w-10" />
                  </div>
                )
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,var(--heritage-red)_0%,var(--heritage-gold)_100%)] text-white shadow-[0_18px_35px_rgba(169,68,66,0.2)]">
                  <Gift className="h-11 w-11" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ring-1 ${gift.viewed ? 'bg-[var(--success)]/10 text-[var(--success)] ring-[var(--success)]/15' : 'bg-[var(--heritage-gold)]/12 text-[var(--heritage-gold)] ring-[var(--heritage-gold)]/15'}`}>
                  {gift.viewed ? 'Opened' : 'New gift'}
                </span>
                {gift.metadata?.type === 'group_gift' && (
                  <span className="rounded-full bg-[var(--heritage-blue)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--heritage-blue)] ring-1 ring-[var(--heritage-blue)]/15">
                    Group gift
                  </span>
                )}
              </div>

              {gift.viewed ? (
                <Link href={`/product/${gift.product?.id}`} className="block">
                  <h3 className="text-2xl font-bold text-[var(--text)] transition-colors hover:text-[var(--heritage-gold)]">
                    {gift.product?.title || t('gifts.gift', 'Gift')}
                  </h3>
                </Link>
              ) : (
                <h3 className="text-2xl font-bold text-[var(--heritage-gold)]">
                  {t('gifts.gift', 'A Special Gift')}
                </h3>
              )}

              <p className="text-sm text-[var(--muted)]">
                {t('gifts.receivedOn', 'Received on {{date}}', { date: new Date(gift.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}
              </p>

              <div className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-1)]/70 px-3 py-2.5">
                {gift.viewed ? (
                  gift.metadata?.type === 'group_gift' && Array.isArray(gift.contributors) && gift.contributors.length > 0 ? (
                    <div className="flex -space-x-3 pr-1">
                      {gift.contributors.slice(0, 4).map((c: any, idx: number) => (
                        c.profile_image ? (
                          <img key={c.id} src={c.profile_image} alt={c.name} className="h-10 w-10 rounded-full border-2 border-[var(--bg-1)] object-cover shadow-sm" style={{ zIndex: 10 - idx }} />
                        ) : (
                          <div key={c.id} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-1)] bg-gradient-to-br from-[var(--heritage-blue)] to-[var(--heritage-green)] text-xs font-bold text-white shadow-sm" style={{ zIndex: 10 - idx }}>
                            {c.name?.charAt(0) || <User className="h-4 w-4" />}
                          </div>
                        )
                      ))}
                      {gift.contributors.length > 4 && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-1)] bg-[var(--bg-2)] text-xs font-bold text-[var(--muted)] shadow-sm">
                          +{gift.contributors.length - 4}
                        </div>
                      )}
                    </div>
                  ) : gift.sender?.profile_image ? (
                    <img src={gift.sender.profile_image} alt={gift.sender?.name || 'Sender'} className="h-10 w-10 rounded-full border-2 border-[var(--bg-1)] object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-1)] bg-[var(--bg-2)] shadow-sm">
                      <User className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                  )
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-1)] bg-[var(--bg-2)] shadow-sm">
                    <User className="h-5 w-5 text-[var(--muted)]" />
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">From</div>
                  <div className="font-semibold text-[var(--text)]">
                    {gift.viewed ? (gift.metadata?.type === 'group_gift' && Array.isArray(gift.contributors) && gift.contributors.length > 0 ? gift.contributors.map((c: any) => c.name).join(', ') : (gift.sender?.name || t('gifts.unknownSender', 'Unknown Sender'))) : t('gifts.senderHidden', 'Someone Special')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {gift.message && (
            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-2)]/70 p-4 text-sm italic text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <p className="leading-6 text-[15px]">“{gift.message}”</p>
            </div>
          )}

          <div className="space-y-3">
            {!gift.viewed && user && (
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--heritage-red)_0%,var(--heritage-gold)_100%)] px-5 py-3 text-base font-bold text-white shadow-[0_16px_30px_rgba(169,68,66,0.18)] transition-transform duration-200 hover:-translate-y-0.5" onClick={() => handleUnbox(gift.id)}>
                <Sparkles className="h-5 w-5" />
                {t('gifts.unwrapGift', 'Unwrap Gift')}
              </button>
            )}
            {gift.viewed && !thankedGifts.has(gift.id) && (
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] px-5 py-3 text-base font-semibold text-[var(--text)] transition-all hover:-translate-y-0.5 hover:border-[var(--heritage-red)]/25 hover:bg-[var(--heritage-red)]/5 hover:text-[var(--heritage-red)]" onClick={() => handleThank(gift.id)}>
                <Heart className="h-5 w-5" />
                {t('gifts.thankSender', 'Say Thank You')}
              </button>
            )}
            {thankedGifts.has(gift.id) && (
              <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 px-5 py-3 font-semibold text-[var(--success)]">
                <Heart className="h-5 w-5 fill-[var(--success)]" />
                {t('gifts.thanked', 'Thanked')}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  function SentCard({ gift, index, t }: any) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.08 }}
        className="rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-1)_0%,var(--bg-2)_100%)] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.055)] md:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--heritage-gold)]/40 via-[var(--heritage-accent)]/70 to-[var(--heritage-gold)]/40" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex-shrink-0">
            {gift.product?.image_url ? (
              <img src={gift.product.image_url} alt={gift.product.title} className="h-24 w-24 rounded-[1.25rem] object-cover shadow-[0_12px_30px_rgba(0,0,0,0.12)] ring-1 ring-[var(--border)]" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-2)] text-[var(--muted)]">
                <Gift className="h-9 w-9" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <Link href={`/product/${gift.product?.id}`} className="block">
              <h3 className="text-2xl font-bold text-[var(--text)] transition-colors hover:text-[var(--heritage-gold)]">
                {gift.product?.title || t('gifts.gift', 'Gift')}
              </h3>
            </Link>
            <p className="text-sm text-[var(--muted)]">
              {t('gifts.sentOn', 'Sent on {{date}}', { date: new Date(gift.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}
            </p>

            <div className="flex items-center gap-3">
              {gift.recipient?.profile_image ? (
                <img src={gift.recipient.profile_image} alt={gift.recipient?.name || 'Recipient'} className="h-10 w-10 rounded-full border-2 border-[var(--bg-1)] object-cover shadow-sm" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-1)] bg-[var(--bg-2)] shadow-sm">
                  <User className="h-5 w-5 text-[var(--muted)]" />
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">To</div>
                <div className="font-semibold text-[var(--text)]">{gift.recipient?.name || t('gifts.unknownRecipient', 'Unknown Recipient')}</div>
              </div>
            </div>
          </div>
        </div>

          {gift.message && (
            <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-2)]/70 p-4 text-sm italic text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <p className="leading-6 text-[15px]">“{gift.message}”</p>
          </div>
        )}
      </motion.div>
    );
  }

  function GroupCard({ gift, index, t }: any) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.08 }}
        className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-1)_0%,var(--bg-2)_100%)] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.055)] md:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--heritage-blue)]/40 via-[var(--heritage-green)]/70 to-[var(--heritage-blue)]/40" />
        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[radial-gradient(circle,rgba(59,89,152,0.12),transparent_70%)]" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex-shrink-0">
              {gift.product?.image_url ? (
                <img src={gift.product.image_url} alt={gift.product.title} className="h-24 w-24 rounded-[1.25rem] object-cover shadow-[0_12px_30px_rgba(0,0,0,0.12)] ring-1 ring-[var(--border)]" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-2)] text-[var(--muted)]">
                  <Users className="h-9 w-9" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <Link href={`/group-gift/${gift.id}`} className="block">
                <h3 className="text-2xl font-bold text-[var(--text)] transition-colors hover:text-[var(--heritage-blue)]">
                  {gift.product?.title || t('gifts.groupTab', 'Group Gift')}
                </h3>
              </Link>
              <p className="text-sm text-[var(--muted)]">
                {t('gifts.createdOn', 'Created on {{date}}', { date: new Date(gift.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}
              </p>

              <div className="flex items-center gap-3">
                {gift.initiator?.profile_image ? (
                  <img src={gift.initiator.profile_image} alt={gift.initiator?.name || 'Initiator'} className="h-10 w-10 rounded-full border-2 border-[var(--bg-1)] object-cover shadow-sm" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-1)] bg-[var(--bg-2)] shadow-sm">
                    <User className="h-5 w-5 text-[var(--muted)]" />
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Organized by</div>
                  <div className="font-semibold text-[var(--text)]">{gift.initiator?.name || t('gifts.unknownInitiator', 'Unknown')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Target amount</div>
              <div className="mt-1 text-lg font-bold text-[var(--text)]">₹{gift.target_amount}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Recipient</div>
              <div className="mt-1 truncate text-lg font-bold text-[var(--text)]">{gift.recipient?.name || t('gifts.unknownRecipient', 'Unknown')}</div>
            </div>
          </div>

          {gift.message && (
            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-2)]/70 p-4 text-sm italic text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <p className="leading-6 text-[15px]">“{gift.message}”</p>
            </div>
          )}

          <Link href={`/group-gift/${gift.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--heritage-blue)_0%,var(--heritage-green)_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(59,89,152,0.18)] transition-transform duration-200 hover:-translate-y-0.5">
            {t('gifts.viewGroupGift', 'View Group Gift')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    );
  }

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

      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 space-y-10 md:space-y-14">

        <div className="pt-10 md:pt-14">
          <GiftsHero />
        </div>

        <GiftTabs />

        {/* Render Tab Content */}
        <div className="animate-slide-in-up animate-delay-500">
          {activeTab === 'received' && (
            giftsR.length === 0 ? (
              <EmptyState
                icon={<Gift className="w-16 h-16" />}
                title={t('gifts.receivedEmpty', 'No gifts received yet')}
                description={t('gifts.receivedEmptyDescription', 'Browse the marketplace to discover thoughtful gifts waiting to be opened.')}
                actionText={t('gifts.sendGiftNow', 'Browse Marketplace')}
                actionHref="/marketplace"
                colorClass="from-[var(--heritage-red)] to-[var(--heritage-gold)]"
              />
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {giftsR.map((gift, idx) => (
                  <ReceivedCard key={gift.id} gift={gift} index={idx} handleUnbox={handleUnbox} handleThank={handleThank} thankedGifts={thankedGifts} confettiGiftId={confettiGiftId} t={t} user={user} />
                ))}
              </div>
            )
          )}

          {activeTab === 'sent' && (
            giftsS.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-16 h-16" />}
                title={t('gifts.sentEmpty', 'No gifts sent yet')}
                description={t('gifts.sentEmptyDescription', 'Send a thoughtful present from the marketplace and it will appear here.')}
                actionText={t('gifts.sendGiftNow', 'Send a Gift')}
                actionHref="/marketplace"
                colorClass="from-[var(--heritage-gold)] to-[var(--heritage-accent)]"
              />
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {giftsS.map((gift, idx) => (
                  <SentCard key={gift.id} gift={gift} index={idx} t={t} />
                ))}
              </div>
            )
          )}

          {activeTab === 'group' && (
            groupGifts.length === 0 ? (
              <EmptyState
                icon={<Users className="w-16 h-16" />}
                title={t('gifts.groupEmpty', 'No group gifts yet')}
                description={t('gifts.groupEmptyDescription', 'Start a shared gift and invite friends to contribute toward one memorable present.')}
                actionText={t('gifts.startGroupGiftNow', 'Start a Group Gift')}
                actionHref="/marketplace"
                colorClass="from-[var(--heritage-blue)] to-[var(--heritage-green)]"
              />
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {groupGifts.map((gift, idx) => (
                  <GroupCard key={gift.id} gift={gift} index={idx} t={t} />
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
