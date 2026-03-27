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
  Info,
  Mic
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

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
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [syncId, setSyncId] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [navTarget, setNavTarget] = useState<Product | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [itemQuantity, setItemQuantity] = useState<Record<string, number>>({});
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const prevItemsRef = useRef<CartItem[]>([]);
  const prevOffersRef = useRef<Record<string, Offer[]>>({});
  const scannerRef = useRef<Html5Qrcode | null>(null);
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
        const data = doc.data() as Cart;
        if (data.mergedInto) {
          // If this cart was merged into another, redirect to the new one
          navigate(`/shopping?cartId=${data.mergedInto}`, { replace: true });
          return;
        }
        setCart(data);
      }
    });

    return () => unsubscribe();
  }, [cartId, profile]);

  // Monitor Cart Items for Synced Updates
  useEffect(() => {
    if (!cart) return;
    
    // Check if items were added by someone else (synced trolley)
    if (prevItemsRef.current.length > 0 && cart.items.length > prevItemsRef.current.length) {
      const addedItems = cart.items.filter(item => 
        !prevItemsRef.current.find(prev => prev.productId === item.productId)
      );
      
      addedItems.forEach(item => {
        toast.success(`Synced Update: ${item.name} added`, {
          description: `Quantity: ${item.quantity}`,
          icon: <ShoppingBag className="w-4 h-4" />
        });
      });
    }
    
    prevItemsRef.current = cart.items;
  }, [cart?.items]);

  // Monitor for New Offers on Cart Items
  useEffect(() => {
    if (!cart || products.length === 0) return;

    const cartProductIds = cart.items.map(i => i.productId);
    
    cartProductIds.forEach(pid => {
      const product = products.find(p => p.productId === pid);
      if (product && product.offers) {
        const prevOffers = prevOffersRef.current[pid] || [];
        const newOffers = product.offers.filter(o => 
          !prevOffers.find(prev => prev.description === o.description)
        );

        newOffers.forEach(offer => {
          toast.info(`New Offer: ${product.name}`, {
            description: offer.description,
            icon: <Tag className="w-4 h-4" />,
            duration: 5000
          });
        });
        
        prevOffersRef.current[pid] = product.offers;
      }
    });
  }, [cart?.items, products]);

  // Fetch Recommendations
  useEffect(() => {
    if (!profile || products.length === 0) return;

    const fetchRecommendations = async () => {
      try {
        // 1. Get past orders
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('userId', '==', profile.uid));
        const querySnapshot = await getDocs(q);
        const pastOrders = querySnapshot.docs.map(doc => doc.data() as Order);

        // 2. Get categories from past orders and current cart
        const pastProductIds = pastOrders.flatMap(order => order.items.map(item => item.productId));
        const cartProductIds = cart?.items.map(item => item.productId) || [];
        const allRelevantProductIds = [...new Set([...pastProductIds, ...cartProductIds])];

        const relevantCategories = new Set<string>();
        allRelevantProductIds.forEach(pid => {
          const product = products.find(p => p.productId === pid);
          if (product) relevantCategories.add(product.category);
        });

        // 3. Find products in those categories that are not in the cart
        const recommended = products.filter(p => 
          relevantCategories.has(p.category) && 
          !cartProductIds.includes(p.productId) &&
          p.stock > 0
        ).slice(0, 5);

        // 4. If not enough recommendations, add some popular/random ones
        if (recommended.length < 3) {
          const others = products.filter(p => 
            !cartProductIds.includes(p.productId) && 
            !recommended.find(r => r.productId === p.productId) &&
            p.stock > 0
          ).slice(0, 3 - recommended.length);
          recommended.push(...others);
        }

        setRecommendations(recommended);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    };

    fetchRecommendations();
  }, [profile, products, cart?.items]);

  // Fetch Products (Real-time)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => doc.data() as Product));
    });
    return () => unsubscribe();
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(track => track.stop());
      setIsCameraReady(true);
    } catch (err) {
      console.error("Camera permission denied:", err);
      toast.error("Camera Access Required", {
        description: "Please allow camera access to scan products."
      });
      setIsScanning(false);
      return;
    }

    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      html5QrCode.start(
        { facingMode: "environment" }, 
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const product = products.find(p => p.productId === decodedText || p.name.toLowerCase() === decodedText.toLowerCase());
          if (product) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              scannerRef.current = null;
              checkOffersAndShowConfirm(product);
            }).catch(err => console.error(err));
          }
        },
        (errorMessage) => {
          // parse error, ignore
        }
      ).catch((err) => {
        console.error("Unable to start scanning", err);
      });
    }, 500);
  };

  const simulateScan = (productId: string) => {
    const product = products.find(p => p.productId === productId);
    if (product) {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current = null;
          setIsScanning(false);
          checkOffersAndShowConfirm(product);
        }).catch(err => {
          console.error(err);
          setIsScanning(false);
          checkOffersAndShowConfirm(product);
        });
      } else {
        setIsScanning(false);
        checkOffersAndShowConfirm(product);
      }
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setIsScanning(false);
      }).catch(err => {
        console.error(err);
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  const checkOffersAndShowConfirm = (product: Product) => {
    // Check for bulk offers (e.g., 2kg vs 2x1kg)
    const bulkOffer = product.offers?.find(o => o.type === 'bulk');
    setShowConfirmModal({ product, offer: bulkOffer });
  };

  const addToCart = async (product: Product, quantity: number = 1) => {
    if (!cart) return;

    // Check if enough stock is available
    const currentProduct = products.find(p => p.productId === product.productId);
    if (!currentProduct || currentProduct.stock < quantity) {
      toast.error("Insufficient Stock", {
        description: `Only ${currentProduct?.stock || 0} units available.`
      });
      return;
    }

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
        toast.error("Trolley Not Found", {
          description: "Please check the ID and try again."
        });
        return;
      }

      const otherCart = otherCartSnap.data() as Cart;
      
      if (otherCart.status !== 'active') {
        toast.error("Invalid Trolley", {
          description: "This trolley session is no longer active."
        });
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

      // Clear the other cart and mark it as merged
      await updateDoc(otherCartRef, {
        items: [],
        totalCost: 0,
        status: 'completed',
        mergedInto: cartId // This will trigger redirection for anyone looking at otherCart
      });

      setShowSyncModal(false);
      setSyncId('');
      toast.success("Trolleys Synced!", {
        description: `Successfully consolidated items from Trolley ${syncId}.`
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Sync Failed", {
        description: "Failed to sync trolley. Please try again."
      });
    }
  };

  const handleCheckout = async () => {
    if (!cart || !profile) return;
    
    // If cart is empty and we haven't shown the confirm yet, show it
    if (cart.items.length === 0 && !showCheckoutConfirm) {
      setShowCheckoutConfirm(true);
      return;
    }

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
    setShowCheckoutConfirm(false);
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

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Not Supported", {
        description: "Voice search is not supported in this browser."
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      searchProducts(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const allOffers = products.reduce((acc, p) => {
    if (p.offers) {
      p.offers.forEach(o => {
        acc.push({ ...o, productName: p.name, productId: p.productId, product: p });
      });
    }
    return acc;
  }, [] as (Offer & { productName: string; productId: string; product: Product })[]);

  const getGridIndex = (loc: { lat: number; lng: number } | null) => {
    if (!loc) return 22; // Default starting position
    const minLat = 12.9710;
    const maxLat = 12.9725;
    const minLng = 77.5940;
    const maxLng = 77.5955;
    const row = 4 - Math.min(4, Math.max(0, Math.floor(((loc.lat - minLat) / (maxLat - minLat)) * 5)));
    const col = Math.min(4, Math.max(0, Math.floor(((loc.lng - minLng) / (maxLng - minLng)) * 5)));
    return row * 5 + col;
  };

  const getTargetGridIndex = (target: Product) => {
    const row = parseInt(target.location.aisle) - 1;
    const col = parseInt(target.location.shelf) - 1;
    return row * 5 + col;
  };

  const getPathData = (startIndex: number, endIndex: number) => {
    const x1 = (startIndex % 5) * 20 + 10;
    const y1 = Math.floor(startIndex / 5) * 20 + 10;
    const x2 = (endIndex % 5) * 20 + 10;
    const y2 = Math.floor(endIndex / 5) * 20 + 10;
    const cx = (x1 + x2) / 2 + (y2 - y1) * 0.2;
    const cy = (y1 + y2) / 2 - (x2 - x1) * 0.2;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
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
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold">Sync</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input 
            type="text"
            placeholder="Search products or aisles..."
            className="w-full pl-10 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={searchQuery}
            onChange={(e) => searchProducts(e.target.value)}
          />
          <button 
            onClick={startVoiceSearch}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-neutral-400 hover:bg-neutral-100'}`}
            title="Voice Search"
          >
            <Mic className="w-5 h-5" />
          </button>
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
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-neutral-400">Aisle {p.location.aisle} • ₹{p.price}</p>
                      {p.stock <= 0 ? (
                        <span className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Out of Stock</span>
                      ) : p.stock < 5 ? (
                        <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Only {p.stock} left</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-neutral-100 rounded-lg p-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemQuantity(prev => ({ ...prev, [p.productId]: Math.max(1, (prev[p.productId] || 1) - 1) }));
                        }}
                        className="p-1 hover:bg-white rounded-md transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold min-w-[16px] text-center">{itemQuantity[p.productId] || 1}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemQuantity(prev => ({ ...prev, [p.productId]: (prev[p.productId] || 1) + 1 }));
                        }}
                        className="p-1 hover:bg-white rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p, itemQuantity[p.productId] || 1);
                        toast.success(`Added ${p.name} to cart`);
                      }}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 bg-emerald-50 rounded-lg text-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        setSearchResults([]);
                        setNavTarget(p);
                      }}
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Offers Horizontal Scroll */}
        {allOffers.length > 0 && (
          <div className="relative mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">Active Offers</h2>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Limited Time</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
              {allOffers.map((offer, idx) => (
                <motion.div 
                  key={idx}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNavTarget(offer.product)}
                  className="flex-shrink-0 w-64 p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Tag className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-orange-900 uppercase tracking-tighter">{offer.productName}</p>
                      <p className="text-sm font-bold text-orange-800 leading-tight mt-1">{offer.description}</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-orange-600">
                        <Navigation className="w-3 h-3" />
                        Navigate to Aisle {offer.product.location.aisle}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">Recommended for You</h2>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Based on your taste</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
              {recommendations.map((product) => (
                <motion.div 
                  key={product.productId}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-48 p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col gap-2">
                    <div className="w-full aspect-square bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-300">
                      <ShoppingBag className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 truncate">{product.name}</p>
                      <p className="text-xs text-neutral-400">{product.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-black text-emerald-600">₹{product.price}</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                            toast.success(`Added ${product.name} to cart`);
                          }}
                          className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="p-6 space-y-4">
        {cart?.items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-neutral-300" />
            </div>
            <p className="text-neutral-400 font-medium">Your cart is empty</p>
            <div className="flex flex-col gap-3 mt-6">
              <button 
                onClick={startScanner}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Scan first item
              </button>
              <button 
                onClick={() => setShowSyncModal(true)}
                className="w-full py-4 bg-blue-50 text-blue-600 font-bold rounded-2xl border border-blue-100 flex items-center justify-center gap-2"
              >
                <Layers className="w-5 h-5" />
                Sync with another trolley
              </button>
            </div>
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
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{item.name}</h3>
                  {(() => {
                    const product = products.find(p => p.productId === item.productId);
                    if (!product) return null;
                    if (product.stock <= 0) {
                      return (
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Out of Stock
                        </span>
                      );
                    }
                    if (product.stock < 5) {
                      return (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Only {product.stock} left
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <p className="text-sm text-neutral-400">₹{item.price} per unit</p>
                
                {/* Offer Display in Cart */}
                {products.find(p => p.productId === item.productId)?.offers?.map((offer, oIdx) => (
                  <div key={oIdx} className="mt-1 flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md w-fit">
                    <Tag className="w-3 h-3" />
                    {offer.description}
                  </div>
                ))}

                <div className="flex items-center gap-4 mt-3 p-1 bg-neutral-50 rounded-xl w-fit border border-neutral-100">
                  <button 
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-neutral-600 rounded-lg shadow-sm hover:bg-neutral-100 active:scale-90 transition-all border border-neutral-200"
                    title="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-sm min-w-[20px] text-center">{item.quantity}</span>
                  <button 
                    onClick={() => {
                      const product = products.find(p => p.productId === item.productId);
                      if (product && product.stock > 0) {
                        updateQuantity(item.productId, 1);
                      } else {
                        toast.error("Out of Stock", {
                          description: "No more units available for this item."
                        });
                      }
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-all ${
                      (products.find(p => p.productId === item.productId)?.stock || 0) > 0
                        ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 active:scale-90'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    }`}
                    title="Increase quantity"
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
      {cart?.syncedCartIds && cart.syncedCartIds.length > 0 && (
        <div className="px-6 mb-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[32px] shadow-xl shadow-blue-100 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">Multi-Trolley Mode</h3>
                  <p className="text-[10px] text-blue-100 font-bold">Connected with {cart.syncedCartIds.length} other devices</p>
                </div>
              </div>
              <div className="flex -space-x-2">
                {cart.syncedCartIds.map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center text-indigo-600">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {cart.syncedCartIds.map(id => (
                <div key={id} className="px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  {id}
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <p className="text-[10px] font-medium text-blue-50 italic">
                Real-time sync active. All items are consolidated.
              </p>
            </div>
          </motion.div>
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
          className="w-full py-4 bg-neutral-900 text-white font-bold rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2"
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
              <p className="mb-6">Align the product barcode or QR code within the frame</p>
              
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Or Simulate Scan from Reference</p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => simulateScan('PROD_BREAD')}
                    className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors flex flex-col items-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span className="text-[8px] font-bold text-white truncate w-full">Bread</span>
                  </button>
                  <button 
                    onClick={() => simulateScan('PROD_MILK_500ML')}
                    className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors flex flex-col items-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span className="text-[8px] font-bold text-white truncate w-full">Milk</span>
                  </button>
                  <button 
                    onClick={() => simulateScan('PROD_ATTA_1KG')}
                    className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors flex flex-col items-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span className="text-[8px] font-bold text-white truncate w-full">Atta</span>
                  </button>
                </div>
              </div>
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
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <button onClick={() => setShowConfirmModal(null)} className="p-2 bg-neutral-100 rounded-full">
                    <X className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
                
                <h2 className="text-2xl font-bold mb-1">{showConfirmModal.product.name}</h2>
                <p className="text-neutral-400 text-sm mb-6">{showConfirmModal.product.category}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-xl font-black text-emerald-600">₹{showConfirmModal.product.price}</p>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Stock</p>
                    <p className={`text-lg font-bold ${showConfirmModal.product.stock > 0 ? 'text-neutral-900' : 'text-red-500'}`}>
                      {showConfirmModal.product.stock > 0 ? `${showConfirmModal.product.stock} units` : 'Out of Stock'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 mb-6 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Location</p>
                    <p className="text-sm font-bold">Aisle {showConfirmModal.product.location.aisle}, Shelf {showConfirmModal.product.location.shelf}</p>
                  </div>
                </div>

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
                    Cancel
                  </button>
                  <button 
                    onClick={() => addToCart(showConfirmModal.product)}
                    disabled={showConfirmModal.product.stock <= 0}
                    className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    Add to Cart
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

      {/* Checkout Confirmation Modal */}
      <AnimatePresence>
        {showCheckoutConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-8"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-amber-100 rounded-full">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Empty Cart</h2>
              <p className="text-neutral-500 text-center text-sm mb-8">
                Your cart is currently empty. Are you sure you want to proceed with checkout?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCheckoutConfirm(false)}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-600 font-bold rounded-2xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCheckout}
                  className="flex-1 py-4 bg-neutral-900 text-white font-bold rounded-2xl shadow-lg shadow-neutral-100"
                >
                  Yes, Checkout
                </button>
              </div>
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
                  {(() => {
                    const userIdx = getGridIndex(location);
                    const targetIdx = getTargetGridIndex(navTarget);
                    
                    return [...Array(25)].map((_, i) => {
                      const aisleNum = Math.floor(i / 5) + 1;
                      const isTargetPos = i === targetIdx;
                      const isUserPos = i === userIdx;
                      const isTargetAisle = aisleNum.toString() === navTarget.location.aisle;
                      
                      return (
                        <div 
                          key={i} 
                          className={`rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                            isTargetPos ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105 z-10' : 
                            isUserPos ? 'bg-blue-500 text-white shadow-lg shadow-blue-100 scale-105 z-10' : 
                            isTargetAisle ? 'bg-emerald-50' : 'bg-white border border-neutral-200 text-neutral-300'
                          }`}
                        >
                          {i % 5 === 0 ? `A${aisleNum}` : ''}
                          {isTargetPos && <MapPin className="w-4 h-4 animate-bounce" />}
                          {isUserPos && <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse border-2 border-blue-600" />}
                        </div>
                      );
                    });
                  })()}
                  
                  {/* Path Overlay */}
                  <div className="absolute inset-0 pointer-events-none p-4">
                    <svg className="w-full h-full text-emerald-500/40" viewBox="0 0 100 100">
                      {(() => {
                        const userIdx = getGridIndex(location);
                        const targetIdx = getTargetGridIndex(navTarget);
                        return (
                          <path 
                            d={getPathData(userIdx, targetIdx)} 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeDasharray="3 3"
                            className="animate-dash"
                          />
                        );
                      })()}
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

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-white rounded-xl p-1 border border-neutral-200">
                        <button 
                          onClick={() => setItemQuantity(prev => ({ ...prev, [navTarget.productId]: Math.max(1, (prev[navTarget.productId] || 1) - 1) }))}
                          className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold min-w-[20px] text-center">{itemQuantity[navTarget.productId] || 1}</span>
                        <button 
                          onClick={() => setItemQuantity(prev => ({ ...prev, [navTarget.productId]: (prev[navTarget.productId] || 1) + 1 }))}
                          className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-bold text-emerald-600">₹{navTarget.price * (itemQuantity[navTarget.productId] || 1)}</p>
                    </div>
                    <button 
                      onClick={() => {
                        addToCart(navTarget, itemQuantity[navTarget.productId] || 1);
                        toast.success(`Added ${navTarget.name} to cart`);
                      }}
                      className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Add to Cart
                    </button>
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
