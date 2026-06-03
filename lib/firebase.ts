import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWsiKdxbaekjrd_8HjhBT5FmYT-UiXysQ",
  authDomain: "fuel-tracker-9ca8d.firebaseapp.com",
  projectId: "fuel-tracker-9ca8d",
  storageBucket: "fuel-tracker-9ca8d.firebasestorage.app",
  messagingSenderId: "778321782300",
  appId: "1:778321782300:web:aaecb10f07d5010c54e1d9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
