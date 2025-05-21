// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (already correct)
const firebaseConfig = {
  apiKey: "AIzaSyBiCtNlH6rPktiWSYbs9RTX6dg_4FclPqk",
  authDomain: "ipl-mock-auction-c97bc.firebaseapp.com",
  projectId: "ipl-mock-auction-c97bc",
  storageBucket: "ipl-mock-auction-c97bc.firebasestorage.app",
  messagingSenderId: "1006630638144",
  appId: "1:1006630638144:web:fe60365859f9a37ece85a5",
  measurementId: "G-3W23NFF83Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Only include Firestore for now
export const db = getFirestore(app);
