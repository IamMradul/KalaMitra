
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Heart, MessageCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const ReelsPage = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();

  // Comment UI state
  const [openCommentReelId, setOpenCommentReelId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState<Record<number, ReelComment[]>>({});

  useEffect(() => {
    const fetchReels = async () => {
      const { data, error } = await supabase
        .from('reel')
        .select('*, profiles(name, profile_image), products(title)')
        .order('created_at', { ascending: false });
      if (!error && data) setReels(data);
      setLoading(false);
    };
    fetchReels();
  }, []);

  // Fetch comments for a reel
  const fetchComments = async (reelId: number) => {
    const { data, error } = await supabase
      .from('reel_comment')
      .select('*, profiles(name, profile_image)')
      .eq('reel_id', reelId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setComments(prev => ({ ...prev, [reelId]: data }));
    }
  };

  // Intersection Observer for auto play/pause
  useEffect(() => {
    const videoElements = document.querySelectorAll('.reel-video');
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          if (video.paused) {
            video.play().catch(() => {}); // Ignore AbortError
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      });
    };
    const observer = new window.IntersectionObserver(handleIntersection, {
      threshold: 0.7 // 70% visible
    });
    videoElements.forEach(video => observer.observe(video));
    return () => {
      videoElements.forEach(video => observer.unobserve(video));
      observer.disconnect();
    };
  }, [reels]);

  // Track which reels the user has liked
  const [likedReels, setLikedReels] = useState<number[]>([]);

  useEffect(() => {
    // Fetch liked reels for current user
    const fetchLikedReels = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('reel_likes')
        .select('reel_id')
        .eq('user_id', user.id);
      if (!error && data) {
        setLikedReels(data.map((row: { reel_id: number }) => row.reel_id));
      }
    };
    fetchLikedReels();
  }, [user?.id, reels]);

  // Toggle like/unlike handler
  const handleLike = async (reelId: number) => {
    if (!user?.id) {
      alert('You must be logged in to like reels.');
      return;
    }
    if (likedReels.includes(reelId)) {
      // Unlike: remove from reel_likes and decrement likes
      const { error: unlikeError } = await supabase
        .from('reel_likes')
        .delete()
        .eq('reel_id', reelId)
        .eq('user_id', user.id);
      if (unlikeError) {
        alert('Failed to unlike reel.');
        return;
      }
      // Decrement likes count
      await supabase.rpc('decrement_reel_likes', { reel_id: reelId });
      setLikedReels(likedReels.filter(id => id !== reelId));
      setReels(reels => reels.map(r => r.id === reelId ? { ...r, likes: Math.max((r.likes || 1) - 1, 0) } : r));
    } else {
      // Like: insert into reel_likes and increment likes
      const { error: likeError } = await supabase
        .from('reel_likes')
        .insert({ reel_id: reelId, user_id: user.id });
      if (likeError) {
        alert('Failed to like reel.');
        return;
      }
      await supabase.rpc('increment_reel_likes', { reel_id: reelId });
      setLikedReels([...likedReels, reelId]);
      setReels(reels => reels.map(r => r.id === reelId ? { ...r, likes: (r.likes || 0) + 1 } : r));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)] flex flex-col items-center py-4">
      <h1 className="text-3xl font-bold text-[var(--text)] mb-6">{t('navigation.reels', { defaultValue: 'Reels' })}</h1>
      <div className="w-full max-w-md md:max-w-2xl flex flex-col gap-8">
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <span className="text-[var(--muted)]">{t('common.loading', { defaultValue: 'Loading...' })}</span>
          </div>
        ) : reels.length === 0 ? (
          <div className="flex justify-center items-center h-96">
            <span className="text-[var(--muted)]">{t('reels.noReels', { defaultValue: 'No reels yet.' })}</span>
          </div>
        ) : (
          reels.map(reel => (
            <div key={reel.id} className="rounded-xl shadow-lg bg-[var(--bg)] border border-[var(--border)] overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 p-4">
                {reel.profiles?.profile_image ? (
                  <img src={reel.profiles.profile_image} alt={reel.profiles.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-orange-600" />
                )}
                <div>
                   <Link href={`/stall/${reel.user_id}`} className="font-semibold text-[var(--text)] hover:text-orange-600">
                    {reel.profiles?.name || t('profile.title', { defaultValue: 'User' })}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">{new Date(reel.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="w-full max-w-[350px] mx-auto aspect-[4/5] bg-black flex items-center justify-center rounded-lg">
                <video
                  src={reel.video_url}
                  loop
                  playsInline
                  className="reel-video w-full h-full object-cover cursor-pointer rounded-lg"
                  onClick={e => {
                    const video = e.currentTarget;
                    if (video.paused) {
                      video.play();
                    } else {
                      video.pause();
                    }
                  }}
                  onDoubleClick={() => handleLike(reel.id)}
                  style={{ touchAction: 'manipulation' }}
                />
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="text-[var(--text)] text-base font-medium">{reel.comment}</div>
                <div className="flex items-center gap-6 mt-2">
                  <button
                    className={`flex items-center gap-1 text-[var(--muted)] hover:text-orange-600`}
                    onClick={() => handleLike(reel.id)}
                  >
                    <Heart className="w-5 h-5" fill={likedReels.includes(reel.id) ? 'orange' : 'none'} stroke={likedReels.includes(reel.id) ? 'orange' : 'currentColor'} />
                    <span>{reel.likes || 0}</span>
                  </button>
                  <button
                    className="flex items-center gap-1 text-[var(--muted)] hover:text-orange-600"
                    onClick={() => {
                      if (openCommentReelId === reel.id) {
                        setOpenCommentReelId(null);
                      } else {
                        setOpenCommentReelId(reel.id);
                        setCommentInput('');
                        if (!comments[reel.id]) fetchComments(reel.id);
                      }
                    }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{t('reels.comment', { defaultValue: 'Comment' })}</span>
                  </button>
                  {reel.product_id && (
                    <Link href={`/product/${reel.product_id}`} className="text-[var(--muted)] hover:text-orange-600 text-sm">
                      {reel.products?.title ? `${t('product.title', { defaultValue: 'View Product' })}: ${reel.products.title}` : t('product.title', { defaultValue: 'View Product' })}
                    </Link>
                  )}
                </div>
                {/* Comments Section */}
                {openCommentReelId === reel.id && (
                  <div className="mt-4">
                    <div className="flex flex-col gap-2">
                      {/* Existing comments */}
                      <div className="max-h-40 overflow-y-auto mb-2">
                        {comments[reel.id]?.length ? (
                          comments[reel.id].map(cmt => (
                            <div key={cmt.id} className="flex items-start gap-2 mb-2">
                              {cmt.profiles?.profile_image ? (
                                <img src={cmt.profiles.profile_image} alt={cmt.profiles.name} className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-orange-600" />
                              )}
                              <div>
                                <span className="font-semibold text-[var(--text)] text-sm">{cmt.profiles?.name || t('profile.title', { defaultValue: 'User' })}</span>
                                <span className="ml-2 text-xs text-[var(--muted)]">{new Date(cmt.created_at).toLocaleString()}</span>
                                <div className="text-[var(--text)] text-sm mt-1">{cmt.comment}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-[var(--muted)] text-sm">{t('reels.noComments', { defaultValue: 'No comments yet.' })}</span>
                        )}
                      </div>
                      {/* Comment input */}
                      <form
                        className="flex gap-2"
                        onSubmit={async e => {
                          e.preventDefault();
                          if (!user?.id) {
                            alert('You must be logged in to comment.');
                            return;
                          }
                          if (!commentInput.trim()) return;
                          setCommentLoading(true);
                          const { error } = await supabase
                            .from('reel_comment')
                            .insert({
                              reel_id: reel.id,
                              user_id: user.id,
                              comment: commentInput.trim(),
                            });
                          setCommentLoading(false);
                          if (error) {
                            alert('Failed to post comment.');
                            return;
                          }
                          setCommentInput('');
                          fetchComments(reel.id);
                        }}
                      >
                        <input
                          type="text"
                          className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text)] bg-[var(--bg-2)] focus:outline-none focus:border-orange-600"
                          placeholder={t('reels.addComment', { defaultValue: 'Add a comment...' })}
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          disabled={commentLoading}
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold disabled:opacity-60"
                          disabled={commentLoading || !commentInput.trim()}
                        >
                          {commentLoading ? t('common.loading', { defaultValue: 'Posting...' }) : t('reels.post', { defaultValue: 'Post' })}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReelsPage;

