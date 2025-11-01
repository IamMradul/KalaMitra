import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StallCustomizationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: StallCustomizationSettings) => void;
  initialSettings?: StallCustomizationSettings;
  loading?: boolean;
  products: { id: string; title: string }[];
}

export interface StallCustomizationSettings {
  stall_theme: string;
  welcome_message: string;
  decor: Record<string, string | number | boolean | null>;
  featured_product_ids: string[];
}

const themes = [
  { value: 'classic', label: 'Classic', gradient: 'from-yellow-400 via-orange-400 to-pink-500' },
  { value: 'modern', label: 'Modern', gradient: 'from-blue-400 via-cyan-400 to-teal-500' },
  { value: 'festive', label: 'Festive', gradient: 'from-red-400 via-yellow-300 to-green-400' },
];

export default function StallCustomizationModal({ open, onClose, onSave, initialSettings, loading, products }: StallCustomizationModalProps) {
  const { t, i18n } = useTranslation();
  const [stallTheme, setStallTheme] = useState(initialSettings?.stall_theme || 'classic');
  const [welcomeMessage, setWelcomeMessage] = useState(initialSettings?.welcome_message || '');
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>(initialSettings?.featured_product_ids || []);
  const [productLimitError, setProductLimitError] = useState<string | null>(null);

  // Reset state when initialSettings change (e.g., after fetch)
  React.useEffect(() => {
    setStallTheme(initialSettings?.stall_theme || 'classic');
    setWelcomeMessage(initialSettings?.welcome_message || '');
    setFeaturedProductIds(initialSettings?.featured_product_ids || []);
  }, [initialSettings, open]);


  const handleProductToggle = (id: string) => {
    setProductLimitError(null);
    setFeaturedProductIds((prev) => {
      if (prev.includes(id)) {
        // Remove
        return prev.filter(pid => pid !== id);
      } else {
        if (prev.length >= 4) {
          setProductLimitError('You can select up to 4 featured products only.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleSave = () => {
    onSave({
      stall_theme: stallTheme,
      welcome_message: welcomeMessage,
      decor: {}, // placeholder
      featured_product_ids: featuredProductIds,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-lg bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-yellow-400/30 p-0 overflow-hidden"
            initial={{ scale: 0.95, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 dark:from-yellow-700 dark:via-orange-700 dark:to-pink-700">
              <div className="flex items-center gap-3">
                <Palette className="w-7 h-7 text-white drop-shadow-lg" />
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">{t('stallCustomizationModal.title')}</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-7 min-h-[320px] flex flex-col justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <div className="w-12 h-12 border-4 border-yellow-200 border-t-pink-400 rounded-full animate-spin mb-4" />
                  <div className="text-yellow-700 dark:text-yellow-200 font-semibold text-lg">{t('stallCustomizationModal.loading')}</div>
                </div>
              ) : (
                <>
                  {/* Theme selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-800 dark:text-yellow-100">{t('stallCustomizationModal.themeLabel')}</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className={`flex-1 py-3 rounded-xl font-bold text-lg shadow-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-gradient-to-r ${themes[0].gradient} ${stallTheme === themes[0].value ? 'ring-4 ring-yellow-300 scale-105' : 'opacity-80 hover:scale-105'}`}
                        onClick={() => setStallTheme(themes[0].value)}
                      >
                        {t('stallCustomizationModal.themeClassic')}
                      </button>
                      <button
                        type="button"
                        className={`flex-1 py-3 rounded-xl font-bold text-lg shadow-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-gradient-to-r ${themes[1].gradient} ${stallTheme === themes[1].value ? 'ring-4 ring-yellow-300 scale-105' : 'opacity-80 hover:scale-105'}`}
                        onClick={() => setStallTheme(themes[1].value)}
                      >
                        {t('stallCustomizationModal.themeModern')}
                      </button>
                      <button
                        type="button"
                        className={`flex-1 py-3 rounded-xl font-bold text-lg shadow-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-gradient-to-r ${themes[2].gradient} ${stallTheme === themes[2].value ? 'ring-4 ring-yellow-300 scale-105' : 'opacity-80 hover:scale-105'}`}
                        onClick={() => setStallTheme(themes[2].value)}
                      >
                        {t('stallCustomizationModal.themeFestive')}
                      </button>
                    </div>
                  </div>

                  {/* Welcome message */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-800 dark:text-yellow-100">{t('stallCustomizationModal.welcomeLabel')}</label>
                    <textarea
                      className="w-full rounded-lg border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-[#23233b] text-gray-900 dark:text-yellow-100 p-3 text-base focus:ring-2 focus:ring-yellow-300 transition-all"
                      rows={2}
                      value={welcomeMessage}
                      onChange={e => setWelcomeMessage(e.target.value)}
                      placeholder={t('stallCustomizationModal.welcomePlaceholder')}
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      {t('stallCustomizationModal.welcomeNarrationHint')}
                    </div>
                  </div>

                  {/* Featured products */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-800 dark:text-yellow-100">{t('stallCustomizationModal.featuredLabel')}</label>
                    <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                      {products.map((p) => (
                        <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${featuredProductIds.includes(p.id) ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#23233b] hover:border-yellow-300'}`}>
                          <input
                            type="checkbox"
                            checked={featuredProductIds.includes(p.id)}
                            onChange={() => handleProductToggle(p.id)}
                            className="accent-yellow-500 w-4 h-4"
                            disabled={!featuredProductIds.includes(p.id) && featuredProductIds.length >= 8}
                          />
                          <span className="text-gray-900 dark:text-yellow-100 text-sm font-medium truncate">{p.title}</span>
                        </label>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{t('stallCustomizationModal.featuredLimitHint')}</div>
                    {productLimitError && (
                      <div className="text-xs text-red-500 mt-1 font-semibold">{t('stallCustomizationModal.featuredLimitError')}</div>
                    )}
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center px-5 py-3 text-base font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-white rounded-lg hover:from-yellow-500 hover:via-orange-500 hover:to-pink-600 shadow-lg transition-all duration-200 mt-2"
                  >
                    <Sparkles className="w-5 h-5 mr-2 animate-bounce" />
                    {t('stallCustomizationModal.saveButton')}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
