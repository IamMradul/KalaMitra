import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import ThreeDStall from './ThreeDStall';
import MarketplaceNavigator3D from './MarketplaceNavigator3D';
import { Product } from '../types/product';

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  products: Product[];
}

interface MarketplaceStalls3DProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: SellerGroup[];
  onAddToCart: (productId: string) => void;
  onViewDetails: (productId: string) => void;
  focusSellerId?: string;
}

export default function MarketplaceStalls3D({ isOpen, onClose, sellers, onAddToCart, onViewDetails, focusSellerId }: MarketplaceStalls3DProps) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-lg">
      <div className="relative w-full max-w-5xl mx-auto rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#181a20]/90 backdrop-blur-xl overflow-hidden flex flex-col" style={{ minHeight: 520 }}>
        {/* Gradient Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg tracking-wide">Handmade Bazaar – 3D Stalls</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/40 dark:bg-black/30 dark:hover:bg-black/50 text-white shadow transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 bg-white/60 dark:bg-[#181a20]/80 flex items-center justify-center" style={{ minHeight: 400 }}>
          <MarketplaceNavigator3D
            sellers={sellers.map(s => ({ sellerId: s.sellerId, products: s.products }))}
            onProductClick={(id) => onViewDetails(id)}
            focusSellerId={focusSellerId}
          />
        </div>
      </div>
    </div>
  );
}


