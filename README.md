# 学年名簿

Google アカウントでサインインすると Firestore から名簿を読み込み、カード一覧・検索・ソート・クラスジャンプが利用できます。

---

## ディレクトリ構成

```text
student-roster/
├── src/                # 開発用ソース（編集するファイル）
│   ├── css/
│   │   ├── auth.css    # 認証UI（Googleログインボタンなど）
│   │   └── style.css   # 名簿カード・検索UIなど
│   └── input.css       # Tailwind + 各CSSをまとめるエントリ
├── docs/               # 公開用（GitHub Pagesが読み込む成果物）
│   ├── index.html      # アプリ本体
│   ├── output.css      # ビルドされたCSS（本番用・minify済み）
│   ├── app.js          # 名簿取得・UIロジック
│   └── auth/           # 認証関連のスクリプト
│       └── auth.js     # Firebase Authentication処理
└── package.json        # ビルドスクリプト・依存関係管理
```

---

## CSS構成（Tailwind v4）

本プロジェクトでは Tailwind CSS v4 をビルド方式で使用しています。

- **`src/input.css`**: Tailwind のベース機能と、`src/css/` 内の各コンポーネント用 CSS を `@import` で統合します。
- **`docs/output.css`**: ビルドコマンドにより生成される本番用ファイルです。
- **HTML**: 軽量化された `output.css` のみを読み込み、パフォーマンスを最適化しています。

---

## 開発手順

### 開発モード（監視）
ファイルの変更を検知して自動で CSS を再ビルドします。
```bash
npm run dev
```

### 本番ビルド（圧縮）
本番公開用に CSS を極限まで軽量化（minify）して出力します。
```bash
npm run build
```

---

## 主要な挙動とフロー

1. **起動**: `index.html` 読み込み後、`auth/auth.js` が Firebase の認証状態を監視します。
2. **認証**: サインイン済みであれば `window.startApp()` を呼び出します。
3. **データ取得**: `app.js` が Firestore から名簿データを取得します。
4. **描画**: 取得したデータを元にカード一覧を表示。検索・ソートはクライアント側で高速に処理されます。

---

## 注意点

- **CSS修正**: 必ず `src/` 内のファイルを編集してください。`docs/output.css` を直接編集しても、ビルド時に上書きされます。
- **Firebase**: Firebase コンソールで、GitHub Pages のドメインが「承認済みドメイン」に含まれている必要があります。