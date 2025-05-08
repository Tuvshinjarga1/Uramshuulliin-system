// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase тохиргоо
const firebaseConfig = {
  apiKey: "AIzaSyDO_kdG5c7r1WHQhjTJj3xKwansk5KM30c",
  authDomain: "enkul-6391b.firebaseapp.com",
  projectId: "enkul-6391b",
  storageBucket: "enkul-6391b.firebasestorage.app",
  messagingSenderId: "655770617361",
  appId: "1:655770617361:web:32d1a8c95b2c9ea30593b0",
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
