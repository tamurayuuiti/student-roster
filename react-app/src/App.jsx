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

  /* ---------------- HTMLタグのdata属性同期 ---------------- */
  useEffect(() => {
    const htmlEl = document.documentElement;
    if (authLoading) {
      htmlEl.setAttribute("data-auth", "loading");
    } else if (user) {
      htmlEl.setAttribute("data-auth", "signedin");
    } else {
      htmlEl.setAttribute("data-auth", "signedout");
    }
  }, [authLoading, user]);

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
        setAuthError(""); 
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500 font-semibold">読み込み中...</div>
      </div>
    );
  }

  // ---------------- 未ログイン画面 (認証ゲート) ----------------
  if (!user) {
    return (
      <section id="auth-gate" aria-live="polite" className="min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="auth-card max-w-md w-full">
          <div className="text-xl font-bold text-slate-900 tracking-tight mb-2 text-center">
            ログイン
          </div>
          <p id="auth-subtitle" className="text-slate-500 text-sm mb-4 text-center">
            このページを利用するには、Googleアカウントでサインインしてください。
          </p>

          <div className="flex justify-center">
            <div id="auth-signedout" style={{ display: "flex", flexDirection: "column", gap: ".6rem", margin: "0.8rem 0 0.8rem" }}>
              <button
                id="auth-login-popup"
                className="gsi-material-button"
                type="button"
                aria-label="Sign in with Google"
                style={{ width: "260px" }}
                onClick={handleLogin}
                disabled={isLoginProcessing}
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isLoginProcessing ? "処理中..." : "Sign in with Google"}
                  </span>
                  <span className="gsi-material-button-label">Sign in with Google</span>
                </div>
              </button>
            </div>
          </div>

          {authError && (
            <div id="auth-error" className="text-red-600 text-sm mt-4 text-center font-medium">
              {authError}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ---------------- ログイン済み画面 (アプリ本体) ----------------
  return (
    <div id="app-root">
      {/* ヘッダー */}
      <header className="bg-white shadow-md relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="#" className="text-2xl font-bold text-gray-900 tracking-wide">
              3学年名簿
            </a>

            <div className="relative" ref={menuRef}>
              <button
                id="menu-toggle"
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition duration-150"
                aria-expanded={isMenuOpen}
                aria-controls="user-menu"
                type="button"
                onClick={() => setIsMenuOpen((v) => !v)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>

              {isMenuOpen && (
                <div
                  id="user-menu"
                  className="dropdown-menu absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-30"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="menu-toggle"
                >
                  <div className="p-4 border-b border-gray-100">
                    <p id="user-email" className="text-sm font-semibold text-gray-900 truncate">
                      {user.email || "メールアドレスなし"}
                    </p>
                  </div>
                  <div className="py-2">
                    <button
                      id="auth-chip-logout"
                      className="w-full text-left px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 hover:text-red-700 transition"
                      type="button"
                      onClick={handleLogout}
                    >
                      ログアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        {authError && (
          <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg shadow-sm text-sm font-medium border border-red-200">
            {authError}
          </div>
        )}

        {isDataLoading ? (
          <div className="text-center py-12 text-gray-500 font-medium">データを取得しています...</div>
        ) : (
          <>
            {/* コントロールパネル */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 max-w-7xl mx-auto space-y-4 lg:space-y-0 lg:space-x-6 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
              {/* 検索フィールド */}
              <div className="w-full lg:w-1/3 relative">
                <input
                  type="text"
                  id="search-input"
                  placeholder="名前、番号、クラスで検索"
                  className="w-full p-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-gray-700"
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* ソート */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full lg:w-auto justify-end">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <label htmlFor="sort-criteria" className="text-sm font-medium text-gray-700 whitespace-nowrap">ソート基準:</label>
                  <select
                    id="sort-criteria"
                    className="flex-grow p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    value={sortCriteria}
                    onChange={(e) => setSortCriteria(e.target.value)}
                  >
                    <option value="class">クラス（番号順）</option>
                    <option value="reading">氏名（ふりがな順）</option>
                  </select>
                </div>

                <button
                  id="sort-direction-toggle"
                  className="flex items-center justify-center p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition duration-150 w-full sm:w-auto"
                  onClick={() => setIsAscending((v) => !v)}
                >
                  <svg id="sort-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mr-2 transform transition duration-300 ${isAscending ? "rotate-0" : "rotate-180"}`}>
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                  <span id="sort-label" className="font-semibold">{isAscending ? "昇順" : "降順"}</span>
                </button>
              </div>
            </div>

            {/* クラスジャンプボタン */}
            {!searchTerm && sortCriteria === "class" && (
              <div id="jump-button-container" className="mb-6 flex flex-wrap justify-center gap-3 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                {classNames.map((c) => (
                  <button
                    key={c}
                    onClick={() => scrollToClass(c)}
                    className="px-4 py-1.5 bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 rounded-full text-sm hover:bg-indigo-100 transition shadow-sm"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* カードグリッド */}
            <section id="card-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredSorted.map((p, i) => {
                const showAnchor =
                  sortCriteria === "class" &&
                  !searchTerm &&
                  (i === 0 || filteredSorted[i - 1].class !== p.class);

                return (
                  <div
                    key={i}
                    id={showAnchor ? `class-${p.class}` : undefined}
                    className="p-4 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center text-gray-500 mb-2 border-b border-gray-100 pb-2">
                      <span className="font-semibold text-indigo-600">{p.class}</span>
                      <span className="text-sm font-medium bg-gray-50 px-2 py-0.5 rounded text-gray-600 border border-gray-100">
                        {String(p.number).padStart(3, "0")}番
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{p.reading}</div>
                      <div className="font-bold text-lg text-gray-800">{p.name}</div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* 該当なし表示 */}
            {filteredSorted.length === 0 && !isDataLoading && (
              <div className="text-center py-16 text-gray-400">
                該当する生徒が見つかりません。
              </div>
            )}

            {/* フッター（件数表示） */}
            <footer className="text-center mt-12 text-gray-400 text-sm pb-8">
              <p>
                表示中: <span id="member-count" className="font-semibold">{filteredSorted.length}</span> 名
                <span className="mx-2">|</span>
                全件数: <span id="total-count" className="font-semibold">{profiles.length}</span> 名
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}