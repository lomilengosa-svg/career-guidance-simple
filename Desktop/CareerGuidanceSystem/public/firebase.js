// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrey2RFEfbEeBgttub67k0FqFRjcizJXI",
  authDomain: "career-guidance-simple.firebaseapp.com",
  projectId: "career-guidance-simple",
  storageBucket: "career-guidance-simple.firebasestorage.app",
  messagingSenderId: "837363883387",
  appId: "1:837363883387:web:4bff47a967605fd9cbf1de"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth, signInWithEmailAndPassword, createUserWithEmailAndPassword };