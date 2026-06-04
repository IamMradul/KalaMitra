import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
}

const DonateModal: React.FC<DonateModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<{
    donor_name: string;
    donor_email: string;
    donor_phone: string;
    item_name: string;
    item_description: string;
    item_category: string;
    images: File[];
    pickup_address: string;
    preferred_contact: string;
  }>({
    donor_name: '',
    donor_email: '',
    donor_phone: '',
    item_name: '',
    item_description: '',
    item_category: '',
    images: [],
    pickup_address: '',
    preferred_contact: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, images: e.target.files ? Array.from(e.target.files) : [] });
  };

  const fieldClassName =
    'w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)] shadow-sm outline-none transition-all duration-200 focus:border-[var(--heritage-gold)] focus:ring-4 focus:ring-[var(--heritage-gold)]/15';

  const labelClassName = 'block text-sm font-semibold text-[var(--text)] mb-2';
  const sectionClassName = 'rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]/70 p-4 sm:p-5';
  const sectionHeadingClassName = 'text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);
    try {
      const imageUrls: string[] = [];
      if (form.images.length > 0) {
        // Upload each image to Supabase Storage
        for (const file of form.images) {
          const fileExt = file.name.split('.').pop();
          const filePath = `donations/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
          if (uploadError) throw new Error(uploadError.message);
          const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) imageUrls.push(publicUrlData.publicUrl);
        }
      }
      // Insert donation record
      const { error: insertError } = await supabase.from('donations').insert([
        {
          donor_name: form.donor_name,
          donor_email: form.donor_email,
          donor_phone: form.donor_phone,
          item_description: form.item_description,
          item_category: form.item_category,
          image_urls: imageUrls,
          pickup_address: form.pickup_address,
          preferred_contact: form.preferred_contact,
          status: 'new',
        },
      ]);
      if (insertError) throw new Error(insertError.message);
      setSuccess(true);
      setForm({
        donor_name: '',
        donor_email: '',
        donor_phone: '',
        item_name: '',
        item_description: '',
        item_category: '',
        images: [],
        pickup_address: '',
        preferred_contact: '',
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj.message || t('donate.submissionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/55 backdrop-blur-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-52 w-52 -translate-x-1/2 rounded-full bg-[var(--heritage-gold)]/12 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-[var(--heritage-red)]/10 blur-3xl" />
      </div>

      <div className="relative my-auto flex w-full max-w-xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text)] shadow-[0_28px_70px_rgba(0,0,0,0.3)] sm:max-h-[calc(100vh-3rem)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--heritage-gold)] via-[var(--heritage-red)] to-[var(--heritage-gold)]" />

        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-2)]/85 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white shadow-lg shadow-[rgba(176,141,85,0.25)]">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {t('donate.badge')}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">
                {t('donate.modalTitle')}
              </h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                {t('donate.description')}
              </p>
            </div>
          </div>

          <button
            className="rounded-full p-2 text-[var(--muted)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text)]"
            onClick={onClose}
            aria-label={t('donate.closeModal')}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center sm:py-10">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="text-2xl font-bold text-[var(--text)]">{t('donate.successMsg')}</div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
              {t('donate.successDescription')}
            </p>
            <button
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--heritage-brown)] px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[var(--heritage-gold)]/20"
              onClick={onClose}
            >
              {t('donate.closeModal')}
            </button>
          </div>
        ) : (
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            <div className={sectionClassName}>
              <div className={`${sectionHeadingClassName} mb-4`}>{t('donate.detailsSectionTitle')}</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>{t('donate.itemName')}*</label>
                  <input
                    type="text"
                    name="item_name"
                    value={form.item_name}
                    onChange={handleChange}
                    required
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>{t('donate.itemCategory')}*</label>
                  <input
                    type="text"
                    name="item_category"
                    value={form.item_category}
                    onChange={handleChange}
                    required
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClassName}>{t('donate.itemDescription')}*</label>
                <textarea
                  name="item_description"
                  value={form.item_description}
                  onChange={handleChange}
                  required
                  className={`${fieldClassName} min-h-[110px] resize-y`}
                />
              </div>
            </div>

            <div className={sectionClassName}>
              <div className={`${sectionHeadingClassName} mb-4`}>{t('donate.contactSectionTitle')}</div>
              <div>
                <label className={labelClassName}>{t('donate.images')}</label>
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-1)] px-4 py-4 transition-colors hover:border-[var(--heritage-gold)] hover:bg-[var(--bg-2)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--heritage-gold)]/10 text-[var(--heritage-gold)]">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{t('donate.uploadTitle')}</div>
                      <div className="text-xs text-[var(--muted)]">{t('donate.uploadHint')}</div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-[var(--muted)] sm:text-sm">
                    {form.images.length > 0
                      ? t('donate.selectedFiles', { count: form.images.length })
                      : t('donate.noFileChosen')}
                  </div>
                  <input
                    type="file"
                    name="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="mt-4">
                <label className={labelClassName}>{t('donate.pickupAddress')}*</label>
                <input
                  type="text"
                  name="pickup_address"
                  value={form.pickup_address}
                  onChange={handleChange}
                  required
                  className={fieldClassName}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>{t('donate.donorName')}*</label>
                  <input
                    type="text"
                    name="donor_name"
                    value={form.donor_name}
                    onChange={handleChange}
                    required
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>{t('donate.donorEmail')}*</label>
                  <input
                    type="email"
                    name="donor_email"
                    value={form.donor_email}
                    onChange={handleChange}
                    required
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>{t('donate.donorPhone')}*</label>
                  <input
                    type="text"
                    name="donor_phone"
                    value={form.donor_phone}
                    onChange={handleChange}
                    required
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>{t('donate.preferredContact')}*</label>
                  <input
                    type="text"
                    name="preferred_contact"
                    value={form.preferred_contact}
                    onChange={handleChange}
                    required
                    className={fieldClassName}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-[var(--heritage-brown)] px-6 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-[var(--heritage-gold)]/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? t('donate.submitting') : t('donate.submitBtn')}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

export default DonateModal;
