import React, { useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Shapes } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { SellerGroup } from './MarketplaceStalls3D';
const MarketplaceStalls3D = dynamic(() => import('./MarketplaceStalls3D'), { ssr: false });
import { Product } from '../types/product';

// Extend Product type to include seller_id if not present
type ProductWithSeller = Product & {
  seller_id: string;
  sellerName?: string;
  seller?: { name?: string } | null;
};

interface Market3DButtonProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
  onViewDetails: (productId: string) => void;
}

export default function Market3DButton({ products, onAddToCart, onViewDetails }: Market3DButtonProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [bazaarProducts, setBazaarProducts] = useState<Product[]>(products);
  const [loadingBazaar, setLoadingBazaar] = useState(false);

  const loadBazaarProducts = async () => {
    setLoadingBazaar(true);
    try {
      const lang = i18n?.language || 'en';
      // Independent paginated fetch: not tied to marketplace filters/pagination.
      const pageSize = 50;
      let page = 1;
      let totalPages = 1;
      const aggregated: Product[] = [];

      do {
        const res = await fetch(
          `/api/marketplace/bazaar?page=${page}&pageSize=${pageSize}&lang=${encodeURIComponent(lang)}`
        );
        if (!res.ok) throw new Error('Failed to fetch bazaar products');
        const json = await res.json();
        const pageItems = Array.isArray(json?.products) ? json.products : [];
        aggregated.push(...pageItems);
        totalPages = Number.isFinite(json?.totalPages) ? Number(json.totalPages) : page;
        page += 1;
      } while (page <= totalPages);

      const deduped = Array.from(
        new Map(aggregated.map((p: Product) => [p.id, p])).values()
      );
      setBazaarProducts(deduped);
    } catch {
      // Keep existing list as fallback
      setBazaarProducts(products);
    } finally {
      setLoadingBazaar(false);
    }
  };

  // Group products by a seller key. Adjust mapping to your actual data.
  const sellers: SellerGroup[] = useMemo(() => {
    // Group products by sellerId
    const map = new Map<string, { sellerName: string; items: ProductWithSeller[] }>();
    (bazaarProducts as ProductWithSeller[]).forEach((p, idx) => {
      const sellerId = p.seller_id || `unknown-seller-${idx}`;
      const sellerName = p.sellerName || p.seller?.name || sellerId;
      const current: { sellerName: string; items: ProductWithSeller[] } =
        map.get(sellerId) ?? { sellerName, items: [] };
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
  }, [bazaarProducts]);

  return (
    <>
      <button
        id="joyride-3d-bazaar-btn"
        type="button"
        onClick={async () => {
          await loadBazaarProducts();
          setOpen(true);
        }}
        disabled={loadingBazaar}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
        style={{ minWidth: 180 }}
      >
        <Shapes className="w-5 h-5 text-white drop-shadow" />
        {loadingBazaar ? (t('common.loading') || 'Loading...') : t('home.explore3dBazaar')}
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


