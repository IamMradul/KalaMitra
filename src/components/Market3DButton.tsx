import React, { useMemo, useState } from 'react';
import MarketplaceStalls3D, { SellerGroup } from './MarketplaceStalls3D';
import { Product } from '../types/product';

interface Market3DButtonProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
  onViewDetails: (productId: string) => void;
}

export default function Market3DButton({ products, onAddToCart, onViewDetails }: Market3DButtonProps) {
  const [open, setOpen] = useState(false);

  // Group products by a seller key. Adjust mapping to your actual data.
  const sellers: SellerGroup[] = useMemo(() => {
    console.log('Market3DButton: Received products:', products);
    const map = new Map<string, { name: string; items: Product[] }>();
    products.forEach((p, idx) => {
      const key = `seller-${(idx % 6) + 1}`;
      const name = [
        'Kalpana Crafts',
        'Banarasi Looms',
        'Kutch Artisans',
        'Channapatna Toys',
        'Warli Collective',
        'Assam Cane Works',
      ][idx % 6];
      const current = map.get(key) ?? { name, items: [] };
      current.items.push(p);
      map.set(key, current);
    });
    const result = Array.from(map.entries()).map(([sellerId, info]) => ({
      sellerId,
      sellerName: info.name,
      products: info.items,
    }));
    console.log('Market3DButton: Created sellers:', result);
    return result;
  }, [products]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 shadow"
      >
        View 3D Bazaar
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


