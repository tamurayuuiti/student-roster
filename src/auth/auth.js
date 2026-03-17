// ============================================================
// Firebase v9 Modular SDK を使用した認証処理（改善版）
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* ============================================================
 * ユーティリティ
 * ============================================================ */
const $ = (id) => document.getElementById(id);

const log = (msg) => {
  const t = new Date().toLocaleTimeString();
  console.log(`[${t}] ${msg}`);
};

// エラーメッセージ表示設定
function setError(message = "") {
  const el = $("auth-error");
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.style.display = "block";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
}

/* ============================================================
 * Firebase 設定読み込み
 * ============================================================ */
function readFirebaseConfig() {
  try {
    const el = $("firebase-config");
    if (!el) throw new Error("firebase-config タグが見つかりません。");

    const text = (el.textContent || "").trim();
    if (!text || !text.startsWith("{")) {
      throw new Error("Firebase設定JSONを貼り付けてください。");
    }

    const cfg = JSON.parse(text);
    const required = ["apiKey", "authDomain", "projectId", "appId"];
    for (const k of required) {
      if (!cfg[k] || typeof cfg[k] !== "string" || !cfg[k].trim()) {
        throw new Error(`設定が不完全です（${k} が空）。`);
      }
    }
    return cfg;
  } catch (e) {
    document.documentElement.setAttribute("data-auth", "signedout");
    setError("設定エラー：Firebase設定JSONを見直してください。");
    log(`config error: ${e?.message ?? e}`);
    throw e;
  }
}

/* ============================================================
 * Firebase 初期化
 * ============================================================ */
const firebaseConfig = readFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ブラウザの言語を優先
auth.useDeviceLanguage?.();

/* ============================================================
 * 永続セッション設定
 * ============================================================ */
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    log("persistence: local");
  } catch (e) {
    log(`setPersistence error: ${e?.code ?? ""} ${e?.message ?? e}`);
    setError("ブラウザの設定によりログイン状態の保存に失敗しました。");
  }
})();

/* ============================================================
 * DOM 参照
 * ============================================================ */
// 認証ゲート周り
const signedOutBox = $("auth-signedout");
const signedInBox  = $("auth-signedin");
const subtitle     = $("auth-subtitle");
const statusEl     = $("auth-data");

// ヘッダーメニュー周り
const menuToggle   = $("menu-toggle");
const userMenu     = $("user-menu");
const userEmailEl  = $("user-email");
const headerLogout = $("auth-chip-logout");

// 認証後にゲートに留めるか（true: 本体へ遷移しない）
const HOLD_AFTER_LOGIN = false;

// サブタイトル初期文言（初回のみ保存）
if (!window.__defaultSubtitleText) {
  window.__defaultSubtitleText =
    subtitle?.textContent || "Googleアカウントでサインインしてください。";
}

/* ============================================================
 * ヘッダーメニュー操作
 * ============================================================ */
function openMenu() {
  if (!userMenu) return;
  userMenu.classList.remove("hidden", "hidden-menu", "opacity-0", "pointer-events-none");
  menuToggle?.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  if (!userMenu) return;
  userMenu.classList.add("hidden-menu", "opacity-0", "pointer-events-none");
  setTimeout(() => {
    if (userMenu.classList.contains("hidden-menu")) {
      userMenu.classList.add("hidden");
    }
  }, 200);
  menuToggle?.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  if (!userMenu) return;
  const isHidden =
    userMenu.classList.contains("hidden") || userMenu.classList.contains("hidden-menu");
  if (isHidden) openMenu();
  else closeMenu();
}

/* ============================================================
 * UI 更新ヘルパー
 * ============================================================ */
function showSignedInUI(user) {
  document.documentElement.setAttribute("data-auth", "signedin");

  if (signedOutBox) signedOutBox.style.display = "none";
  if (signedInBox)  signedInBox.style.display  = "block";

  if (statusEl) {
    statusEl.textContent = "状態: 認証済み";
    statusEl.classList.remove("err");
    statusEl.classList.add("ok");
  }

  if (subtitle) {
    subtitle.style.display = "";
    subtitle.textContent = "ログイン状態はこのブラウザに保存されます。";
  }

  if (menuToggle) menuToggle.style.display = "inline-flex";
  if (userEmailEl) userEmailEl.textContent = user.email ?? "(no email)";

  closeMenu();
}

function showSignedOutUI() {
  document.documentElement.setAttribute("data-auth", "signedout");

  if (signedInBox)  signedInBox.style.display  = "none";
  if (signedOutBox) signedOutBox.style.display = "block";

  if (statusEl) {
    statusEl.textContent = "状態: 未認証";
    statusEl.classList.remove("ok");
    statusEl.classList.add("err");
  }

  if (subtitle) {
    subtitle.style.display = "";
    subtitle.textContent = window.__defaultSubtitleText;
  }

  // サインアウト時にメール表示をクリア
  if (userEmailEl) userEmailEl.textContent = "";

  closeMenu();
  if (menuToggle) menuToggle.style.display = "none";
}

/* ============================================================
 * 認証状態の監視（改善版）
 * ============================================================ */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 古いエラーはここで一度消す
    setError("");

    // ------------------------------------------
    // ゲートに留めるモード
    // ------------------------------------------
    if (HOLD_AFTER_LOGIN) {
      if (statusEl) {
        statusEl.textContent = "状態: 認証済み";
        statusEl.classList.remove("err");
        statusEl.classList.add("ok");
      }
      if (subtitle) {
        subtitle.style.display = "";
        subtitle.textContent = "サインイン済みです。この画面でログアウトできます。";
      }
      if (signedOutBox) signedOutBox.style.display = "none";
      if (signedInBox)  signedInBox.style.display  = "block";
      if (menuToggle)   menuToggle.style.display   = "none";
      closeMenu();
      return;
    }

    // ------------------------------------------
    // 通常フロー
    // ------------------------------------------
    showSignedInUI(user);
    if (typeof window.startApp === "function") {
      window.startApp();
    } else {
      window.dispatchEvent(new CustomEvent("auth:signedin", { detail: { user } }));
    }
  } else {
    // 未ログイン
    showSignedOutUI();
    // サインアウト時も「以前の失敗メッセージ」は消す
    setError("");
  }
});

/* ============================================================
 * イベントバインド：ログイン（連打防止付き）
 * ============================================================ */
$("auth-login-popup")?.addEventListener("click", async (ev) => {
  /** @type {HTMLButtonElement|null} */
  const btn = ev.currentTarget instanceof HTMLButtonElement ? ev.currentTarget : null;

  try {
    setError("");

    // 連打防止
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;

    log("popup login: start");
    await signInWithPopup(auth, provider);

    // 成功
  } catch (e) {
    log(`signInWithPopup error: ${e?.code ?? ""} ${e?.message ?? e}`);
    setError("ログインに失敗しました。APIキーと許可ドメイン、ポップアップ許可を確認してください。");
  } finally {
    if (btn) btn.disabled = false;
  }
});

/* ============================================================
 * イベントバインド：ログアウト
 * ============================================================ */
$("auth-logout")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    log("signed out");
  } catch (e) {
    log(`signOut error: ${e?.code ?? ""} ${e?.message ?? e}`);
    setError("ログアウト処理でエラーが発生しました。もう一度お試しください。");
  }
});

// ヘッダードロップダウン内のログアウト
headerLogout?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    closeMenu();
    log("signed out (from header)");
  } catch (e) {
    log(`signOut error: ${e?.code ?? ""} ${e?.message ?? e}`);
    setError("ログアウト処理でエラーが発生しました。もう一度お試しください。");
  }
});

/* ============================================================
 * イベントバインド：ヘッダーメニュー
 * ============================================================ */
menuToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleMenu();
});

// メニュー外クリックで閉じる
document.addEventListener("click", (e) => {
  if (!userMenu || !menuToggle) return;
  const target = e.target;
  const clickInside = userMenu.contains(target) || menuToggle.contains(target);
  const alreadyHidden =
    userMenu.classList.contains("hidden") || userMenu.classList.contains("hidden-menu");
  if (!clickInside && !alreadyHidden) closeMenu();
});

// Esc キーで閉じる
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
