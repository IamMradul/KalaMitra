import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Volume2, StopCircle } from 'lucide-react';
import type { Product } from '@/app/marketplace/page';
import { useTranslation } from 'react-i18next';

interface ProductCardProps {
  product: Product;
  displayProduct: Product;
  translatedSellerNames: Record<string, string>;
  narratingId: string | null;
  wishlistIds: Set<string>;
  onAddToCart: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  onNarrate: (product: Product) => void;
  onStopNarrate: () => void;
  onAR: (imageUrl?: string, productType?: 'vertical' | 'horizontal') => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  displayProduct,
  translatedSellerNames,
  narratingId,
  wishlistIds,
  onAddToCart,
  onToggleWishlist,
  onNarrate,
  onStopNarrate,
  onAR,
}) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105 flex flex-col h-full`}
    >
      <Link href={`/product/${product.id}`}>
        <div className="relative h-48 bg-[var(--bg-3)] flex items-center justify-center overflow-hidden">
          {/* Badges: Collab + Virtual, visually balanced */}
          {product.isCollaborative && product.is_virtual ? (
            <>
              <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-cyan-400 to-teal-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                🧩 {t('marketplace.virtualBadge')}
              </div>
              <div className="absolute top-10 left-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                🤝 {t('marketplace.collabBadge')}
              </div>
            </>
          ) : product.isCollaborative ? (
            <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              🤝 {t('marketplace.collabBadge')}
            </div>
          ) : product.is_virtual ? (
            <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-cyan-400 to-teal-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
              🧩 {t('marketplace.virtualBadge')}
            </div>
          ) : null}
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={displayProduct?.title || product.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover hover:scale-110 transition-transform duration-300"
              priority={false}
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center ${product.isCollaborative
              ? 'from-yellow-100 to-orange-100'
              : 'from-orange-100 to-red-100'
              }`}>
              <span className={`text-4xl ${product.isCollaborative ? 'text-yellow-500' : 'text-orange-400'
                }`}>🎨</span>
            </div>
          )}
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-grow">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-[var(--text)] mb-2 hover:text-orange-600 transition-colors line-clamp-1">
            {displayProduct?.title || product.title}
          </h3>
        </Link>
        <p className="text-sm text-[var(--muted)] mb-2 line-clamp-1">{displayProduct?.category || product.category}</p>
        {/* Show collaborators or single seller */}
        {product.isCollaborative && product.collaborators && product.collaborators.length > 0 ? (
          <div className="text-xs mb-3 p-3 rounded-md border border-yellow-200/90 dark:border-yellow-700/30 shadow-sm">
            <p className="font-medium mb-1 text-yellow-800 dark:text-gray-300">🤝 Collaboration by:</p>
            <div className="space-y-0.5">
              {product.collaborators.map((collab) => (
                <p key={collab.id} className="text-yellow-800 dark:text-yellow-400 font-semibold truncate">
                  • {translatedSellerNames[collab.name] || collab.name}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] mb-3 line-clamp-1">
            {(() => {
              const sellerName = product.seller?.name || '';
              const translatedName = translatedSellerNames[sellerName] || sellerName;
              return t('product.byAuthor', {
                name: translatedName || t('product.unknownArtisan'),
              });
            })()}
          </p>
        )}
        {/* Price and Actions - Anchored to bottom */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">₹{product.price}</p>
          <div className="flex space-x-2">
            {/* Voice narration button */}
            {narratingId === product.id ? (
              <button
                id="joyride-speaker-btn"
                onClick={onStopNarrate}
                className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
                title={t('marketplace.stopNarration')}
              >
                <StopCircle className="w-4 h-4 animate-pulse" />
              </button>
            ) : (
              <button
                id="joyride-speaker-btn"
                onClick={() => onNarrate(product)}
                className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
                title={t('marketplace.listenNarration')}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <button
              id="joyride-add-to-cart-btn"
              onClick={() => onAddToCart(product.id)}
              className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
              title={t('product.addToCart')}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
            <button
              id="joyride-wishlist-btn"
              onClick={() => onToggleWishlist(product.id)}
              className={`p-2 rounded-full transition-colors ${wishlistIds.has(product.id)
                ? 'bg-red-50 text-red-500'
                : 'bg-[var(--bg-2)] text-[var(--muted)] hover:bg-[var(--bg-3)]'
                }`}
              title={wishlistIds.has(product.id) ? t('product.removeFromWishlist') : t('product.addToWishlist')}
            >
              <Heart className={`w-4 h-4 ${wishlistIds.has(product.id) ? 'fill-current' : ''}`} />
            </button>
            {/* AR Button */}
            <button
              id="joyride-ar-btn"
              onClick={() => onAR(product.image_url, (product.product_type as 'vertical' | 'horizontal' | undefined) || 'vertical')}
              className="group relative p-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full hover:from-green-200 hover:to-emerald-200 transition-all duration-200 shadow-sm hover:shadow-md"
              title={t('marketplace.viewInAR')}
            >
              <span role="img" aria-label="AR" className="text-lg">📱</span>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {t('marketplace.viewInAR')}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
