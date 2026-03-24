// src/App.jsx

// コンポーネントのインポート
import Header from "./components/Header";
import AuthGate, { HOLD_AFTER_LOGIN } from "./components/AuthGate";
import CardGrid from "./components/CardGrid";

// カスタムフックのインポート
import { useRoster } from "./hooks/useRoster";

export default function App() {
  // カスタムフックから必要な状態と関数を取得
  const { user, profiles, authError, isAuthLoading, handleLogin, handleLogout } = useRoster();

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
    <div id="app-root" className="bg-bg-main min-h-screen">
      <Header user={user} handleLogout={handleLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CardGrid profiles={profiles} />
      </main>
    </div>
  );
}