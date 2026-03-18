import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCDAz_UKm3_g4iUvyVolLqqLJ6XP0OhM48",
  authDomain: "mbase-1bb15.firebaseapp.com",
  projectId: "mbase-1bb15",
  storageBucket: "mbase-1bb15.firebasestorage.app",
  messagingSenderId: "985982394244",
  appId: "1:985982394244:web:6ba84c8b7b6d6a68e787d1",
  measurementId: "G-SFFKLPKF70"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Resilience: Force Long Polling to bypass ad-blockers/firewalls
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const auth = getAuth(app);

export { auth, db, firebaseConfig };
export default app;
