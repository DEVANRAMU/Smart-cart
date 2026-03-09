import { db, auth } from './firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { Product } from './types';

const initialProducts: Product[] = [
  {
    productId: 'PROD_ATTA_1KG',
    name: 'Ashirvad Atta 1kg',
    price: 100,
    stock: 50,
    category: 'Grains',
    offers: [
      {
        type: 'bulk',
        description: 'Buy 2kg pack for ₹195 and save ₹5!',
        minQty: 2,
        discountedPrice: 195,
        targetProductId: 'PROD_ATTA_2KG'
      }
    ],
    location: { aisle: '4', shelf: 'A', lat: 12.9716, lng: 77.5946 }
  },
  {
    productId: 'PROD_ATTA_2KG',
    name: 'Ashirvad Atta 2kg',
    price: 195,
    stock: 30,
    category: 'Grains',
    location: { aisle: '4', shelf: 'A', lat: 12.9716, lng: 77.5946 }
  },
  {
    productId: 'PROD_MILK_500ML',
    name: 'Fresh Milk 500ml',
    price: 30,
    stock: 100,
    category: 'Dairy',
    location: { aisle: '1', shelf: 'C', lat: 12.9717, lng: 77.5947 }
  },
  {
    productId: 'PROD_BREAD',
    name: 'Whole Wheat Bread',
    price: 45,
    stock: 40,
    category: 'Bakery',
    location: { aisle: '2', shelf: 'B', lat: 12.9718, lng: 77.5948 }
  },
  {
    productId: 'PROD_EGGS_6',
    name: 'Farm Fresh Eggs (6pcs)',
    price: 72,
    stock: 60,
    category: 'Dairy',
    location: { aisle: '1', shelf: 'D', lat: 12.9719, lng: 77.5949 }
  }
];

export async function seedProducts() {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    if (snapshot.empty) {
      console.log('Seeding products for admin:', auth.currentUser?.email);
      for (const product of initialProducts) {
        await setDoc(doc(db, 'products', product.productId), product);
      }
      console.log('Products seeded successfully!');
    } else {
      console.log('Products already exist, skipping seed.');
    }
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.log('Seeding skipped: User does not have admin permissions.');
    } else {
      console.error('Seeding failed with error:', error);
    }
  }
}
