// src/components/CardGrid.jsx

import { useState, useRef, useMemo } from "react";
import { normalizeText } from "../utils/normalize";
import StudentCard from "./StudentCard";

// クラス別の固有色定義
const GROUP_THEMES = {
  "1": { base: "var(--color-group-1)", text: "var(--color-text-main)" },
  "2": { base: "var(--color-group-2)", text: "var(--color-white)" },
  "3": { base: "var(--color-group-3)", text: "var(--color-white)" },
  "4": { base: "var(--color-group-4)", text: "var(--color-white)" },
  "5": { base: "var(--color-group-5)", text: "var(--color-text-main)" },
  "6": { base: "var(--color-group-6)", text: "var(--color-white)" },
  "7": { base: "var(--color-group-7)", text: "var(--color-white)" },
  "8": { base: "var(--color-group-8)", text: "var(--color-white)" }
};

const collator = new Intl.Collator("ja", { sensitivity: "base", numeric: true });

// クラス、番号、ふりがなの順で比較
function compareByClassThenNumberThenReading(a, b) {
  const ca = Number(String(a.class).replace("組", "")) || 0;
  const cb = Number(String(b.class).replace("組", "")) || 0;
  if (ca !== cb) return ca - cb;

  const na = Number(a.number) || 0;
  const nb = Number(b.number) || 0;
  if (na !== nb) return na - nb;

  return collator.compare(a.reading || "", b.reading || "");
}

// ふりがな、番号の順で比較
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

  // 検索入力
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

  // フィルタ＆ソート
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

    const compareFn =
      sortCriteria === "class"
        ? compareByClassThenNumberThenReading
        : compareByReadingThenNumber;

    return [...filtered].sort((a, b) => {
      const base = compareFn(a, b);
      return isAscending ? base : -base;
    });
  }, [profiles, searchTerm, sortCriteria, isAscending]);

  // クラス一覧
  const classNamesList = useMemo(() => {
    const classSet = new Set();
    profiles.forEach((p) => classSet.add(p.class));

    return Array.from(classSet).sort((a, b) => {
      const na = Number(String(a).replace("組", ""));
      const nb = Number(String(b).replace("組", ""));
      return na - nb;
    });
  }, [profiles]);

  // ジャンプボタン表示判定
  const shouldShowJumpButtons =
    !searchTerm &&
    sortedAndFilteredProfiles.length === profiles.length &&
    sortCriteria === "class";

  // スクロール
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
      {/* コントロール */}
      <div className="
        flex flex-col lg:flex-row
        justify-between items-start lg:items-center

        max-w-7xl mx-auto
        p-4

        space-y-4 lg:space-y-0 lg:space-x-6

        mb-4

        bg-(--color-white)
        rounded-2xl
        shadow-(--shadow-card)
        border border-border-light
      ">
        <div className="w-full lg:w-1/3 relative">
          <input
            type="text"
            id="search-input"
            value={inputValue}
            onChange={handleSearchInput}
            placeholder="名前、番号、クラスで検索"
            className="
              w-full

              p-2 pl-10

              border border-border-light
              rounded-lg
              shadow-sm

              text-text-main
              bg-transparent

              focus:ring focus:ring-primary-ring
              focus:border-primary

              transition duration-150
            "
          />

          <svg
            className="
              absolute left-3 top-1/2
              transform -translate-y-1/2

              h-5 w-5

              text-text-sub
            "
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0 1 14 0z" />
          </svg>
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full lg:w-auto justify-end">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <label htmlFor="sort-criteria" className="text-sm font-medium text-text-main whitespace-nowrap">
              ソート基準:
            </label>

            <select
              id="sort-criteria"
              value={sortCriteria}
              onChange={(e) => setSortCriteria(e.target.value)}
              className="
                grow

                p-2

                border border-border-light
                rounded-lg
                shadow-sm

                text-text-main
                bg-transparent

                focus:ring focus:ring-primary-ring
                focus:border-primary

                transition duration-150
              "
            >
              <option value="class">クラス（番号順）</option>
              <option value="reading">氏名（ふりがな順）</option>
            </select>
          </div>

          <button
            id="sort-direction-toggle"
            onClick={() => setIsAscending(!isAscending)}
            className="
              flex items-center justify-center

              p-2
              w-full sm:w-auto

              bg-primary text-(--color-white)
              rounded-lg
              shadow-(--shadow-btn)

              cursor-pointer

              hover:bg-primary-hover

              focus:outline-none
              focus:ring-4 focus:ring-primary-ring

              transition duration-150
            "
          >
            <svg
              id="sort-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`
                mr-2

                transform
                transition duration-300

                ${isAscending ? "rotate-0" : "rotate-180"}
              `}
            >
              <path d="m18 15-6-6-6 6" />
            </svg>

            <span id="sort-label" className="font-semibold">
              {isAscending ? "昇順" : "降順"}
            </span>
          </button>
        </div>
      </div>

      {/* ジャンプボタン */}
      <div
        id="jump-button-container"
        className={`
          mb-6

          flex flex-wrap justify-center
          gap-3 p-4

          bg-(--color-white)
          rounded-2xl
          shadow-(--shadow-card)
          border border-border-light

          ${shouldShowJumpButtons ? "" : "hidden"}
        `}
      >
        {classNamesList.map((className) => {
          const classNumber = className.replace("組", "");
          const colorInfo =
            GROUP_THEMES[classNumber] || { base: "#6B7280", text: "#ffffff" };

          return (
            <button
              key={className}
              type="button"
              className="
                inline-flex items-center gap-2

                py-2 px-3.5

                rounded-full
                border border-border-light
                shadow-(--shadow-btn)

                font-bold text-[0.9rem] text-(--btn-text)
                bg-(--btn-bg)

                cursor-pointer

                transition-all duration-150 ease-out
                hover:-translate-y-0.5 hover:opacity-95
                motion-reduce:transition-none motion-reduce:transform-none
              "
              style={{
                "--btn-bg": colorInfo.base,
                "--btn-text": colorInfo.text
              }}
              aria-label={`${className} へジャンプ`}
              onClick={() => handleJump(classNumber)}
            >
              ▶ {className}
            </button>
          );
        })}
      </div>

      {/* 件数 */}
      <div className="flex justify-end mb-2 text-sm text-text-sub font-medium">
        表示件数:
        <span id="member-count" className="mx-1 text-text-main">
          {sortedAndFilteredProfiles.length}
        </span>
        /
        <span id="total-count" className="ml-1">
          {profiles.length}
        </span>
      </div>

      {/* グリッド */}
      <div id="card-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sortedAndFilteredProfiles.map((profile, index) => {
          let isFirstInClass = false;

          if (sortCriteria === "class" && !searchTerm) {
            if (profile.class !== lastClass) {
              isFirstInClass = true;
              lastClass = profile.class;
            }
          }

          const classNumber = String(profile.class).replace("組", "");
          const jumpId = isFirstInClass ? `class-start-${classNumber}` : undefined;

          return (
            <StudentCard
              key={`${profile.class}-${profile.number}-${index}`}
              profile={profile}
              jumpId={jumpId}
            />
          );
        })}
      </div>
    </>
  );
}