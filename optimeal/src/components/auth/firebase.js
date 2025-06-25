// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAI_x47_29hi80gDZ0fjDW81SAFP2_p8Yc",
    authDomain: "optimeal-bbabb.firebaseapp.com",
    projectId: "optimeal-bbabb",
    storageBucket: "optimeal-bbabb.firebasestorage.app",
    messagingSenderId: "796707776374",
    appId: "1:796707776374:web:44349f3b0c155f5d1abc57",
    measurementId: "G-7KZJE7EDE2"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const provider = new GoogleAuthProvider();
export const auth = getAuth(app);
export const db = getFirestore(app);
// Export the initialized Firebase app 
