import React, { useEffect } from 'react';
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
}

export default function MarketplaceStalls3D({ isOpen, onClose, sellers, onAddToCart, onViewDetails }: MarketplaceStalls3DProps) {
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
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col isolation-auto">
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <h2 className="text-lg font-semibold text-gray-900">Handmade Bazaar - 3D Stalls</h2>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-[#0b0d12] flex items-center justify-center">
        <MarketplaceNavigator3D
          sellers={sellers.map(s => ({ sellerId: s.sellerId, products: s.products }))}
          onProductClick={(id) => onViewDetails(id)}
        />
      </div>
    </div>
  );
}


