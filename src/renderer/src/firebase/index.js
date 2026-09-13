// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDm_2gULiBk7pvKfPCulrI2Ngczr1SzXzs",
  authDomain: "windowswplay.firebaseapp.com",
  projectId: "windowswplay",
  storageBucket: "windowswplay.appspot.com",
  messagingSenderId: "936382326321",
  appId: "1:936382326321:web:323cc9a894cb811c481710",
  measurementId: "G-S5LK4CGVZF"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth();
export const db = getFirestore(app);