'use strict';

/* ============================================================
 * グローバル状態
 * ============================================================ */
let profilesToDisplay = [];        // Firestoreから取得したプロフィール配列（描画元データ）
let currentSearchTerm = '';        // 現在の検索語
let currentSortCriteria = 'class'; // ソート基準（'class' | 'reading'）
let isAscending = true;            // true=昇順 / false=降順
let TOTAL_MEMBER_COUNT = 0;        // 全件数
let CLASS_NAMES = [];              // クラス名一覧（"1組" など）

// 入力のrAF統合用
let rafId = null;
let nextSearchTerm = '';

/* ============================================================
 * DOM 参照
 * ============================================================ */
const $id = (id) => /** @type {HTMLElement|null} */ (document.getElementById(id));

const dom = {
  cardGrid:       null,
  memberCount:    null,
  totalCount:     null,
  jumpContainer:  null,
  searchInput:    null,
  sortCriteria:   null,
  sortBtn:        null,
  sortIcon:       null,
  sortLabel:      null,
};

function bindDomOnce() {
  if (dom.cardGrid) return; // 二重バインド防止
  dom.cardGrid      = $id('card-grid');
  dom.memberCount   = $id('member-count');
  dom.totalCount    = $id('total-count');
  dom.jumpContainer = $id('jump-button-container');
  dom.searchInput   = $id('search-input');
  dom.sortCriteria  = $id('sort-criteria');
  dom.sortBtn       = $id('sort-direction-toggle');
  dom.sortIcon      = $id('sort-icon');
  dom.sortLabel     = $id('sort-label');
}

/* ============================================================
 * Firestore 初期化（動的import）
 * ============================================================ */
async function initFirestore() {
  // index.html の <script id="firebase-config"> から設定を読む
  const cfgTag = document.getElementById('firebase-config');
  if (!cfgTag) throw new Error('firebase-config タグが見つかりません。');
  const cfgText = (cfgTag.textContent || '').trim();
  if (!cfgText) throw new Error('Firebase 設定JSONが空です。');

  const firebaseConfig = JSON.parse(cfgText);

  // Firebase App
  const appMod = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
  const { getApps, getApp, initializeApp } = appMod;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Firestore
  const fsMod = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
  const { getFirestore, doc, getDoc } = fsMod;

  const db = getFirestore(app);
  return { db, doc, getDoc };
}

/* ============================================================
 * ユーティリティ・定数
 * ============================================================ */
const collator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });
const RE_SPACE = /[\s　]+/g;
const RE_KATAKANA = /[\u30A1-\u30F6]/g; // 全角カタカナ → ひらがな

// ジャンプボタンのベースカラー
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

// 文字列正規化（空白削除・カタカナ→ひらがな・小文字化）
function normalizeText(str) {
  if (str == null) return '';
  let result = String(str).replace(RE_SPACE, '');
  result = result.replace(RE_KATAKANA, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
  return result.toLowerCase();
}

/* ============================================================
 * Firestore から名簿取得
 * ============================================================ */
async function fetchProfilesFromFirestore() {
  const { db, doc, getDoc } = await initFirestore();

  const snap = await getDoc(doc(db, 'roster', 'current'));
  if (!snap.exists()) {
    throw new Error('Firestore: roster/current が存在しません。');
  }

  const data = snap.data() || {};
  const students =
    Array.isArray(data.students) ? data.students :
    Array.isArray(data.list)     ? data.list     :
    [];

  const mapped = students.map((item) => {
    const num = Number(item.number);
    const classStr =
      typeof item.class === 'number' ? `${item.class}組`
      : (item.class ? String(item.class) : '');

    const normName    = normalizeText(item.name  || '');
    const normReading = normalizeText(item.kana  || item.reading || '');
    const normClass   = normalizeText(classStr);
    const normNumber  = normalizeText(String(item.number ?? ''));

    return {
      number: Number.isFinite(num) ? num : 0,
      class: classStr,
      name: item.name || '',
      reading: item.kana || item.reading || '',
      searchable: normName + normReading + normNumber + normClass,
      normName, normReading, normClass, normNumber
    };
  });

  return mapped;
}

/* ============================================================
 * 絞り込み・ソート
 * ============================================================ */
function filterProfiles(profiles, searchTerm) {
  if (!searchTerm) return profiles;
  const tokens = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
  if (!tokens.length) return profiles;

  return profiles.filter((profile) =>
    tokens.every((t) =>
      profile.normName.includes(t)   ||
      profile.normReading.includes(t)||
      profile.normClass.includes(t)  ||
      profile.normNumber.includes(t)
    )
  );
}

// クラス → 番号 → ふりがな
function compareByClassThenNumberThenReading(a, b) {
  const ca = Number(String(a.class).replace('組', '')) || 0;
  const cb = Number(String(b.class).replace('組', '')) || 0;
  if (ca !== cb) return ca - cb;

  const na = Number(a.number) || 0;
  const nb = Number(b.number) || 0;
  if (na !== nb) return na - nb;

  return collator.compare(a.reading || '', b.reading || '');
}

// ふりがな → 番号
function compareByReadingThenNumber(a, b) {
  const r = collator.compare(a.reading || '', b.reading || '');
  if (r !== 0) return r;

  const na = Number(a.number) || 0;
  const nb = Number(b.number) || 0;
  return na - nb;
}

function filterAndSort() {
  const filtered = filterProfiles(profilesToDisplay, currentSearchTerm);

  const compareFn = (currentSortCriteria === 'class')
    ? compareByClassThenNumberThenReading
    : compareByReadingThenNumber;

  filtered.sort((a, b) => {
    const base = compareFn(a, b);
    return isAscending ? base : -base;
  });

  return filtered;
}

/* ============================================================
 * カード生成・レンダリング
 * ============================================================ */
function createCardHTML(profile, index, isFirstInClass) {
  const paddedNumber = String(profile.number).padStart(3, '0');
  const classNumber  = String(profile.class).replace('組', '');
  const classClass   = `class-${classNumber}`;
  const jumpId       = isFirstInClass ? `class-start-${classNumber}` : '';

  return `
    <div id="${jumpId}" class="name-card ${classClass} rounded-xl p-4 flex flex-col justify-between">
      <div class="flex justify-between items-start mb-2">
        <span class="class-label">
          ${profile.class}
        </span>
        <span class="text-lg font-mono font-bold text-gray-500">${paddedNumber}</span>
      </div>
      <div>
        <h2 class="text-xl font-extrabold leading-tight">
          ${profile.name}
        </h2>
        <p class="text-sm mt-0.5 italic">
          ${profile.reading}
        </p>
      </div>
    </div>
  `;
}

function buildCardsHTML(sortedProfiles) {
  let htmlString = '';
  let lastClass = null;

  sortedProfiles.forEach((profile, index) => {
    let isFirstInClass = false;

    // クラス順・未検索のときだけジャンプ起点を付ける
    if (currentSortCriteria === 'class' && !currentSearchTerm) {
      if (profile.class !== lastClass) {
        isFirstInClass = true;
        lastClass = profile.class;
      }
    }

    htmlString += createCardHTML(profile, index, isFirstInClass);
  });

  return htmlString;
}

function renderCards(html, displayedCount) {
  if (!dom.cardGrid || !dom.memberCount) return;
  dom.cardGrid.innerHTML = html;
  dom.memberCount.textContent = String(displayedCount);
  updateJumpButtons(displayedCount);
}

// 絞り込み・ソート・レンダリング 一括
function filterAndSortAndRender() {
  const sortedProfiles = filterAndSort();
  const html = buildCardsHTML(sortedProfiles);
  renderCards(html, sortedProfiles.length);
}

/* ============================================================
 * ソートUI
 * ============================================================ */
function updateSortControls() {
  if (!dom.sortIcon || !dom.sortLabel || !dom.sortCriteria) return;

  if (isAscending) {
    dom.sortIcon.classList.remove('rotate-180');
    dom.sortLabel.textContent = '昇順';
  } else {
    dom.sortIcon.classList.add('rotate-180');
    dom.sortLabel.textContent = '降順';
  }

  dom.sortCriteria.value = currentSortCriteria;
}

/* ============================================================
 * クラスジャンプボタン
 * ============================================================ */
function updateJumpButtons(displayedCount) {
  if (!dom.jumpContainer) return;

  // 全件・クラス順・未検索のときだけ表示
  const shouldShow =
    !currentSearchTerm &&
    displayedCount === TOTAL_MEMBER_COUNT &&
    currentSortCriteria === 'class';

  if (!shouldShow) {
    dom.jumpContainer.classList.add('hidden');
    return;
  }

  dom.jumpContainer.classList.remove('hidden');
  dom.jumpContainer.innerHTML = '';

  CLASS_NAMES.forEach((className) => {
    const classNumber = className.replace('組', '');
    const colorInfo = CLASS_BASE_COLORS[classNumber] || { base: '#6B7280', text: '#ffffff' };

    const button = document.createElement('button');
    button.textContent = `▶ ${className}`;
    button.className = 'jump-btn';
    button.style.backgroundColor = colorInfo.base;
    button.style.color = colorInfo.text;
    button.type = 'button';
    button.setAttribute('aria-label', `${className} へジャンプ`);

    button.onclick = () => {
      const targetId = `class-start-${classNumber}`;
      const targetElement = $id(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetElement.focus?.({ preventScroll: true });
      }
    };

    dom.jumpContainer.appendChild(button);
  });
}

/* ============================================================
 * イベント登録
 * ============================================================ */
function setupEventListeners() {
  // 検索
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', (e) => {
      scheduleRender(e.target.value);
    }, { passive: true });
  }

  // ソート条件変更
  if (dom.sortCriteria) {
    dom.sortCriteria.addEventListener('change', (e) => {
      currentSortCriteria = e.target.value;
      filterAndSortAndRender();
    });
  }

  // 昇順/降順トグル
  if (dom.sortBtn) {
    dom.sortBtn.addEventListener('click', () => {
      isAscending = !isAscending;
      updateSortControls();
      filterAndSortAndRender();
    });
  }
}

/* ============================================================
 * rAF による入力反映
 * ============================================================ */
function scheduleRender(term) {
  nextSearchTerm = term;
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    currentSearchTerm = (nextSearchTerm || '').trim();
    filterAndSortAndRender();
  });
}

/* ============================================================
 * データ読み込みと初期化
 * ============================================================ */
async function loadDataAndInitialize() {
  bindDomOnce();

  // 初期表示を0でクリア
  if (dom.totalCount) dom.totalCount.textContent = '0';

  try {
    profilesToDisplay = await fetchProfilesFromFirestore();

    // クラス一覧を作成
    const classSet = new Set();
    profilesToDisplay.forEach((p) => classSet.add(p.class));
    CLASS_NAMES = Array.from(classSet).sort((a, b) => {
      const na = Number(String(a).replace('組', ''));
      const nb = Number(String(b).replace('組', ''));
      return na - nb;
    });

    // 件数反映
    TOTAL_MEMBER_COUNT = profilesToDisplay.length;
    if (dom.totalCount) dom.totalCount.textContent = String(TOTAL_MEMBER_COUNT);

    // UI
    setupEventListeners();
    updateSortControls();
    filterAndSortAndRender();
  } catch (err) {
    console.error('Firestore 読み込みエラー:', err);

    // 失敗時は空でUIのみ
    profilesToDisplay = [];
    CLASS_NAMES = [];
    TOTAL_MEMBER_COUNT = 0;
    if (dom.totalCount) dom.totalCount.textContent = '0';

    setupEventListeners();
    updateSortControls();
    filterAndSortAndRender();
  }
}

/* ============================================================
 * アプリ起動（認証後に一度だけ）
 * ============================================================ */
let __appStarted = false;
function startOnce() {
  if (__appStarted) return;
  __appStarted = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDataAndInitialize, { once: true });
  } else {
    loadDataAndInitialize();
  }
}

// 認証側から呼ばれる用
window.startApp = startOnce;

// フォールバック（カスタムイベント）
window.addEventListener('auth:signedin', startOnce);
