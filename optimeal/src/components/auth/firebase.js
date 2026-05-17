// Import the Firebase SDK modules used by the React client.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAI_x47_29hi80gDZ0fjDW81SAFP2_p8Yc",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "optimeal-bbabb.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "optimeal-bbabb",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "optimeal-bbabb.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "796707776374",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:796707776374:web:44349f3b0c155f5d1abc57",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-7KZJE7EDE2"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const provider = new GoogleAuthProvider();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Export the initialized Firebase app 
