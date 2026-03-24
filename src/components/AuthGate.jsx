// src/components/AuthGate.jsx

const DEFAULT_SUBTITLE = "このページを利用するには、Googleアカウントでサインインしてください。";

export default function AuthGate({ user, handleLogin, isAuthLoading, authError }) {
  // ログイン済み（userが存在する）場合は、このゲート自体を表示しない
  if (user) return null;

  return (
    <section
      id="auth-gate"
      aria-live="polite"
      style={{
        "--auth-gradient": "radial-gradient(1200px 600px at 10% -10%, #eef2ff 0%, transparent 60%), radial-gradient(900px 500px at 110% 10%, #dbeafe 0%, transparent 55%), var(--color-auth-bg)"
      }}
      className={`
        min-h-screen grid place-items-center p-5
        bg-(--auth-gradient) font-(--font-sans)
      `}
    >
      <div className={`
        w-[min(420px,100%)] bg-auth-card rounded-2xl 
        pt-4.5 px-4 pb-4 
        shadow-(--shadow-auth-card) border border-auth-card-border backdrop-blur-[2px] 
        transition-all duration-200 ease-in-out motion-reduce:transition-none
        hover:shadow-(--shadow-auth-card-hover) hover:-translate-y-px
      `}>
        
        <h1 className="flex justify-center items-center gap-2 mb-1.5 text-[1.15rem] font-bold tracking-[0.01em] text-text-main">
          ログイン
        </h1>
        
        <p id="auth-subtitle" className="mb-3 text-auth-muted text-[0.86rem] text-center">
          {DEFAULT_SUBTITLE}
        </p>

        <div className="flex justify-center" id="auth-signedout">
          <button
            id="auth-login-popup"
            type="button"
            onClick={handleLogin}
            disabled={isAuthLoading}
            style={{ width: "260px" }}
            className={`
              gsi-material-button flex items-center justify-center space-x-2 
              border border-gray-300 rounded px-4 py-2 transition motion-reduce:transition-none
              hover:bg-gray-50
            `}
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

        {authError && (
          <div 
            id="auth-error" 
            className={`
              block mt-3 py-2 px-3
              bg-auth-danger-bg border border-auth-danger-border 
              rounded-lg text-danger text-[0.85rem] text-center wrap-break-word
            `}
          >
            {authError}
          </div>
        )}
      </div>
    </section>
  );
}