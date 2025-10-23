export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string;
  category: 'pottery' | 'textile' | 'basket' | 'decoration';
}

export interface StallProps {
  sellerId: string;
  sellerName: string;
  products: Product[];
  onAddToCart: (productId: string) => void;
  onViewDetails: (productId: string) => void;
}


