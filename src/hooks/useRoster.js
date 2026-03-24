// src/hooks/useRoster.js

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db, provider } from "../lib/firebase";
import { normalizeText } from "../utils/normalize";

export function useRoster() {
  const [user, setUser] = useState(undefined);
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const initPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        setAuthError("ブラウザの設定によりログイン状態の保存に失敗しました。");
      }
    };
    initPersistence();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError("");
      if (currentUser) {
        setUser(currentUser);

        try {
          const snap = await getDoc(doc(db, "roster", "current"));
          if (snap.exists()) {
            const data = snap.data();
            const students = Array.isArray(data.students) ? data.students : Array.isArray(data.list) ? data.list : [];
            const mapped = students.map((item) => {
              const num = Number(item.number);
              const classStr = typeof item.class === "number" ? `${item.class}組` : (item.class ? String(item.class) : "");
              return {
                number: Number.isFinite(num) ? num : 0,
                class: classStr,
                name: item.name || "",
                reading: item.kana || item.reading || "",
                normName: normalizeText(item.name || ""),
                normReading: normalizeText(item.kana || item.reading || ""),
                normClass: normalizeText(classStr),
                normNumber: normalizeText(String(item.number ?? ""))
              };
            });
            setProfiles(mapped);
          }
        } catch (err) {
          console.error("Firestore 読み込みエラー:", err);
        }
      } else {
        setUser(null);
        setProfiles([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      setAuthError("ログアウト処理でエラーが発生しました。");
    }
  };

  const handleLogin = async () => {
    try {
      setAuthError("");
      setIsAuthLoading(true);
      await signInWithPopup(auth, provider);
    } catch (e) {
      setAuthError("ログインに失敗しました。APIキーと許可ドメイン、ポップアップ許可を確認してください。");
    } finally {
      setIsAuthLoading(false);
    }
  };

  return { user, profiles, authError, isAuthLoading, handleLogin, handleLogout };
}