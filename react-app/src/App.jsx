import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

/* ============================================================
 * ユーティリティ
 * ============================================================ */
const collator = new Intl.Collator("ja", { sensitivity: "base", numeric: true });
const RE_SPACE = /[\s　]+/g;
const RE_KATAKANA = /[\u30A1-\u30F6]/g;

function normalizeText(str) {
  if (str == null) return "";
  let result = String(str).replace(RE_SPACE, "");
  result = result.replace(RE_KATAKANA, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
  return result.toLowerCase();
}

function compareByClassThenNumberThenReading(a, b) {
  const ca = Number(a.class.replace("組", "")) || 0;
  const cb = Number(b.class.replace("組", "")) || 0;
  if (ca !== cb) return ca - cb;

  const na = a.number || 0;
  const nb = b.number || 0;
  if (na !== nb) return na - nb;

  return collator.compare(a.reading || "", b.reading || "");
}

function compareByReadingThenNumber(a, b) {
  const r = collator.compare(a.reading || "", b.reading || "");
  if (r !== 0) return r;
  return (a.number || 0) - (b.number || 0);
}

/* ============================================================
 * Firebase 初期化ヘルパー
 * ============================================================ */
let firebaseApp;
let firebaseAuth;
let firebaseDb;

function initFirebase() {
  if (!firebaseApp) {
    const el = document.getElementById("firebase-config");
    if (!el) throw new Error("firebase-config タグが見つかりません。");

    const text = (el.textContent || "").trim();
    if (!text || !text.startsWith("{")) {
      throw new Error("Firebase設定JSONを正しく貼り付けてください。");
    }

    const config = JSON.parse(text);
    firebaseApp = getApps().length ? getApp() : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);

    // ブラウザの言語を優先
    firebaseAuth.useDeviceLanguage?.();
  }
  return { auth: firebaseAuth, db: firebaseDb };
}

/* ============================================================
 * メインコンポーネント
 * ============================================================ */
export default function App() {
  // --- 認証ステート ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- 名簿ステート ---
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCriteria, setSortCriteria] = useState("class");
  const [isAscending, setIsAscending] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const rafRef = useRef(null);
  const menuRef = useRef(null);

  /* ---------------- Firebase 認証の監視 ---------------- */
  useEffect(() => {
    try {
      const { auth } = initFirebase();

      setPersistence(auth, browserLocalPersistence).catch((e) => {
        console.error("setPersistence error:", e);
        setAuthError("ブラウザの設定によりログイン状態の保存に失敗しました。");
      });

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        setAuthError(""); // 状態が変わったらエラークリア
      });

      return () => unsubscribe();
    } catch (e) {
      setAuthError(`初期化エラー: ${e.message}`);
      setAuthLoading(false);
    }
  }, []);

  /* ---------------- メニュー外クリックで閉じる ---------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isMenuOpen]);

  /* ---------------- Firestoreデータ取得 (ログイン時のみ) ---------------- */
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      return;
    }

    (async () => {
      setIsDataLoading(true);
      try {
        const { db } = initFirebase();
        const snap = await getDoc(doc(db, "roster", "current"));

        if (!snap.exists()) {
          setProfiles([]);
          return;
        }

        const data = snap.data() || {};
        const students = data.students || data.list || [];

        const mapped = students.map((item) => {
          const classStr = typeof item.class === "number" ? `${item.class}組` : item.class || "";
          return {
            number: Number(item.number) || 0,
            class: classStr,
            name: item.name || "",
            reading: item.kana || item.reading || "",
            normName: normalizeText(item.name),
            normReading: normalizeText(item.kana || item.reading),
            normClass: normalizeText(classStr),
            normNumber: normalizeText(String(item.number ?? "")),
          };
        });

        setProfiles(mapped);
      } catch (e) {
        console.error("Firestore error:", e);
        setAuthError("データの取得に失敗しました。権限などを確認してください。");
        setProfiles([]);
      } finally {
        setIsDataLoading(false);
      }
    })();
  }, [user]);

  /* ---------------- 認証ハンドラー ---------------- */
  const handleLogin = async () => {
    if (isLoginProcessing) return;
    setIsLoginProcessing(true);
    setAuthError("");
    try {
      const { auth } = initFirebase();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login error:", e);
      setAuthError("ログインに失敗しました。APIキーやポップアップ許可を確認してください。");
    } finally {
      setIsLoginProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { auth } = initFirebase();
      await signOut(auth);
      setIsMenuOpen(false);
    } catch (e) {
      console.error("Logout error:", e);
      setAuthError("ログアウト処理でエラーが発生しました。");
    }
  };

  /* ---------------- 名簿の計算・操作 ---------------- */
  const classNames = useMemo(() => {
    const set = new Set(profiles.map((p) => p.class));
    return Array.from(set).sort(
      (a, b) => Number(a.replace("組", "")) - Number(b.replace("組", ""))
    );
  }, [profiles]);

  const filteredSorted = useMemo(() => {
    let result = profiles;

    if (searchTerm) {
      const tokens = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
      result = result.filter((p) =>
        tokens.every(
          (t) =>
            p.normName.includes(t) ||
            p.normReading.includes(t) ||
            p.normClass.includes(t) ||
            p.normNumber.includes(t)
        )
      );
    }

    const compare = sortCriteria === "class" ? compareByClassThenNumberThenReading : compareByReadingThenNumber;
    return [...result].sort((a, b) => (isAscending ? compare(a, b) : -compare(a, b)));
  }, [profiles, searchTerm, sortCriteria, isAscending]);

  const handleSearch = (value) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setSearchTerm(value.trim());
    });
  };

  const scrollToClass = (className) => {
    const id = `class-${className}`;
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /* ============================================================
   * レンダリング
   * ============================================================ */
  if (authLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  // ---------------- 未ログイン画面 ----------------
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">名簿システム</h1>
          <p className="text-sm text-gray-600 mb-6">Googleアカウントでサインインしてください。</p>
          
          {authError && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-left">
              {authError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoginProcessing}
            className={`w-full py-2 px-4 rounded text-white font-bold transition ${
              isLoginProcessing ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoginProcessing ? "処理中..." : "Googleでログイン"}
          </button>
        </div>
      </div>
    );
  }

  // ---------------- ログイン済み画面 (名簿アプリ) ----------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold">名簿システム</h1>
        
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition"
            aria-expanded={isMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {user.email?.[0]?.toUpperCase() || "U"}
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg py-2">
              <div className="px-4 py-2 text-xs text-gray-500 truncate border-b mb-2">
                {user.email}
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4 space-y-4 max-w-5xl mx-auto">
        {authError && (
          <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
            {authError}
          </div>
        )}

        {isDataLoading ? (
          <div className="text-center py-10 text-gray-500">データを取得しています...</div>
        ) : (
          <>
            {/* 上部操作パネル */}
            <div className="flex gap-2 flex-wrap bg-white p-4 rounded shadow-sm items-center">
              <input
                placeholder="名前・クラス・番号で検索..."
                className="border p-2 rounded flex-1 min-w-[200px]"
                onChange={(e) => handleSearch(e.target.value)}
              />

              <select
                value={sortCriteria}
                onChange={(e) => setSortCriteria(e.target.value)}
                className="border p-2 rounded"
              >
                <option value="class">クラス順</option>
                <option value="reading">五十音順</option>
              </select>

              <button
                onClick={() => setIsAscending((v) => !v)}
                className="border p-2 rounded hover:bg-gray-50"
              >
                {isAscending ? "昇順 ▲" : "降順 ▼"}
              </button>
            </div>

            {/* ジャンプボタン */}
            {!searchTerm && sortCriteria === "class" && (
              <div className="flex gap-2 flex-wrap">
                {classNames.map((c) => (
                  <button
                    key={c}
                    onClick={() => scrollToClass(c)}
                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm hover:bg-blue-100 transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* 件数 */}
            <div className="text-sm text-gray-500 text-right">
              {filteredSorted.length} / {profiles.length} 件表示
            </div>

            {/* カード一覧 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredSorted.map((p, i) => {
                const showAnchor =
                  sortCriteria === "class" &&
                  !searchTerm &&
                  (i === 0 || filteredSorted[i - 1].class !== p.class);

                return (
                  <div
                    key={i}
                    id={showAnchor ? `class-${p.class}` : undefined}
                    className="p-4 rounded-xl shadow-sm bg-white border border-gray-100 hover:shadow-md transition"
                  >
                    <div className="flex justify-between text-gray-500 mb-2 border-b pb-2">
                      <span className="font-semibold text-blue-600">{p.class}</span>
                      <span className="text-sm">{String(p.number).padStart(3, "0")}番</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{p.reading}</div>
                      <div className="font-bold text-lg text-gray-800">{p.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredSorted.length === 0 && !isDataLoading && (
              <div className="text-center py-10 text-gray-400">
                該当する生徒が見つかりません。
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}