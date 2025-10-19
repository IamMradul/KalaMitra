'use client';
import { useEffect, useState } from 'react';

interface ReelProfile {
  name: string;
  profile_image: string | null;
  // ...existing code...
}
interface ReelProduct {
  title: string;
}

export interface Reel {
  id: number;
  user_id: string;
  product_id: string;
  video_url: string;
  comment: string;
  likes: number;
  created_at: string;
  caption?: string; // Added caption property
  profiles?: ReelProfile;
  products?: ReelProduct;
}

export interface ReelComment {
  id: number;
  reel_id: number;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: ReelProfile;
}

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trash2, Video } from 'lucide-react';

import { useTranslation } from 'react-i18next';

export default function SellerReelsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<number, ReelComment[]>>({}); // Use ReelComment

  useEffect(() => {
    const fetchReels = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('reel')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setReels(data);
      setLoading(false);
    };
    fetchReels();
  }, [user?.id]);

  // Intersection Observer for auto play/pause
  useEffect(() => {
    const videoElements = document.querySelectorAll('.seller-reel-video');
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          if (video.paused) {
            video.play().catch(() => {});
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      });
    };
    const observer = new window.IntersectionObserver(handleIntersection, {
      threshold: 0.7
    });
    videoElements.forEach(video => observer.observe(video));
    return () => {
      videoElements.forEach(video => observer.unobserve(video));
      observer.disconnect();
    };
  }, [reels]);

  // Fetch comments for each reel
  useEffect(() => {
    const fetchComments = async () => {
      if (reels.length === 0) return;
      const reelIds = reels.map(r => r.id);
      const { data, error } = await supabase
        .from('reel_comment')
        .select('*, profiles(name, profile_image)')
        .in('reel_id', reelIds);

      if (error) {
        setComments({});
        return;
      }
      if (data) {
        const grouped: Record<number, ReelComment[]> = {};
        (data as ReelComment[]).forEach((c: ReelComment) => {
          if (!grouped[c.reel_id]) grouped[c.reel_id] = [];
          grouped[c.reel_id].push(c);
        });
        setComments(grouped);
      } else {
        setComments({});
      }
    };
    fetchComments();
  }, [reels]);

  // Delete comment handler
  const handleDeleteComment = async (commentId: number, reelId: number) => {
    if (!confirm(t('reels.deleteComment') + '?')) return;
    const { error } = await supabase
      .from('reel_comment')
      .delete()
      .eq('id', commentId);
    if (error) {
      alert(t('reels.deleteComment') + ' ' + t('common.error'));
      return;
    }
    // Refetch comments for this reel for smoothness
    const { data, error: fetchError } = await supabase
      .from('reel_comment')
      .select('*, profiles(name, profile_image)')
      .eq('reel_id', reelId);
    if (!fetchError && data) {
      setComments(prev => ({ ...prev, [reelId]: data }));
    } else {
      setComments(prev => ({ ...prev, [reelId]: [] }));
    }
  };
  const handleDelete = async (reelId: number) => {
    if (!confirm(t('reels.delete') + '?')) return;
    const { error } = await supabase
      .from('reel')
      .delete()
      .eq('id', reelId);
    if (error) {
      alert(t('reels.delete') + ' ' + t('common.error'));
      return;
    }
    setReels(reels => reels.filter(r => r.id !== reelId));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)] flex flex-col items-center py-8">
      <h1 className="text-3xl font-bold text-[var(--text)] mb-6">{t('reels.yourReels')}</h1>
      {loading ? (
        <div className="flex justify-center items-center h-96">
          <span className="text-[var(--muted)]">{t('common.loading')}</span>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex flex-col items-center h-96 justify-center">
          <Video className="w-16 h-16 text-[var(--muted)] mb-4" />
          <span className="text-[var(--muted)]">{t('reels.noReels')}</span>
        </div>
      ) : (
        <div className="w-full max-w-2xl grid gap-8">
          {reels.map(reel => (
            <div key={reel.id} className="rounded-xl shadow-lg bg-[var(--bg)] border border-[var(--border)] overflow-hidden flex flex-col">
              <div className="w-full max-w-[350px] mx-auto aspect-[4/5] bg-black flex items-center justify-center rounded-lg">
                <video
                  src={reel.video_url}
                  loop
                  playsInline
                  className="seller-reel-video w-full h-full object-cover cursor-pointer rounded-lg"
                  onClick={e => {
                    const video = e.currentTarget;
                    if (video.paused) {
                      video.play();
                    } else {
                      video.pause();
                    }
                  }}
                  style={{ touchAction: 'manipulation' }}
                />
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="text-[var(--text)] text-base font-medium">{reel.caption}</div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[var(--muted)] text-sm">{t('reels.likes')}: {reel.likes || 0}</span>
                  <button
                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(reel.id)}
                  >
                    <Trash2 className="w-5 h-5" /> {t('reels.delete')}
                  </button>
                </div>
                {/* Comments Section */}
                <div className="mt-4">
                  <div className="text-[var(--muted)] text-sm font-semibold mb-2">{t('reels.comments')}</div>
                  {Array.isArray(comments[reel.id]) && comments[reel.id].length > 0 ? (
                    <ul className="space-y-2">
                      {comments[reel.id].map(comment => (
                        <li key={comment.id} className="flex items-center bg-[var(--bg-2)] rounded px-2 py-1">
                          {comment.profiles?.profile_image ? (
                            <img src={comment.profiles.profile_image} alt={comment.profiles.name} className="w-7 h-7 rounded-full object-cover mr-2" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                              <span className="text-orange-600 font-bold">{comment.profiles?.name?.[0] || '?'}</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <span className="font-semibold text-[var(--text)] text-sm">{comment.profiles?.name ? comment.profiles.name : t('profile.title', { defaultValue: 'User' })}</span>
                            <span className="ml-2 text-xs text-[var(--muted)]">{new Date(comment.created_at).toLocaleString()}</span>
                            <div className="text-[var(--text)] text-sm mt-1">{comment.comment}</div>
                          </div>
                          <button
                            className="text-red-600 hover:text-red-800 ml-2"
                            onClick={() => handleDeleteComment(comment.id, reel.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[var(--muted)] text-xs">{t('reels.noComments')}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
