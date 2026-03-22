import React, { useState, useEffect, useRef } from "react";

export default function Header({ user, handleLogout }) {
  const [menuState, setMenuState] = useState("closed"); // 'open', 'closing', 'closed'
  const menuRef = useRef(null);
  const menuToggleRef = useRef(null);

  // メニューUI制御 (外側クリック・Escキー、アニメーション制御)
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

  return (
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
  );
}