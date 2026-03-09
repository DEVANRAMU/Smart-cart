export interface UserProfile {
  uid: string;
  name: string;
  mobile: string;
  createdAt: string;
  isNewUser?: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface Cart {
  cartId: string;
  currentUserId: string;
  items: CartItem[];
  totalCost: number;
  location?: { lat: number; lng: number };
  syncedCartIds: string[];
  status: 'active' | 'completed';
}

export interface Offer {
  type: 'bulk' | 'discount';
  description: string;
  minQty: number;
  discountedPrice: number;
  targetProductId?: string;
}

export interface Product {
  productId: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  offers?: Offer[];
  location: {
    aisle: string;
    shelf: string;
    lat: number;
    lng: number;
  };
}

export interface Order {
  orderId: string;
  userId: string;
  items: CartItem[];
  totalCost: number;
  timestamp: string;
  offersApplied: string[];
}
