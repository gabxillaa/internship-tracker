// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCvGTkKXjgygVQu_k7TZrukhyb9Jqlf7Ck",
  authDomain: "prac-web-39acd.firebaseapp.com",
  projectId: "prac-web-39acd",
  storageBucket: "prac-web-39acd.firebasestorage.app",
  messagingSenderId: "656256934773",
  appId: "1:656256934773:web:7829f5e64d57832746693c",
  measurementId: "G-0JF4Y4PR41"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();