import React from 'react';
import { Share2 } from 'lucide-react';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  getShareTitle: () => string;
  t: (k: string) => string;
  handleCopyLink: () => void | Promise<void>;
  handleNativeShare: () => void | Promise<void>;
  handleShareWhatsApp: () => void;
  handleShareTwitter: () => void;
  handleShareFacebook: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ open, onClose, shareUrl, getShareTitle, t, handleCopyLink, handleNativeShare, handleShareWhatsApp, handleShareTwitter, handleShareFacebook }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" // Overlay: theme-aware
      onClick={onClose}
    >
      <div
        className="card-glass p-4 md:p-6 max-w-md w-full animate-slide-in-up rounded-3xl shadow-2xl border border-[var(--border)] bg-[var(--bg-modal),_theme(colors.white/80)] dark:bg-neutral-900/90" // Card: theme-aware and fallback
        style={{ backgroundColor: 'var(--bg-modal,rgba(255,255,255,0.85))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl font-bold text-[var(--text)] flex items-center">
            <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2 text-[var(--heritage-gold)]" />
            {t('profile.share')} {getShareTitle()}
          </h3>
          <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--heritage-red)] transition-colors text-lg md:text-xl p-1 rounded-full hover:bg-[var(--bg-2)]">✕</button>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-[var(--bg-2)] rounded-lg border border-[var(--border),_theme(colors.gray.200)]">
            <p className="text-sm text-[var(--muted)] mb-2">{t('profile.profileLink')}:</p>
            <p className="text-sm text-[var(--text)] break-all">{shareUrl}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleCopyLink} className="btn-indian-primary flex-1 py-2 rounded-lg">{t('profile.copyLink')}</button>
            <button type="button" onClick={handleNativeShare} className="btn-indian-secondary flex-1 py-2 rounded-lg">{t('profile.share')}</button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button onClick={handleShareWhatsApp} className="px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 font-semibold hover:bg-[#25D366]/20">{t('profile.whatsapp')}</button>
            <button onClick={handleShareTwitter} className="px-3 py-2 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/30 font-semibold hover:bg-[#1DA1F2]/20">{t('profile.twitter')}</button>
            <button onClick={handleShareFacebook} className="px-3 py-2 rounded-xl bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 font-semibold hover:bg-[#1877F2]/20">{t('profile.facebook')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
