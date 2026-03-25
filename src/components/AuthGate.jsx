// src/components/AuthGate.jsx

const DEFAULT_SUBTITLE = "このページを利用するには、Googleアカウントでサインインしてください。";

export default function AuthGate({ user, handleLogin, isAuthLoading, authError }) {
  // ログイン済み（userが存在する）場合は、このゲート自体を表示しない
  if (user) return null;

  return (
    <section 
      id="auth-gate" 
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-900/5 sm:p-10">
        
        {/* ヘッダー・タイポグラフィ領域 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            ログイン
          </h1>
          <p id="auth-subtitle" className="mt-2 text-sm leading-6 text-gray-500">
            {DEFAULT_SUBTITLE}
          </p>
        </div>

        {/* Googleボタン領域（構造・独自クラス完全維持） */}
        <div className="mt-8 flex justify-center" id="auth-signedout">
          <button
            id="auth-login-popup"
            type="button"
            onClick={handleLogin}
            disabled={isAuthLoading}
            style={{ width: "260px" }}
            className={`
              gsi-material-button flex items-center justify-center space-x-2 
              border border-gray-300 rounded px-4 py-2 transition motion-reduce:transition-none
              hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <div className="gsi-material-button-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="block h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </div>
            <span className="gsi-material-button-contents font-medium text-gray-700">
              Sign in with Google
            </span>
          </button>
        </div>

        {/* エラーメッセージ領域 */}
        {authError && (
          <div 
            id="auth-error" 
            role="alert"
            className="mt-6 rounded-md bg-red-50 p-4 text-center text-sm font-medium text-red-600 ring-1 ring-inset ring-red-500/10 wrap-break-word"
          >
            {authError}
          </div>
        )}
      </div>
    </section>
  );
}