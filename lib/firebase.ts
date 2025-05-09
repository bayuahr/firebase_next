// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCb0JKm79s29J31zgqNEiaMeAHrUB_GRM4",
  authDomain: "javaconnects-ab01d.firebaseapp.com",
  databaseURL: "https://javaconnects-ab01d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "javaconnects-ab01d",
  storageBucket: "javaconnects-ab01d.firebasestorage.app",
  messagingSenderId: "891462173038",
  appId: "1:891462173038:web:14f26493feceab2d94017f",
  measurementId: "G-4PFCVG50J6"
};



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };