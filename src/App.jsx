import React, { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// 分離したFirebaseインスタンスをインポート
import { auth, db, provider } from "./lib/firebase";

// コンポーネントのインポート
import Header from "./components/Header";
import AuthGate, { HOLD_AFTER_LOGIN } from "./components/AuthGate";
import CardGrid, { normalizeText } from "./components/CardGrid";

export default function App() {
  // --- 認証状態 ---
  const [user, setUser] = useState(undefined); // undefined = loading
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- データ状態 ---
  const [profiles, setProfiles] = useState([]);

  // ------------------------------------------------------------
  // Firebase 認証監視 & データフェッチ
  // ------------------------------------------------------------
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
        document.documentElement.setAttribute("data-auth", "signedin");

        // ログイン完了後に名簿データ取得
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
                // CardGridからimportしたnormalizeTextを再利用
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
        document.documentElement.setAttribute("data-auth", "signedout");
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

  // ------------------------------------------------------------
  // UI レンダー
  // ------------------------------------------------------------
  if (user === undefined) {
    return null; // 初期ローディング
  }

  // ===== 認証ゲート =====
  if (!user || HOLD_AFTER_LOGIN) {
    return (
      <AuthGate
        user={user}
        handleLogin={handleLogin}
        isAuthLoading={isAuthLoading}
        authError={authError}
        handleLogout={handleLogout}
      />
    );
  }

  // ===== アプリ本体 =====
  return (
    <div id="app-root" className="bg-gray-100 min-h-screen">
      <Header user={user} handleLogout={handleLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CardGrid profiles={profiles} />
      </main>
    </div>
  );
}