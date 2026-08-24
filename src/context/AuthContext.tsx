import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  picture?: string;
  pharmacyId: string;
  role?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserDocument = async (fbUser: FirebaseUser, displayName?: string): Promise<UserData> => {
    const userRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: fbUser.uid,
        name: data.name || displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || '',
        picture: fbUser.photoURL || '',
        pharmacyId: data.pharmacyId || `pharmacy_${fbUser.uid}`,
        role: data.role || 'owner'
      };
    } else {
      const pharmacyId = `pharmacy_${fbUser.uid}`;
      const name = displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'User';

      const userData: UserData = {
        uid: fbUser.uid,
        name,
        email: fbUser.email || '',
        picture: fbUser.photoURL || '',
        pharmacyId,
        role: 'owner'
      };

      await setDoc(userRef, {
        name: userData.name,
        email: userData.email,
        pharmacyId,
        role: userData.role,
        createdAt: new Date().toISOString()
      });

      // Ensure pharmacy doc
      const pharmacyRef = doc(db, 'pharmacies', pharmacyId);
      const pharmacySnap = await getDoc(pharmacyRef);
      if (!pharmacySnap.exists()) {
        await setDoc(pharmacyRef, {
          pharmacyName: `${name}'s Pharmacy`,
          ownerId: fbUser.uid,
          createdAt: new Date().toISOString()
        });
      }

      return userData;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userData = await ensureUserDocument(fbUser);
          setUser(userData);
        } catch (err) {
          console.error("Error fetching user document:", err);
          setUser({
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            picture: fbUser.photoURL || '',
            pharmacyId: `pharmacy_${fbUser.uid}`
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    const userData = await ensureUserDocument(userCred.user);
    setUser(userData);
  };

  const loginWithGoogle = async () => {
    const userCred = await signInWithPopup(auth, googleProvider);
    const userData = await ensureUserDocument(userCred.user);
    setUser(userData);
  };

  const signup = async (name: string, email: string, pass: string) => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const userData = await ensureUserDocument(userCred.user, name);
    setUser(userData);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      loading,
      login,
      loginWithGoogle,
      signup,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
