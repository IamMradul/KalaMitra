'use client';
import { useEffect, useState } from 'react';

interface ReelProfile {
  name: string;
  profile_image: string | null;
  // ...existing code...
}
interface ReelProduct {
  id: string;
  title: string;
}

export interface Reel {
  id: number;
  user_id: string;
  product_id: string | null;
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

import { ChangeEvent, FormEvent, useRef } from 'react';

export default function SellerReelsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<number, ReelComment[]>>({}); // Use ReelComment

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [products, setProducts] = useState<ReelProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editReel, setEditReel] = useState<Reel | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editProduct, setEditProduct] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
    // Open edit modal for a reel
    const openEditModal = async (reel: Reel) => {
      setEditReel(reel);
      setEditCaption(reel.caption || '');
      setEditProduct(reel.product_id || '');
      setEditError(null);
      setEditModalOpen(true);
      // Fetch products for dropdown if not already loaded
      if (user?.id) {
        const { data, error } = await supabase
          .from('products')
          .select('id, title')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) setProducts(data);
      }
    };

    // Handle edit submit
    const handleEdit = async (e: FormEvent) => {
      e.preventDefault();
      if (!editReel) return;
      setEditLoading(true);
      setEditError(null);
      // Validate product
      if (editProduct && !products.find(p => p.id === editProduct)) {
        setEditError('Please select a valid product');
        setEditLoading(false);
        return;
      }
      // Update in DB
      const { error } = await supabase
        .from('reel')
        .update({ caption: editCaption, product_id: editProduct || null })
        .eq('id', editReel.id);
      if (error) {
        setEditError('Update failed: ' + error.message);
        setEditLoading(false);
        return;
      }
      // Update in UI
      setReels(reels => reels.map(r => r.id === editReel.id ? { ...r, caption: editCaption, product_id: editProduct || null } : r));
      setEditModalOpen(false);
      setEditLoading(false);
      setEditReel(null);
      setEditCaption('');
      setEditProduct('');
    };
  // Fetch seller's products for dropdown
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

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
  };

  // Handle upload submit
  const handleUpload = async (e: FormEvent) => {
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
    // Optional: If product is selected but not valid, error
    if (selectedProduct && !products.find(p => p.id === selectedProduct)) {
      setUploadError('Please select a valid product');
      return;
    }
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('videos')
        .upload(fileName, uploadFile, { upsert: false, contentType: uploadFile.type });
      if (storageError) {
        setUploadError('Upload failed: ' + storageError.message);
        setUploading(false);
        return;
      }
      // Get public URL
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
      // Refresh reels
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
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setReels(data);
      setLoading(false);
    } catch (err: any) {
      setUploadError('Unexpected error: ' + err.message);
      setUploading(false);
    }
  };

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
    // Find the reel to get the video_url
    const reel = reels.find(r => r.id === reelId);
    let filePath = '';
    if (reel?.video_url) {
      try {
        // Use URL API for robust extraction
        const url = new URL(reel.video_url);
        // Find the part after /object/public/videos/
        const match = url.pathname.match(/\/object\/public\/videos\/(.+)$/);
        if (match && match[1]) filePath = decodeURIComponent(match[1]);
      } catch (e) {
        // fallback to old split if URL fails
        const urlParts = reel.video_url.split('/videos/');
        if (urlParts.length === 2) filePath = urlParts[1];
      }
    }
    // Delete from DB first
    const { error } = await supabase
      .from('reel')
      .delete()
      .eq('id', reelId);
    if (error) {
      alert(t('reels.delete') + ' ' + t('common.error'));
      return;
    }
    setReels(reels => reels.filter(r => r.id !== reelId));
    // Delete from bucket if filePath found
    if (filePath) {
      await supabase.storage.from('videos').remove([filePath]);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)] flex flex-col items-center py-8">

      {/* Heading and Upload Button Row */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)]">{t('reels.yourReels')}</h1>
        <button
          className="group relative px-7 py-3 rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold text-lg shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
          onClick={() => setShowUploadModal(true)}
        >
          <span className="inline-block align-middle mr-2">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          Upload New Reel
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-1 bg-white opacity-0 group-hover:w-3/4 group-hover:opacity-60 transition-all duration-200 rounded-full"></span>
        </button>
      </div>

      {/* Modal Popup */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className="rounded-xl shadow-xl p-8 w-full max-w-md relative border border-[var(--border)]"
            style={{ background: 'var(--bg-2)', color: 'var(--text)', transition: 'background 0.2s, color 0.2s' }}
          >
            <button
              className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700"
              style={{ color: 'var(--muted)' }}
              onClick={() => { setShowUploadModal(false); setUploadError(null); setUploadFile(null); setCaption(''); setSelectedProduct(''); }}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Upload New Reel</h2>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-[var(--border)]"
                style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                disabled={uploading}
              />
              <input
                type="text"
                placeholder="Caption (optional)"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                className="border rounded px-3 py-2 border-[var(--border)] focus:outline-none focus:border-purple-500"
                style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                disabled={uploading}
              />
              <select
                className="border rounded px-3 py-2 border-[var(--border)] focus:outline-none focus:border-purple-500"
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
                className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded shadow disabled:opacity-60 transition-all"
                disabled={uploading || !uploadFile}
              >
                {uploading ? 'Uploading...' : 'Upload Reel'}
              </button>
              <div className="text-xs text-[var(--muted)]">Max file size: 10MB. Only video files allowed. You can link a product to this reel.</div>
            </form>
          </div>
        </div>
      )}

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
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
                    onClick={() => openEditModal(reel)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(reel.id)}
                  >
                    <Trash2 className="w-5 h-5" /> {t('reels.delete')}
                  </button>
                </div>
                      {/* Edit Reel Modal */}
                      {editModalOpen && editReel && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                          <div
                            className="rounded-xl shadow-xl p-8 w-full max-w-md relative border border-[var(--border)]"
                            style={{ background: 'var(--bg-2)', color: 'var(--text)', transition: 'background 0.2s, color 0.2s' }}
                          >
                            <button
                              className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700"
                              style={{ color: 'var(--muted)' }}
                              onClick={() => { setEditModalOpen(false); setEditError(null); setEditReel(null); }}
                              aria-label="Close"
                            >
                              ×
                            </button>
                            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>Edit Reel</h2>
                            <form onSubmit={handleEdit} className="flex flex-col gap-4">
                              <input
                                type="text"
                                placeholder="Caption"
                                value={editCaption}
                                onChange={e => setEditCaption(e.target.value)}
                                className="border rounded px-3 py-2 border-[var(--border)] focus:outline-none focus:border-purple-500"
                                style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                                disabled={editLoading}
                              />
                              <select
                                className="border rounded px-3 py-2 border-[var(--border)] focus:outline-none focus:border-purple-500"
                                style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
                                value={editProduct}
                                onChange={e => setEditProduct(e.target.value)}
                                disabled={editLoading || products.length === 0}
                              >
                                <option value="">No Product (Just a Reel)</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                              </select>
                              {editError && <div className="text-red-600 text-sm">{editError}</div>}
                              <button
                                type="submit"
                                className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded shadow disabled:opacity-60 transition-all"
                                disabled={editLoading}
                              >
                                {editLoading ? 'Saving...' : 'Save Changes'}
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
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
