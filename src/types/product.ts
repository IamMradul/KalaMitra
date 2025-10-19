export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string;
  category: 'pottery' | 'textile' | 'basket' | 'decoration';
  title?: string;
  seller?: { name: string };
  isCollaborative?: boolean;
  collaborators?: { id: string; name: string }[];
  product_story?: string | null;
}

export interface StallProps {
  sellerId: string;
  sellerName: string;
  products: Product[];
  onAddToCart: (productId: string) => void;
  onViewDetails: (productId: string) => void;
}


