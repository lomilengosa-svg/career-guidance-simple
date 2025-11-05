import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js';

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