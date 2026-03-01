
'use client';
import { useEffect, useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Heart, MessageCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
interface ReelProfile {
  name: string;
  profile_image: string | null;
}
interface ReelProduct {
  id: string;
  title: string;
}

export interface Reel {
  id: number;
  user_id: string;
  product_id: string;
  video_url: string;
  caption: string;
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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null); // last reel's created_at
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [products, setProducts] = useState<ReelProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's products for dropdown when modal opens
  useEffect(() => {
    if (!user?.id || !showUploadModal) return;
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    };
    fetchProducts();
  }, [user?.id, showUploadModal]);
  const { t } = useTranslation();

  // Comment UI state
  const [openCommentReelId, setOpenCommentReelId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState<Record<number, ReelComment[]>>({});


  // Fetch reels with cursor-based pagination
  const fetchReels = async (cursorValue: string | null, isInitial = false, retryAttempt = 0) => {
    if (loading) return;
    if (!isInitial && !hasMore) return;
    if (isInitial) setInitialLoading(true);
    setLoading(true);
    setFetchError(null);
    let query = supabase
      .from('reel')
      .select('*, profiles(name, profile_image), products(title)')
      .order('created_at', { ascending: false })
      .limit(6);
    if (cursorValue) query = query.lt('created_at', cursorValue);
    try {
      const { data, error } = await query;
      if (!error && data) {
        if (isInitial) {
          setReels(data);
          setCursor(data.length ? data[data.length - 1].created_at : cursorValue);
          setHasMore(data.length === 6 || data.length > 0);
        } else if (data.length > 0) {
          setReels(prev => [...prev, ...data]);
          setCursor(data.length ? data[data.length - 1].created_at : cursorValue);
          setHasMore(data.length === 6);
        } else {
          // No more new reels, repeat the current reels to simulate endless scroll
          setReels(prev => {
            if (prev.length === 0) return prev;
            // Shuffle the repeated reels for variety
            const shuffled = [...prev].sort(() => Math.random() - 0.5);
            return [...prev, ...shuffled];
          });
          setHasMore(true); // Keep infinite scroll going
        }
      } else {
        throw error || new Error('Unknown error');
      }
    } catch (err: any) {
      setFetchError(t('reels.fetchError', { defaultValue: 'Failed to load reels. Please check your connection and try again.' }));
      // Retry automatically up to 2 times with exponential backoff
      if (retryAttempt < 2) {
        setTimeout(() => {
          fetchReels(cursorValue, isInitial, retryAttempt + 1);
        }, 1000 * Math.pow(2, retryAttempt));
      }
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReels(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: fetch more when sentinel is visible
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchReels(cursor);
    }, { threshold: 1 });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hasMore, loading]);

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
      <div className="w-full max-w-md md:max-w-2xl flex items-center justify-between mb-6 px-3 sm:px-0">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text)]">{t('navigation.reels', { defaultValue: 'Reels' })}</h1>
        {user?.id && (
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-2xl shadow-lg transition-colors"
            title="Create Reel"
            onClick={() => setShowUploadModal(true)}
          >
            <span className="pb-1">+</span>
          </button>
        )}
            {/* Upload Reel Modal */}
            {showUploadModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-2 sm:px-0">
                <div
                  className="rounded-xl shadow-xl w-full max-w-md relative border border-[var(--border)] p-4 sm:p-8 flex flex-col transition-colors"
                  style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                >
                  <button
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 text-2xl text-gray-400 hover:text-gray-700"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => { setShowUploadModal(false); setUploadError(null); setUploadFile(null); setCaption(''); setSelectedProduct(''); }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <h2 className="text-lg sm:text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Upload New Reel</h2>
                  <form
                    onSubmit={async (e: FormEvent) => {
                      e.preventDefault();
                      setUploadError(null);
                      if (!uploadFile) {
                        setUploadError('Please select a video file');
                        return;
                      }
                      if (!user?.id) {
                        setUploadError('User not found');
                        return;
                      }
                      setUploading(true);
                      try {
                        const fileExt = uploadFile.name.split('.').pop();
                        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
                        const { error: storageError } = await supabase.storage
                          .from('videos')
                          .upload(fileName, uploadFile, { upsert: false, contentType: uploadFile.type });
                        if (storageError) {
                          setUploadError('Upload failed: ' + storageError.message);
                          setUploading(false);
                          return;
                        }
                        const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(fileName);
                        const videoUrl = publicUrlData?.publicUrl;
                        if (!videoUrl) {
                          setUploadError('Could not get video URL');
                          setUploading(false);
                          return;
                        }
                        // Insert into reel table
                        const { error: insertError } = await supabase.from('reel').insert([
                          {
                            user_id: user.id,
                            video_url: videoUrl,
                            caption: caption,
                            product_id: selectedProduct || null,
                          },
                        ]);
                        if (insertError) {
                          setUploadError('Database error: ' + insertError.message);
                          setUploading(false);
                          return;
                        }
                        setUploadFile(null);
                        setCaption('');
                        setUploading(false);
                        setUploadError(null);
                        setShowUploadModal(false);
                        setSelectedProduct('');
                        // Refetch reels
                        setLoading(true);
                        const { data, error } = await supabase
                          .from('reel')
                          .select('*, profiles(name, profile_image), products(title)')
                          .order('created_at', { ascending: false });
                        if (!error && data) setReels(data);
                        setLoading(false);
                      } catch (err: any) {
                        setUploadError('Unexpected error: ' + err.message);
                        setUploading(false);
                      }
                    }}
                    className="flex flex-col gap-3 sm:gap-4"
                  >
                    <label className="text-sm font-medium mb-1" htmlFor="reel-upload-file" style={{ color: 'var(--text)' }}>Video File</label>
                    <input
                      id="reel-upload-file"
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setUploadError(null);
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setUploadError('File size must be less than 10MB');
                            setUploadFile(null);
                          } else {
                            setUploadFile(file);
                          }
                        }
                      }}
                      className="file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 w-full border border-[var(--border)]"
                      style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                      disabled={uploading}
                    />
                    <label className="text-sm font-medium mb-1" htmlFor="reel-upload-caption" style={{ color: 'var(--text)' }}>Caption (optional)</label>
                    <input
                      id="reel-upload-caption"
                      type="text"
                      placeholder="Caption (optional)"
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      className="border rounded px-3 py-2 text-base border-[var(--border)] focus:outline-none focus:border-purple-500"
                      style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                      disabled={uploading}
                    />
                    <label className="text-sm font-medium mb-1" htmlFor="reel-upload-product" style={{ color: 'var(--text)' }}>Link Product</label>
                    <select
                      id="reel-upload-product"
                      className="border rounded px-3 py-2 text-base border-[var(--border)] focus:outline-none focus:border-purple-500"
                      style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                      value={selectedProduct}
                      onChange={e => setSelectedProduct(e.target.value)}
                      disabled={uploading || products.length === 0}
                    >
                      <option value="">No Product (Just a Reel)</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                    {uploadError && <div className="text-red-600 text-sm">{uploadError}</div>}
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded shadow disabled:opacity-60 transition-all text-base mt-2"
                      disabled={uploading || !uploadFile}
                    >
                      {uploading ? 'Uploading...' : 'Upload Reel'}
                    </button>
                    <div className="text-xs text-[var(--muted)] mt-1">Max file size: 10MB. Only video files allowed.</div>
                  </form>
                </div>
              </div>
            )}
      </div>
      <div className="w-full max-w-md md:max-w-2xl flex flex-col gap-8">
        {initialLoading ? (
          <div className="flex justify-center items-center h-96">
            <span className="text-[var(--muted)]">{t('common.loading', { defaultValue: 'Loading...' })}</span>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col justify-center items-center h-96 gap-4">
            <span className="text-red-600 text-center">{fetchError}</span>
            <button
              className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold disabled:opacity-60"
              onClick={() => { setFetchError(null); setRetryCount(c => c + 1); fetchReels(cursor, false); }}
            >
              {t('reels.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : reels.length === 0 ? (
          <div className="flex justify-center items-center h-96">
            <span className="text-[var(--muted)]">{t('reels.noReels', { defaultValue: 'No reels yet.' })}</span>
          </div>
        ) : (
          <>
            {reels.map((reel, idx) => (
              <div key={reel.id + '-' + idx} className="rounded-xl shadow-lg bg-[var(--bg)] border border-[var(--border)] overflow-hidden flex flex-col">
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
                <div className="text-[var(--text)] text-base font-medium">{reel.caption}</div>
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
            ))}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} />
            {loading && (
              <div className="flex justify-center items-center py-8">
                <span className="text-[var(--muted)]">{t('common.loading', { defaultValue: 'Loading...' })}</span>
              </div>
            )}
            {!hasMore && reels.length > 0 && (
              <div className="flex justify-center items-center py-8">
                <span className="text-[var(--muted)]">{t('reels.endOfList', { defaultValue: 'No more reels.' })}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReelsPage;

