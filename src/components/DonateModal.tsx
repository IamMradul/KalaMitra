import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-fade-in border-2 border-green-500/30 dark:border-emerald-600/40">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
          onClick={onClose}
          aria-label={t('donate.closeModal')}
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-green-300">
          {t('donate.modalTitle')}
        </h2>
        {success ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-green-600 dark:text-emerald-400 text-2xl font-bold mb-4">{t('donate.successMsg')}</div>
            <button
              className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 dark:from-emerald-500 dark:to-green-400 text-white font-semibold text-lg shadow-lg hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-emerald-400"
              onClick={onClose}
            >
              {t('donate.closeModal')}
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* ...existing form fields... */}
            <div>
              <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.itemName')}*</label>
              <input
                type="text"
                name="item_name"
                value={form.item_name}
                onChange={handleChange}
                required
                className="input input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.itemCategory')}*</label>
              <input
                type="text"
                name="item_category"
                value={form.item_category}
                onChange={handleChange}
                required
                className="input input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.itemDescription')}*</label>
              <textarea
                name="item_description"
                value={form.item_description}
                onChange={handleChange}
                required
                className="input input-bordered w-full min-h-[80px] bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.images')}</label>
              <input
                type="file"
                name="images"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="file-input file-input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.pickupAddress')}*</label>
              <input
                type="text"
                name="pickup_address"
                value={form.pickup_address}
                onChange={handleChange}
                required
                className="input input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.donorName')}*</label>
                <input
                  type="text"
                  name="donor_name"
                  value={form.donor_name}
                  onChange={handleChange}
                  required
                  className="input input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.donorEmail')}*</label>
                <input
                  type="email"
                  name="donor_email"
                  value={form.donor_email}
                  onChange={handleChange}
                  required
                  className="input input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.donorPhone')}*</label>
                <input
                  type="text"
                  name="donor_phone"
                  value={form.donor_phone}
                  onChange={handleChange}
                  required
                  className="input input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">{t('donate.preferredContact')}*</label>
                <input
                  type="text"
                  name="preferred_contact"
                  value={form.preferred_contact}
                  onChange={handleChange}
                  required
                  className="input input-bordered w-full bg-white dark:bg-gray-800 border-green-200 dark:border-emerald-700 focus:border-green-500 focus:ring-green-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            {error && <div className="text-red-500 text-sm text-center font-medium">{error}</div>}
            <button
              type="submit"
              className="btn-primary w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-emerald-500 dark:to-green-400 text-white rounded-full py-3 font-semibold text-lg shadow-lg hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-emerald-400"
              disabled={submitting}
            >
              {submitting ? t('donate.submitting') : t('donate.submitBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DonateModal;
