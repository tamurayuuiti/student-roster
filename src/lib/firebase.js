// src/lib/firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/* ============================================================
 * Firebase 設定 & 初期化
 * ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyBtJgxwPf8_ocSct_-P66Jki_UCYbnQG6I",
  authDomain: "student-roster-8b49a.firebaseapp.com",
  projectId: "student-roster-8b49a",
  storageBucket: "student-roster-8b49a.appspot.com",
  messagingSenderId: "419395010291",
  appId: "1:419395010291:web:0aaed2f2983d4eadd3c186",
  measurementId: "G-LXWL4LT3MS"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
auth.useDeviceLanguage?.();

export { app, auth, db, provider };