// src/App.jsx

// コンポーネントのインポート
import Header from "./components/Header";
import AuthGate from "./components/AuthGate";
import CardGrid from "./components/CardGrid";

// カスタムフックのインポート
import { useRoster } from "./hooks/useRoster";

// アプリのメインコンポーネント
export default function App() {
  const { user, profiles, authError, isAuthLoading, handleLogin, handleLogout } = useRoster();
  if (user === undefined) {
    return null;
  }

  // ===== 認証ゲート =====
  if (!user) {
    return (
      <AuthGate
        handleLogin={handleLogin}
        isAuthLoading={isAuthLoading}
        authError={authError}
      />
    );
  }

  // ===== アプリ本体 =====
  return (
    <div id="app-root" className="bg-slate-50 min-h-screen">
      <Header user={user} handleLogout={handleLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CardGrid profiles={profiles} />
      </main>
    </div>
  );
}