import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  increment,
  arrayUnion,
  setDoc,
  addDoc
} from 'firebase/firestore';
import { UserProfile, Cart, Product, CartItem, Offer, Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Camera, 
  Search, 
  Navigation, 
  Layers, 
  X, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Tag,
  Info
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ShoppingProps {
  profile: UserProfile | null;
}

export default function Shopping({ profile }: ShoppingProps) {
  const [searchParams] = useSearchParams();
  const cartId = searchParams.get('cartId') || 'DEMO_TROLLEY_1';
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<{ product: Product; offer?: Offer } | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncId, setSyncId] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [navTarget, setNavTarget] = useState<Product | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const navigate = useNavigate();

  // Initialize Cart and Listen for Changes
  useEffect(() => {
    if (!profile) return;

    const cartRef = doc(db, 'carts', cartId);
    
    // Create cart if it doesn't exist (Demo purposes)
    const initCart = async () => {
      if (!auth.currentUser) return;
      const snap = await getDoc(cartRef);
      if (!snap.exists()) {
        await setDoc(cartRef, {
          cartId,
          currentUserId: auth.currentUser.uid,
          items: [],
          totalCost: 0,
          syncedCartIds: [],
          status: 'active',
          location: { lat: 12.9716, lng: 77.5946 } // Demo location
        });
      }
    };
    initCart();

    const unsubscribe = onSnapshot(cartRef, (doc) => {
      if (doc.exists()) {
        setCart(doc.data() as Cart);
      }
    });

    return () => unsubscribe();
  }, [cartId, profile]);

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(snap.docs.map(doc => doc.data() as Product));
    };
    fetchProducts();
  }, []);

  // Location Tracking
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition((pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        if (cart) {
          updateDoc(doc(db, 'carts', cartId), { location: newLoc });
        }
      });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [cartId, cart]);

  // Product Scanning Logic
  const startScanner = async () => {
    setIsScanning(true);
    setIsCameraReady(false);
    
    // Request permission explicitly to trigger prompt in iframe
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setIsCameraReady(true);
    } catch (err) {
      console.error("Camera permission denied:", err);
      alert("Please allow camera access to scan products.");
      setIsScanning(false);
      return;
    }

    setTimeout(() => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner("reader", { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        }, false);
      }
      
      scannerRef.current.render((decodedText) => {
        const product = products.find(p => p.productId === decodedText);
        if (product) {
          if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
          setIsScanning(false);
          checkOffersAndShowConfirm(product);
        }
      }, (err) => {});
    }, 500);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const checkOffersAndShowConfirm = (product: Product) => {
    // Check for bulk offers (e.g., 2kg vs 2x1kg)
    const bulkOffer = product.offers?.find(o => o.type === 'bulk');
    setShowConfirmModal({ product, offer: bulkOffer });
  };

  const addToCart = async (product: Product, quantity: number = 1) => {
    if (!cart) return;

    const existingItemIndex = cart.items.findIndex(i => i.productId === product.productId);
    let newItems = [...cart.items];
    
    if (existingItemIndex > -1) {
      newItems[existingItemIndex].quantity += quantity;
      newItems[existingItemIndex].totalPrice = newItems[existingItemIndex].quantity * product.price;
    } else {
      newItems.push({
        productId: product.productId,
        name: product.name,
        quantity,
        price: product.price,
        totalPrice: product.price * quantity
      });
    }

    const totalCost = newItems.reduce((acc, item) => acc + item.totalPrice, 0);

    await updateDoc(doc(db, 'carts', cartId), { 
      items: newItems,
      totalCost
    });

    // Real-time stock elimination
    await updateDoc(doc(db, 'products', product.productId), {
      stock: increment(-quantity)
    });

    setShowConfirmModal(null);
  };

  const updateQuantity = async (productId: string, delta: number) => {
    if (!cart) return;

    const newItems = cart.items.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          totalPrice: newQty * item.price
        };
      }
      return item;
    });

    const totalCost = newItems.reduce((acc, item) => acc + item.totalPrice, 0);

    await updateDoc(doc(db, 'carts', cartId), { 
      items: newItems,
      totalCost
    });

    // Update stock
    await updateDoc(doc(db, 'products', productId), {
      stock: increment(-delta)
    });
  };

  const removeItem = async (productId: string) => {
    if (!cart) return;

    const itemToRemove = cart.items.find(i => i.productId === productId);
    if (!itemToRemove) return;

    const newItems = cart.items.filter(item => item.productId !== productId);
    const totalCost = newItems.reduce((acc, item) => acc + item.totalPrice, 0);

    await updateDoc(doc(db, 'carts', cartId), { 
      items: newItems,
      totalCost
    });

    // Restore stock
    await updateDoc(doc(db, 'products', productId), {
      stock: increment(itemToRemove.quantity)
    });
  };

  const handleSync = async () => {
    if (!syncId || !cart) return;
    
    try {
      const otherCartRef = doc(db, 'carts', syncId);
      const otherCartSnap = await getDoc(otherCartRef);

      if (!otherCartSnap.exists()) {
        alert("Trolley not found. Please check the ID.");
        return;
      }

      const otherCart = otherCartSnap.data() as Cart;
      
      if (otherCart.status !== 'active') {
        alert("This trolley session is no longer active.");
        return;
      }

      // Merge items
      const mergedItems = [...cart.items];
      otherCart.items.forEach(otherItem => {
        const existingItemIndex = mergedItems.findIndex(i => i.productId === otherItem.productId);
        if (existingItemIndex > -1) {
          mergedItems[existingItemIndex].quantity += otherItem.quantity;
          mergedItems[existingItemIndex].totalPrice += otherItem.totalPrice;
        } else {
          mergedItems.push({ ...otherItem });
        }
      });

      const totalCost = mergedItems.reduce((acc, item) => acc + item.totalPrice, 0);

      // Update current cart
      await updateDoc(doc(db, 'carts', cartId), {
        items: mergedItems,
        totalCost,
        syncedCartIds: arrayUnion(syncId)
      });

      // Clear the other cart to prevent double billing
      await updateDoc(otherCartRef, {
        items: [],
        totalCost: 0,
        status: 'completed' // Mark as merged/completed
      });

      setShowSyncModal(false);
      setSyncId('');
      alert(`Successfully synced with Trolley ${syncId}! Items consolidated.`);
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync trolley. Please try again.");
    }
  };

  const handleCheckout = async () => {
    if (!cart || !profile) return;
    
    const order: Order = {
      orderId: `ORD_${Date.now()}`,
      userId: profile.uid,
      items: cart.items,
      totalCost: cart.totalCost,
      timestamp: new Date().toISOString(),
      offersApplied: [] // Logic to track applied offers
    };

    await addDoc(collection(db, 'orders'), order);
    await updateDoc(doc(db, 'carts', cartId), { status: 'completed', items: [], totalCost: 0 });
    navigate('/dashboard');
  };

  const searchProducts = (q: string) => {
    setSearchQuery(q);
    if (q.length > 2) {
      const results = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-neutral-50 pb-32">
      {/* Header */}
      <div className="p-6 bg-white border-b border-neutral-100 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Trolley: {cartId}</h1>
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <MapPin className="w-3 h-3" />
                {location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'Aisle 4, Section B'}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowSyncModal(true)}
            className="p-2 bg-neutral-100 rounded-xl text-neutral-600 hover:bg-neutral-200"
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input 
            type="text"
            placeholder="Search products or aisles..."
            className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={searchQuery}
            onChange={(e) => searchProducts(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-30">
              {searchResults.map(p => (
                <div 
                  key={p.productId}
                  className="p-4 hover:bg-neutral-50 flex items-center justify-between cursor-pointer border-b last:border-0"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setNavTarget(p);
                  }}
                >
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-neutral-400">Aisle {p.location.aisle} • ₹{p.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="p-6 space-y-4">
        {cart?.items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-neutral-300" />
            </div>
            <p className="text-neutral-400 font-medium">Your cart is empty</p>
            <button 
              onClick={startScanner}
              className="mt-4 text-emerald-600 font-bold flex items-center gap-2 mx-auto"
            >
              <Camera className="w-5 h-5" />
              Scan first item
            </button>
          </div>
        ) : (
          cart?.items.map((item, idx) => (
            <motion.div 
              key={idx}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{item.name}</h3>
                <p className="text-sm text-neutral-400">₹{item.price} per unit</p>
                
                {/* Offer Display in Cart */}
                {products.find(p => p.productId === item.productId)?.offers?.map((offer, oIdx) => (
                  <div key={oIdx} className="mt-1 flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md w-fit">
                    <Tag className="w-3 h-3" />
                    {offer.description}
                  </div>
                ))}

                <div className="flex items-center gap-3 mt-2">
                  <button 
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">₹{item.totalPrice}</p>
                <button 
                  onClick={() => removeItem(item.productId)}
                  className="text-red-400 p-1 mt-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Synced Carts Info */}
      {cart?.syncedCartIds.length! > 0 && (
        <div className="px-6 mb-4">
          <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-2 text-blue-600 text-xs font-bold">
            <Layers className="w-4 h-4" />
            Synced with {cart?.syncedCartIds.length} other trolleys
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 max-w-md mx-auto z-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Total Bill</p>
            <p className="text-3xl font-black text-neutral-900">₹{cart?.totalCost}</p>
          </div>
          <button 
            onClick={startScanner}
            className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 active:scale-95 transition-all"
          >
            <Camera className="w-8 h-8" />
          </button>
        </div>
        <button 
          onClick={handleCheckout}
          disabled={cart?.items.length === 0}
          className="w-full py-4 bg-neutral-900 text-white font-bold rounded-2xl hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          Checkout & Pay
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Scanner Overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <div className="p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">Scan Product</h2>
              <button onClick={stopScanner} className="p-2 bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {!isCameraReady ? (
                <div className="text-white text-center">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p>Initializing camera...</p>
                </div>
              ) : (
                <div id="reader" className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-500/30" />
              )}
            </div>
            <div className="p-12 text-center text-white/60">
              <p>Align the product barcode or QR code within the frame</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Add to Cart?</h2>
                <p className="text-neutral-500 mb-6">
                  Confirm adding <span className="font-bold text-neutral-900">{showConfirmModal.product.name}</span> to your purchase.
                </p>

                {showConfirmModal.offer && (
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-6 flex gap-3">
                    <Tag className="w-5 h-5 text-orange-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-orange-900">Smart Suggestion!</p>
                      <p className="text-xs text-orange-700">{showConfirmModal.offer.description}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowConfirmModal(null)}
                    className="flex-1 py-4 bg-neutral-100 text-neutral-600 font-bold rounded-2xl"
                  >
                    No
                  </button>
                  <button 
                    onClick={() => addToCart(showConfirmModal.product)}
                    className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100"
                  >
                    Yes, Add
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sync Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Sync Trolleys</h2>
                <button onClick={() => setShowSyncModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <p className="text-neutral-500 text-sm mb-6">Enter the ID of the other trolley to combine your bills.</p>
              <input 
                type="text"
                placeholder="Trolley ID (e.g. TROLLEY_123)"
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-emerald-500"
                value={syncId}
                onChange={(e) => setSyncId(e.target.value)}
              />
              <button 
                onClick={handleSync}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100"
              >
                Sync Now
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Map Modal */}
      <AnimatePresence>
        {navTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[32px] overflow-hidden"
            >
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Navigation className="w-6 h-6" />
                  <div>
                    <h2 className="font-bold">Navigating to {navTarget.name}</h2>
                    <p className="text-xs text-emerald-100">Aisle {navTarget.location.aisle}, Shelf {navTarget.location.shelf}</p>
                  </div>
                </div>
                <button onClick={() => setNavTarget(null)} className="p-2 bg-white/20 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Visual Map Representation */}
                <div className="relative aspect-square bg-neutral-50 rounded-2xl border border-neutral-100 p-4 grid grid-cols-5 gap-2">
                  {[...Array(25)].map((_, i) => {
                    const aisleNum = Math.floor(i / 5) + 1;
                    const isTargetAisle = aisleNum.toString() === navTarget.location.aisle;
                    const isUserAisle = aisleNum === 4; // Demo: user is always in aisle 4
                    
                    return (
                      <div 
                        key={i} 
                        className={`rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                          isTargetAisle ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105' : 
                          isUserAisle ? 'bg-blue-500 text-white' : 'bg-white border border-neutral-200 text-neutral-300'
                        }`}
                      >
                        {i % 5 === 0 ? `A${aisleNum}` : ''}
                        {isTargetAisle && i % 5 === 2 && <MapPin className="w-4 h-4 animate-bounce" />}
                        {isUserAisle && i % 5 === 2 && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                      </div>
                    );
                  })}
                  
                  {/* Path Overlay */}
                  <div className="absolute inset-0 pointer-events-none p-8">
                    <svg className="w-full h-full text-emerald-500/20" viewBox="0 0 100 100">
                      <path 
                        d="M 50 80 Q 20 50 50 20" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeDasharray="4 4"
                        className="animate-dash"
                      />
                    </svg>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-900 leading-relaxed">
                      Walk towards <span className="font-bold">Aisle {navTarget.location.aisle}</span>. The product is located on <span className="font-bold">Shelf {navTarget.location.shelf}</span>.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setNavTarget(null)}
                    className="w-full py-4 bg-neutral-900 text-white font-bold rounded-2xl"
                  >
                    I've Found It
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
