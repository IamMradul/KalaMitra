import React from 'react';
import { Product } from '../types/product';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (productId: string) => void;
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart }: ProductModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-[92%] max-w-xl rounded-lg shadow-xl overflow-hidden">
        <div className="flex">
          <div className="w-1/2 bg-gray-50 flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.name} className="max-h-64 object-contain rounded" />
          </div>
          <div className="w-1/2 p-6">
            <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
            <p className="mt-1 text-sm text-gray-500 capitalize">{product.category}</p>
            <p className="mt-3 text-gray-700 text-sm leading-relaxed">{product.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-emerald-700">₹{product.price.toFixed(2)}</span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => onAddToCart(product.id)}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


