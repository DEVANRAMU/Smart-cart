import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useSearchParams,
  useNavigate
} from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, updateDoc, increment, addDoc } from 'firebase/firestore';
import { UserProfile, Cart, Product, Order } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Shopping from './components/Shopping';
import Onboarding from './components/Onboarding';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

import { seedProducts } from './seed';

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Seed products if user is admin
        if (firebaseUser.email === 'devanramucsbs307@gmail.com') {
          seedProducts();
        }
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
          <Routes>
            <Route 
              path="/" 
              element={user ? <HomeRedirect profile={profile} /> : <Auth onAuthSuccess={(p) => setProfile(p)} />} 
            />
            <Route 
              path="/onboarding" 
              element={user ? (
                <Onboarding 
                  onComplete={async () => {
                    await updateDoc(doc(db, 'users', user.uid), { isNewUser: false });
                    window.location.href = '/';
                  }} 
                />
              ) : <Navigate to="/" />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard profile={profile} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/shopping" 
              element={user ? <Shopping profile={profile} /> : <Navigate to="/" />} 
            />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function HomeRedirect({ profile }: { profile: UserProfile | null }) {
  const [searchParams] = useSearchParams();
  const cartId = searchParams.get('cartId');

  if (profile?.isNewUser) {
    return <Navigate to="/onboarding" />;
  }

  if (cartId) {
    return <Navigate to={`/shopping?cartId=${cartId}`} />;
  }

  return <Navigate to="/dashboard" />;
}
