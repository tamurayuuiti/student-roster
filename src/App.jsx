import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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

/* ============================================================
 * 定数・ユーティリティ
 * ============================================================ */
const HOLD_AFTER_LOGIN = false;
const DEFAULT_SUBTITLE = "このページを利用するには、Googleアカウントでサインインしてください。";

const CLASS_BASE_COLORS = {
  "1": { base: "#e0e0e0", text: "#111827" },
  "2": { base: "#222222", text: "#ffffff" },
  "3": { base: "#e53935", text: "#ffffff" },
  "4": { base: "#2196f3", text: "#ffffff" },
  "5": { base: "#fbc02d", text: "#111827" },
  "6": { base: "#43a047", text: "#ffffff" },
  "7": { base: "#ff9800", text: "#ffffff" },
  "8": { base: "#f06292", text: "#ffffff" }
};

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
  const ca = Number(String(a.class).replace("組", "")) || 0;
  const cb = Number(String(b.class).replace("組", "")) || 0;
  if (ca !== cb) return ca - cb;

  const na = Number(a.number) || 0;
  const nb = Number(b.number) || 0;
  if (na !== nb) return na - nb;

  return collator.compare(a.reading || "", b.reading || "");
}

function compareByReadingThenNumber(a, b) {
  const r = collator.compare(a.reading || "", b.reading || "");
  if (r !== 0) return r;

  const na = Number(a.number) || 0;
  const nb = Number(b.number) || 0;
  return na - nb;
}

/* ============================================================
 * メインコンポーネント
 * ============================================================ */
export default function App() {
  // --- 認証状態 ---
  const [user, setUser] = useState(undefined); // undefined = loading
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- UI状態 ---
  const [menuState, setMenuState] = useState("closed"); // 'open', 'closing', 'closed'

  // --- データ状態 ---
  const [profiles, setProfiles] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCriteria, setSortCriteria] = useState("class");
  const [isAscending, setIsAscending] = useState(true);

  const menuRef = useRef(null);
  const menuToggleRef = useRef(null);
  const rAFRef = useRef(null);
  const nextSearchTermRef = useRef("");

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

  // ------------------------------------------------------------
  // メニューUI制御 (外側クリック・Escキー、アニメーション制御)
  // ------------------------------------------------------------
  useEffect(() => {
    if (menuState === "closing") {
      const timer = setTimeout(() => setMenuState("closed"), 200);
      return () => clearTimeout(timer);
    }
  }, [menuState]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuState !== "open") return;
      if (menuRef.current?.contains(e.target) || menuToggleRef.current?.contains(e.target)) return;
      setMenuState("closing");
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && menuState === "open") setMenuState("closing");
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuState]);

  const toggleMenu = () => {
    setMenuState(prev => (prev === "closed" || prev === "closing" ? "open" : "closing"));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuState("closed");
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
  // フィルタリング・ソート ロジック
  // ------------------------------------------------------------
  const handleSearchInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    nextSearchTermRef.current = val;

    // rAFによる入力反映(App.js完全移植)
    if (rAFRef.current !== null) return;
    rAFRef.current = requestAnimationFrame(() => {
      rAFRef.current = null;
      setSearchTerm(nextSearchTermRef.current.trim());
    });
  };

  const sortedAndFilteredProfiles = useMemo(() => {
    let filtered = profiles;
    if (searchTerm) {
      const tokens = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
      filtered = profiles.filter((profile) =>
        tokens.every((t) =>
          profile.normName.includes(t) ||
          profile.normReading.includes(t) ||
          profile.normClass.includes(t) ||
          profile.normNumber.includes(t)
        )
      );
    }

    const compareFn = sortCriteria === "class" ? compareByClassThenNumberThenReading : compareByReadingThenNumber;
    return [...filtered].sort((a, b) => {
      const base = compareFn(a, b);
      return isAscending ? base : -base;
    });
  }, [profiles, searchTerm, sortCriteria, isAscending]);

  // クラスジャンプ用の一覧取得
  const classNamesList = useMemo(() => {
    const classSet = new Set();
    profiles.forEach((p) => classSet.add(p.class));
    return Array.from(classSet).sort((a, b) => {
      const na = Number(String(a).replace("組", ""));
      const nb = Number(String(b).replace("組", ""));
      return na - nb;
    });
  }, [profiles]);

  const shouldShowJumpButtons = !searchTerm && sortedAndFilteredProfiles.length === profiles.length && sortCriteria === "class";

  const handleJump = (classNumber) => {
    const targetElement = document.getElementById(`class-start-${classNumber}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      targetElement.focus?.({ preventScroll: true });
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
      <section id="auth-gate" aria-live="polite" className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gray-100">
        <div className="auth-card max-w-md w-full bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="text-xl font-bold text-slate-900 tracking-tight mb-2 text-center">
            ログイン
          </div>
          <p id="auth-subtitle" className="text-slate-500 text-sm mb-4 text-center">
            {user && HOLD_AFTER_LOGIN ? "サインイン済みです。この画面でログアウトできます。" : DEFAULT_SUBTITLE}
          </p>

          {!user ? (
            <div className="flex justify-center" id="auth-signedout">
              <button
                id="auth-login-popup"
                className="gsi-material-button flex items-center justify-center space-x-2 border border-gray-300 rounded hover:bg-gray-50 transition px-4 py-2"
                type="button"
                onClick={handleLogin}
                disabled={isAuthLoading}
                style={{ width: "260px" }}
              >
                <div className="gsi-material-button-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-medium text-gray-700">Sign in with Google</span>
              </button>
            </div>
          ) : (
            <div id="auth-signedin" className="mt-2 text-center">
              <div id="auth-data" className="auth-meta mb-2 text-green-600 font-bold">状態: 認証済み</div>
              <button id="auth-logout" onClick={handleLogout} className="auth-logout text-red-600 font-medium underline mt-1">
                ログアウト
              </button>
            </div>
          )}

          {authError && (
            <div id="auth-error" className="text-red-600 text-sm mt-4 text-center font-medium block">
              {authError}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ===== アプリ本体 =====
  let lastClass = null;

  return (
    <div id="app-root" className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="#" className="text-2xl font-bold text-gray-900 tracking-wide">
              3学年名簿
            </a>

            <div className="relative">
              <button
                id="menu-toggle"
                ref={menuToggleRef}
                onClick={toggleMenu}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition duration-150"
                aria-expanded={menuState === "open"}
                aria-controls="user-menu"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>

              <div
                id="user-menu"
                ref={menuRef}
                className={`dropdown-menu absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-30 transition-opacity duration-200 ${
                  menuState === "open" ? "opacity-100" : "hidden-menu opacity-0 pointer-events-none"
                } ${menuState === "closed" ? "hidden" : ""}`}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-toggle"
              >
                <div className="p-4 border-b border-gray-100">
                  <p id="user-email" className="text-sm font-semibold text-gray-900 truncate">
                    {user?.email || "(no email)"}
                  </p>
                </div>
                <div className="py-2">
                  <button
                    id="auth-chip-logout"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 hover:text-red-700 transition"
                    type="button"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* コントロールパネル */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 max-w-7xl mx-auto space-y-4 lg:space-y-0 lg:space-x-6 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="w-full lg:w-1/3 relative">
            <input
              type="text"
              id="search-input"
              value={inputValue}
              onChange={handleSearchInput}
              placeholder="名前、番号、クラスで検索"
              className="w-full p-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-gray-700"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full lg:w-auto justify-end">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <label htmlFor="sort-criteria" className="text-sm font-medium text-gray-700 whitespace-nowrap">ソート基準:</label>
              <select
                id="sort-criteria"
                value={sortCriteria}
                onChange={(e) => setSortCriteria(e.target.value)}
                className="flex-grow p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
              >
                <option value="class">クラス（番号順）</option>
                <option value="reading">氏名（ふりがな順）</option>
              </select>
            </div>

            <button
              id="sort-direction-toggle"
              onClick={() => setIsAscending(!isAscending)}
              className="flex items-center justify-center p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition duration-150 w-full sm:w-auto"
            >
              <svg id="sort-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mr-2 transform transition duration-300 ${isAscending ? "rotate-0" : "rotate-180"}`}>
                <path d="m18 15-6-6-6 6" />
              </svg>
              <span id="sort-label" className="font-semibold">{isAscending ? "昇順" : "降順"}</span>
            </button>
          </div>
        </div>

        {/* クラスジャンプボタン */}
        <div id="jump-button-container" className={`mb-6 flex flex-wrap justify-center gap-3 p-4 bg-white rounded-xl shadow-lg border border-gray-100 ${shouldShowJumpButtons ? "" : "hidden"}`}>
          {classNamesList.map((className) => {
            const classNumber = className.replace("組", "");
            const colorInfo = CLASS_BASE_COLORS[classNumber] || { base: "#6B7280", text: "#ffffff" };
            return (
              <button
                key={className}
                type="button"
                className="jump-btn px-4 py-2 rounded font-bold shadow-sm transition hover:opacity-80"
                style={{ backgroundColor: colorInfo.base, color: colorInfo.text }}
                aria-label={`${className} へジャンプ`}
                onClick={() => handleJump(classNumber)}
              >
                ▶ {className}
              </button>
            );
          })}
        </div>

        {/* 件数表示（暗黙的に存在するカウンター要素の補完） */}
        <div className="flex justify-end mb-2 text-sm text-gray-500 font-medium">
          表示件数: <span id="member-count" className="mx-1 text-gray-900">{sortedAndFilteredProfiles.length}</span> / <span id="total-count" className="ml-1">{profiles.length}</span>
        </div>

        {/* カードグリッド */}
        <div id="card-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedAndFilteredProfiles.map((profile, index) => {
            let isFirstInClass = false;
            if (sortCriteria === "class" && !searchTerm) {
              if (profile.class !== lastClass) {
                isFirstInClass = true;
                lastClass = profile.class;
              }
            }

            const paddedNumber = String(profile.number).padStart(3, "0");
            const classNumber = String(profile.class).replace("組", "");
            const jumpId = isFirstInClass ? `class-start-${classNumber}` : undefined;

            return (
              <div
                key={`${profile.class}-${profile.number}-${index}`}
                id={jumpId}
                className={`name-card class-${classNumber} bg-white shadow-md border border-gray-100 rounded-xl p-4 flex flex-col justify-between`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="class-label text-sm font-bold bg-gray-200 px-2 py-1 rounded">
                    {profile.class}
                  </span>
                  <span className="text-lg font-mono font-bold text-gray-500">{paddedNumber}</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold leading-tight">
                    {profile.name}
                  </h2>
                  <p className="text-sm mt-0.5 italic text-gray-600">
                    {profile.reading}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}