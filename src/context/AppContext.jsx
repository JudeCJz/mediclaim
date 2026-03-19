import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where } from 'firebase/firestore';

const AppContext = createContext();

// VIP Accounts: Fast-track to Dashboard instantly
const VIP_ACCOUNTS = {
  'admin@hr.com': { role: 'admin', name: 'HR Administrator', department: 'HR', empId: 'HR001' },
  'principal@college.com': { role: 'principal', name: 'Dr. Principal', department: 'Management', empId: 'MGMT001' },
  'hod@it.com': { role: 'hod', name: 'HOD (IT Dept)', department: 'Information Technology', empId: 'HOD001' }
};

// DEMO DATA: Ensuring the HOD sees something even if Firebase is unconfigured
const DEMO_FACULTY = [
  { id: 'f1', email: 'faculty.one@it.com', name: 'Alice Walker', department: 'Information Technology', empId: 'FAC101', role: 'faculty' },
  { id: 'f2', email: 'faculty.two@it.com', name: 'Bob Smith', department: 'Information Technology', empId: 'FAC102', role: 'faculty' },
  { id: 'f3', email: 'stella@it.com', name: 'Stella Greene', department: 'Information Technology', empId: 'FAC103', role: 'faculty' }
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
  const [activeTab, setActiveTab] = useState('overview');
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
        setUser(null);
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
    if (email === 'hod@demo.com') { // DEV BACKDOOR
        const hod = { email: 'hod@it.com', role: 'hod', name: 'Demo HOD', department: 'Information Technology', uid: 'demo_hod_123' };
        setUser(hod);
        setIsDemoMode(true);
        return Promise.resolve();
    }
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userSnap = await getDoc(doc(db, "users", cred.user.uid));
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.status === 'disabled') {
                await signOut(auth);
                throw new Error("ACCOUNT_LOCKED: Your account is disabled right now.");
            }
            setUser({ email: cred.user.email, uid: cred.user.uid, ...userData });
            return cred;
        } else if (VIP_ACCOUNTS[cred.user.email]) {
            const vipInfo = VIP_ACCOUNTS[cred.user.email];
            setUser({ email: cred.user.email, uid: cred.user.uid, ...vipInfo });
            await setDoc(doc(db, "users", cred.user.uid), vipInfo, { merge: true });
            return cred;
        }
    } catch (err) {
        // AUTH FAILED: Initiate Institutional PIN Override Check
        const q = query(collection(db, "users"), where("email", "==", email));
        return onSnapshot(q, (snap) => {
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                const userId = snap.docs[0].id;
                
                // Check if admin has set a manual password overwrite
                if (docData.passwordOverwrite === password) {
                    if (docData.status === 'disabled') throw new Error("ACCOUNT_LOCKED: Access denied.");
                    setUser({ email, uid: userId, ...docData });
                    return Promise.resolve();
                }
            }
            throw err; // Re-throw the original Auth error if no override found
        });
    }
  };

  const logout = () => signOut(auth).then(() => setUser(null));

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
