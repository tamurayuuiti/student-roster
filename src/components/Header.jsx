// src/components/Header.jsx

import { useState, useEffect, useRef } from "react";

export default function Header({ user, handleLogout }) {
  const [menuState, setMenuState] = useState("closed");
  const menuRef = useRef(null);
  const menuToggleRef = useRef(null);

  // メニューUI制御
  useEffect(() => {
    if (menuState === "closing") {
      const timer = setTimeout(() => setMenuState("closed"), 200);
      return () => clearTimeout(timer);
    }
  }, [menuState]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuState !== "open") return;
      if (
        menuRef.current?.contains(e.target) ||
        menuToggleRef.current?.contains(e.target)
      ) {
        return;
      }
      setMenuState("closing");
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && menuState === "open") {
        setMenuState("closing");
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuState]);

  const toggleMenu = () => {
    setMenuState((prev) =>
      prev === "closed" || prev === "closing" ? "open" : "closing"
    );
  };

  return (
    <header className="bg-(--color-white) shadow-sm mb-4 md:mb-6 p-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <a
            href="#"
            className="text-2xl font-bold text-gray-900 tracking-wide no-underline"
          >
            3学年名簿
          </a>

          <div className="relative flex items-center gap-2 bg-transparent border-0 shadow-none p-0">
            <div className="relative">
              <button
                id="menu-toggle"
                ref={menuToggleRef}
                onClick={toggleMenu}
                type="button"
                aria-expanded={menuState === "open"}
                aria-controls="user-menu"
                className="flex items-center justify-center w-10 h-10 rounded-full text-blue-900 hover:bg-gray-100 transition-colors duration-150 motion-reduce:transition-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-7 h-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </div>

            <div
              id="user-menu"
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="menu-toggle"
              className={`
                absolute right-0 top-full mt-2 w-64
                bg-(--color-white) border border-gray-200
                rounded-xl shadow-xl z-30 origin-top-right
                transition-all duration-200 ease-out motion-reduce:transition-none
                ${
                  menuState === "open"
                    ? "scale-100 opacity-100 pointer-events-auto"
                    : "scale-90 opacity-0 pointer-events-none"
                }
                ${menuState === "closed" ? "hidden" : ""}
              `}
            >
              <div className="p-4 border-b border-gray-100">
                <p
                  id="user-email"
                  className="text-sm font-semibold text-gray-900 truncate"
                >
                  {user?.email || "(no email)"}
                </p>
              </div>

              <div className="py-2">
                <button
                  id="auth-chip-logout"
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 hover:text-red-700 transition"
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