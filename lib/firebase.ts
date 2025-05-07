// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfzn3EpW389fG-GYMmZ1I6qjT5LIExz5c",
  authDomain: "testing-import-31153.firebaseapp.com",
  projectId: "testing-import-31153",
  storageBucket: "testing-import-31153.firebasestorage.app",
  messagingSenderId: "1085296969694",
  appId: "1:1085296969694:web:0e161fb02e786c1d8a7f4f",
  measurementId: "G-VLPSDS9CDG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };