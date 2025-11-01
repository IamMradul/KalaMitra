import React, { useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Shapes } from 'lucide-react';
import MarketplaceStalls3D, { SellerGroup } from './MarketplaceStalls3D';
import { Product } from '../types/product';

// Extend Product type to include seller_id if not present
type ProductWithSeller = Product & { seller_id: string; sellerName?: string };

interface Market3DButtonProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
  onViewDetails: (productId: string) => void;
}

export default function Market3DButton({ products, onAddToCart, onViewDetails }: Market3DButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Group products by a seller key. Adjust mapping to your actual data.
  const sellers: SellerGroup[] = useMemo(() => {
    // Group products by sellerId
    const map = new Map<string, { sellerName: string; items: ProductWithSeller[] }>();
    (products as ProductWithSeller[]).forEach((p) => {
      const sellerId = p.seller_id;
      const sellerName = p.sellerName || sellerId;
      const current = map.get(sellerId) ?? { sellerName, items: [] };
      current.items.push(p);
      map.set(sellerId, current);
    });
  const result = Array.from(map.entries()).map(([sellerId, info]) => ({
      sellerId,
      sellerName: info.sellerName,
      products: info.items.map(p => ({ ...p, seller_id: sellerId, sellerName: info.sellerName })),
    }));

    // Enforce minimum 6 stalls
    const MIN_STALLS = 6;
    if (result.length === 0) {
      // No sellers/products, return empty array
      return [];
    }
    if (result.length >= MIN_STALLS) {
      // Each seller gets one stall, even if they have only 1 product
      return result;
    } else {
      // Guarantee every seller gets at least one stall
      const stalls: SellerGroup[] = [...result];
      // Duplicate stalls (round-robin) until total stalls = 6
      let idx = 0;
      while (stalls.length < MIN_STALLS) {
        const sellerToDuplicate = result[idx % result.length];
        if (!sellerToDuplicate) break; // Safety guard
        stalls.push({
          sellerId: sellerToDuplicate.sellerId,
          sellerName: sellerToDuplicate.sellerName,
          products: sellerToDuplicate.products.map(p => ({ ...p, seller_id: sellerToDuplicate.sellerId, sellerName: sellerToDuplicate.sellerName })),
        });
        idx++;
      }
      return stalls;
    }
  }, [products]);

  return (
    <>
      <button
        id="joyride-3d-bazaar-btn"
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
        style={{ minWidth: 180 }}
      >
        <Shapes className="w-5 h-5 text-white drop-shadow" />
        {t('home.explore3dBazaar')}
      </button>

      <MarketplaceStalls3D
        isOpen={open}
        onClose={() => setOpen(false)}
        sellers={sellers}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
      />
    </>
  );
}


