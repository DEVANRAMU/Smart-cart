import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { UserProfile, Order } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  History, 
  Calendar, 
  ChevronRight, 
  Tag, 
  LogOut,
  QrCode,
  User,
  X,
  Smartphone,
  Mail,
  Clock
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  profile: UserProfile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [trolleyId, setTrolleyId] = useState('TROLLEY_1');

  useEffect(() => {
    if (profile) {
      const fetchOrders = async () => {
        if (!auth.currentUser) return;
        const q = query(
          collection(db, 'orders'), 
          where('userId', '==', auth.currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        setOrders(snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as Order)));
        setLoading(false);
      };
      fetchOrders();
    }
  }, [profile]);

  const handleLogout = () => signOut(auth);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="p-6 bg-white border-b border-neutral-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Welcome, {profile?.name}</h1>
          <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <p className="text-neutral-500 text-sm">Ready for smart shopping?</p>
      </div>

      {/* Quick Action */}
      <div className="p-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-6 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-100 text-white flex items-center justify-between cursor-pointer"
          onClick={() => setShowScanModal(true)}
        >
          <div>
            <h2 className="text-xl font-bold mb-1">Start Shopping</h2>
            <p className="text-emerald-100 text-sm">Scan trolley QR code</p>
          </div>
          <div className="p-3 bg-white/20 rounded-2xl">
            <QrCode className="w-8 h-8" />
          </div>
        </motion.div>
      </div>

      {/* Previous Orders */}
      <div className="px-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold">Previous Orders</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-neutral-200">
            <ShoppingBag className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
            <p className="text-neutral-400">No orders yet. Start shopping!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div 
                key={order.orderId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(order.timestamp).toLocaleDateString()}
                    </div>
                    <p className="font-bold text-lg">₹{order.totalCost}</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    Completed
                  </span>
                </div>
                
                <div className="space-y-1 mb-3">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-neutral-600">
                      <span>{item.name} x{item.quantity}</span>
                      <span>₹{item.totalPrice}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-neutral-400">+{order.items.length - 2} more items</p>
                  )}
                </div>

                {order.offersApplied.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mb-3">
                    <Tag className="w-3 h-3" />
                    Offers applied
                  </div>
                )}

                <button className="w-full py-2 bg-neutral-50 text-neutral-600 text-sm font-semibold rounded-xl flex items-center justify-center gap-1 hover:bg-neutral-100 transition-colors">
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100 flex justify-around items-center max-w-md mx-auto z-20">
        <button className="flex flex-col items-center text-emerald-600">
          <ShoppingBag className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center text-neutral-400">
          <History className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Orders</span>
        </button>
        <button 
          onClick={() => setShowProfile(true)}
          className="flex flex-col items-center text-neutral-400"
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Profile</span>
        </button>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-white rounded-t-[40px] p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">My Profile</h2>
              <button onClick={() => setShowProfile(false)} className="p-2 bg-neutral-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold">{profile?.name}</h3>
              <p className="text-neutral-500">{auth.currentUser?.email}</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                <Smartphone className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-400">Mobile Number</p>
                  <p className="font-semibold">{profile?.mobile || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                <Mail className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-400">Email Address</p>
                  <p className="font-semibold">{auth.currentUser?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                <Clock className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-400">Member Since</p>
                  <p className="font-semibold">{new Date(profile?.createdAt || '').toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </motion.div>
        </div>
      )}

      {/* Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-[40px] p-8 text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <QrCode className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Scan Trolley</h2>
            <p className="text-neutral-500 mb-8">Enter the Trolley ID found on the QR code sticker.</p>
            
            <input 
              type="text"
              value={trolleyId}
              onChange={(e) => setTrolleyId(e.target.value)}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl mb-6 text-center font-bold text-xl uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="TROLLEY_ID"
            />

            <div className="flex gap-4">
              <button 
                onClick={() => setShowScanModal(false)}
                className="flex-1 py-4 bg-neutral-100 text-neutral-600 font-bold rounded-2xl"
              >
                Cancel
              </button>
              <button 
                onClick={() => navigate(`/shopping?cartId=${trolleyId}`)}
                className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100"
              >
                Start
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
