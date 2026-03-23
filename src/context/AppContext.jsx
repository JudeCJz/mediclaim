import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';

const AppContext = createContext();

// VIP Accounts: Fast-track to Dashboard instantly (Simplified for Fresh Start)
const VIP_ACCOUNTS = {
  'hod@college.edu': { role: 'hod', name: 'Authorized HOD', department: 'Mediclaim Administration', empId: 'HOD888', status: 'active' },
  'tfaculty@college.edu': { role: 'faculty', name: 'Test Faculty', department: 'Mediclaim System', empId: 'FAC888', status: 'active' }
};

// DEMO DATA: Simplified as requested
const DEMO_FACULTY = [
  { id: 'tf1', email: 'tfaculty@college.edu', name: 'Test Faculty', department: 'Institution', empId: 'FAC888', role: 'faculty' }
];

const DEMO_FY = {
  id: '2025_26', name: '2025-26', enabled: true, maxChildren: 2,
  policies: [
    { id: 'p1', label: 'Silver', premium: 4500, coverage: '1.5 Lakh' },
    { id: 'p2', label: 'Gold', premium: 8500, coverage: '5 Lakh' },
    { id: 'p3', label: 'Platinum', premium: 12000, coverage: '10 Lakh' }
  ]
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [activeFY, setActiveFY] = useState(DEMO_FY); // Start with Demo FY
  const [activeTab, setActiveTabState] = useState(localStorage.getItem('activeTab') || 'overview');
  
  const setActiveTab = (tab) => {
    localStorage.setItem('activeTab', tab);
    setActiveTabState(tab);
  };
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Theme Toggle: Circular Flood Reveal
  const toggleTheme = (e) => {
    const x = e.clientX, y = e.clientY;
    document.documentElement.style.setProperty('--reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--reveal-y', `${y}px`);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    if (!document.startViewTransition) { setTheme(newTheme); return; }
    document.startViewTransition(() => setTheme(newTheme));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auth & Sync Logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isDemoMode && !firebaseUser) return; // Prevent Demo Mode Wipe
      setLoading(true);
      if (firebaseUser) {
        setIsDemoMode(false);
        try {
          const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.status === 'disabled') {
              await signOut(auth);
              setUser(null);
            } else {
              setUser({ email: firebaseUser.email, uid: firebaseUser.uid, ...userData });
            }
          } else if (VIP_ACCOUNTS[firebaseUser.email]) {
            const vipInfo = VIP_ACCOUNTS[firebaseUser.email];
            setUser({ email: firebaseUser.email, uid: firebaseUser.uid, ...vipInfo });
            setDoc(doc(db, "users", firebaseUser.uid), vipInfo, { merge: true });
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error("Firestore Error:", e);
          setUser(null);
        }
      } else {
        // Automatically check if we have a persisted local user (simple session)
        const savedUser = localStorage.getItem('mediclaim_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setIsDemoMode(true);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Active FY in Realtime
  useEffect(() => {
    if (isDemoMode) return;
    const q = query(collection(db, "financialYears"), where("enabled", "==", true));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) setActiveFY({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  }, [isDemoMode]);

  const login = async (email, password) => {
    // INSTITUTIONAL LOGS: Strictly allow only the requested accounts for this fresh start
    // The previous local demo logins are removed to use live Firebase authentication.
    // The `isDemoMode` flag will now be set based on the `onAuthStateChanged` listener
    // if a local user is found, or if a VIP account is created in Firestore.

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return res;
    } catch (e) {
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem('mediclaim_user');
    return signOut(auth).then(() => setUser(null));
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, updates, { merge: true });
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AppContext.Provider value={{ user, loading, theme, toggleTheme, activeFY, login, logout, updateProfile, isDemoMode, DEMO_FACULTY, activeTab, setActiveTab }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
