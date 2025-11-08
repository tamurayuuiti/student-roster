# student-roster

簡潔な学校名簿アプリです。Google アカウントでサインインすると Firestore から名簿を読み込み、カード一覧・検索・ソート・クラスジャンプが利用できます。

## 主なファイル
- [index.html](index.html) — アプリ本体の HTML（Firebase 設定を内包）
- [app.js](app.js) — 名簿取得・レンダリング・UI ロジック
- [styles.css](styles.css) — アプリ固有のスタイル
- [auth/auth.js](auth/auth.js) — Firebase Authentication（Google）周りの処理
- [auth/auth.css](auth/auth.css) — 認証 UI のスタイル

## 主要な挙動（参照・簡潔版）

### 概要（責務別）

- Firestore 初期化／読み込み（データ取得）
  - [`initFirestore`](app.js) — Firebase SDK を動的 import して Firestore インスタンスを返す。
  - [`fetchProfilesFromFirestore`](app.js) — `roster/current` を読み込み、正規化済みプロフィール配列を返す。

- 検索用正規化／入力バッチ（検索 UX）
  - `normalizeText` — カタカナ→ひらがな、空白除去、小文字化などを行い検索精度を安定化。
  - `scheduleRender` — 入力イベントを rAF でバッチ化し、リアルタイム性とパフォーマンスを両立。

- 絞り込み・ソート・描画（表示ロジック）
  - [`filterAndSortAndRender`](app.js) — フィルタ→ソート→描画をまとめたメイン処理。
  - `createCardHTML` / `buildCardsHTML` — 各プロフィールカードの HTML を生成し、`renderCards` で描画。

- 認証フロー（Google サインイン）
  - [`readFirebaseConfig`](auth/auth.js) — Firebase 設定タグから初期化情報を取得。
  - `showSignedInUI` / `showSignedOutUI` — ログイン状態に応じて UI を切り替え。
  - `window.startApp` → [`startOnce`](app.js) — 認証完了後にアプリ初期化を開始。

### 起動フロー（簡潔シーケンス）
1. `index.html` が読み込まれる。
2. `auth/auth.js` が Firebase Auth を初期化し、`onAuthStateChanged` で状態監視。
3. サインイン済みなら `window.startApp()` を実行（または `auth:signedin` イベント発火）。
4. `app.js` の `startOnce()` が `loadDataAndInitialize()` を呼び出す。
5. Firestore から `roster/current` を取得し、正規化後に初期描画。
6. 以降、検索・ソート操作はクライアント側で反映。

### 公開 API
- `window.startApp()` — 認証完了時に呼び出される初期化関数。
- `auth:signedin` — 認証完了を通知するカスタムイベント。

## カスタマイズ
- Firebase 設定を差し替える場合は [index.html](index.html) の `<script id="firebase-config">` を編集してください。
- Firestore のコレクションは `roster/current` を想定しています（データ形式は [app.js](app.js) の `fetchProfilesFromFirestore` を参照）。

## 注意点
- Tailwind は CDN で読み込んでいます（[index.html](index.html)）。
- 認証処理は Firebase v9 モジュール（モジュールスクリプト：[auth/auth.js](auth/auth.js)）を使用します。ブラウザのポップアップ許可と Firebase コンソールの許可ドメイン設定を確認してください。