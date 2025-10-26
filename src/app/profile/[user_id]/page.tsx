'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase';
import { Database } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Trophy, Users, Send } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row']

export default function PublicProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mitraPoints, setMitraPoints] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(true);

  const user_id = typeof params.user_id === 'string' ? params.user_id : Array.isArray(params.user_id) ? params.user_id[0] : '';

  useEffect(() => {
    async function fetchProfile() {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single();
      setProfile(profile || null);

      // MitraPoints logic
      const { data: auctions } = await supabase
        .from('auctions')
        .select('id')
        .eq('winner_id', user_id);
      setMitraPoints(auctions && Array.isArray(auctions) ? auctions.length * 10 : 0);
    }
    if (user_id) fetchProfile();
  }, [user_id]);

  useEffect(() => {
    async function fetchFollowers() {
      if (!user_id) return;
      setFollowersLoading(true);
      // Followers count
      const { count } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id);
      setFollowersCount(count || 0);
      // Is user following?
      if (user?.id && user?.id !== user_id) {
        const { data: existing } = await supabase
          .from('followers')
          .select('*')
          .eq('user_id', user_id)
          .eq('follower_id', user.id)
          .maybeSingle();
        setIsFollowing(!!existing);
      }
      setFollowersLoading(false);
    }
    fetchFollowers();
  }, [user_id, user]);

  // Follow action
  const handleFollowClick = async () => {
    if (!user?.id || !user_id || user.id === user_id) return;
    setFollowersLoading(true);
    if (isFollowing) {
      await supabase.from('followers').delete().eq('user_id', user_id).eq('follower_id', user.id);
      setFollowersCount(f => Math.max(0, f - 1));
      setIsFollowing(false);
    } else {
      await supabase.from('followers').insert({ user_id, follower_id: user.id });
      setFollowersCount(f => f + 1);
      setIsFollowing(true);
    }
    setFollowersLoading(false);
  };

  // Floating DM button handler
  const handleFloatingDM = useCallback(() => {
    if (profile && user && user.id !== user_id) {
      window.location.href = `/dm?userId=${user_id}`;
    }
  }, [profile, user, user_id]);

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">Profile not found.</div>;

  return (
    <main className="min-h-screen heritage-bg relative overflow-hidden">
      <div className="absolute inset-0 indian-pattern opacity-5"></div>
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[var(--saffron)]/20 to-[var(--turquoise)]/20 rounded-full mix-blend-multiply filter blur-2xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-[var(--maroon)]/20 to-[var(--royal-blue)]/20 rounded-full mix-blend-multiply filter blur-2xl animate-float" style={{animationDelay: '2s'}}></div>
      <div className="container-custom py-10 max-w-xl mx-auto relative z-10">
        <div className="card-glass flex flex-col items-center rounded-3xl shadow-2xl p-8 hover-lift">
          {/* Avatar and Name */}
          <div className="relative group mb-6">
            <div className="avatar-indian-frame">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--saffron)] via-[var(--turquoise)] to-[var(--maroon)] flex items-center justify-center border-2 border-[var(--border)] overflow-hidden">
                {profile.profile_image ? (
                  <img src={profile.profile_image} alt="avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-4xl font-bold text-white">{profile.name?.[0] || '?'}</span>
                )}
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-[var(--saffron)] via-[var(--turquoise)] to-[var(--maroon)] bg-clip-text text-transparent drop-shadow-lg">{profile.name || 'User'}</h2>
          {/* Followers, Follow, and Message button */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--saffron)]" />
              <span className="font-semibold text-[var(--text)] text-base">{followersLoading ? <span className="animate-pulse text-[var(--muted)]">...</span> : followersCount}</span>
              <span className="text-xs text-[var(--muted)] ml-1">Followers</span>
            </div>
            {user && user.id !== user_id && (
              <>
                <button
                  className={`btn-indian-secondary px-4 py-1 md:py-2 rounded-xl flex items-center gap-2 text-sm md:text-base ${followersLoading ? 'opacity-60 pointer-events-none' : ''}`}
                  onClick={handleFollowClick}
                  disabled={followersLoading}
                >
                  <Users className="w-4 h-4" />
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <a
                  href={`/dm?userId=${user_id}`}
                  className="btn-indian-primary px-4 py-1 md:py-2 rounded-xl flex items-center gap-2 text-sm md:text-base"
                  title="Message"
                  onClick={e => {
                    e.preventDefault();
                    window.location.href = `/dm?userId=${user_id}`;
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4-4.5 7-9 7s-9-3-9-7a9 9 0 1 1 18 0z" />
                  </svg>
                  Message
                </a>
              </>
            )}
          </div>
          {/* MitraPoints */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-[var(--trust-gold)] to-[var(--saffron)] shadow-lg font-bold text-white text-base border border-white/20">
              <Trophy className="w-5 h-5 mr-1" />
              {mitraPoints}
              <span className="ml-1 text-xs font-semibold uppercase tracking-wide">MitraPoints</span>
            </span>
          </div>
          <div className="w-full max-w-md mx-auto mb-2">
            <div className="font-semibold text-[var(--text)] text-center mb-1">Description</div>
            <p className="text-[var(--muted)] text-center mb-4 min-h-[2em]">{profile.bio || <span className="text-[var(--muted)]/60 italic">No description provided.</span>}</p>
          </div>
        </div>
      </div>
      {/* Floating Message Button - only for logged-in users not viewing own profile */}
      {user && profile && user.id !== user_id && (
        <button
          onClick={handleFloatingDM}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-500 via-green-500 to-teal-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 px-5 py-3 font-semibold"
          title={`Message ${profile.name || 'User'}`}
        >
          <span className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            <span className="text-xs font-semibold">Message</span>
          </span>
        </button>
      )}
    </main>
  );
}



export const dynamic = 'force-dynamic';
