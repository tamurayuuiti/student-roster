import React, { useState, useRef, useMemo } from "react";

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

// App.jsxでも使用するためexport
export function normalizeText(str) {
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

export default function CardGrid({ profiles }) {
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCriteria, setSortCriteria] = useState("class");
  const [isAscending, setIsAscending] = useState(true);

  const rAFRef = useRef(null);
  const nextSearchTermRef = useRef("");

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    nextSearchTermRef.current = val;

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

  let lastClass = null;

  return (
    <>
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

      {/* 件数表示 */}
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
    </>
  );
}