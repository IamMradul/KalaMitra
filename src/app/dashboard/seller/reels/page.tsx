'use client';
import { useEffect, useState } from 'react';

type Reel = {
  id: number;
  user_id: string;
  product_id?: string;
  video_url: string;
  caption?: string;
  likes?: number;
  created_at?: string;
  updated_at?: string;
};
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trash2, Video } from 'lucide-react';

import { useTranslation } from 'react-i18next';

export default function SellerReelsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

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
              <div className="w-full aspect-[9/16] bg-black flex items-center justify-center">
                <video src={reel.video_url} autoPlay loop className="w-full h-full object-cover" />
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
