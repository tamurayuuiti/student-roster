# 学年名簿

Google アカウントでサインインし、Firestore から名簿を取得して表示する React + Vite アプリです。

---

## 概要

* **フロントエンド**: React + Vite
* **データ**: Firebase Firestore
* **認証**: Firebase Authentication（Google）
* **公開**: GitHub Pages（`docs/` を使用）

---

## ディレクトリ構成

```text
student-roster/
├── src/                    # 開発用ソース（編集対象）
│   ├── main.jsx            # エントリポイント（Reactの起動）
│   ├── App.jsx             # アプリ全体の司令塔（状態監視と画面切り替え）
│   ├── components/         # UIコンポーネント（表示担当）
│   │   ├── AuthGate.jsx    # 認証ゲート（ログイン画面・アクセス制御）
│   │   ├── Header.jsx      # ヘッダー（タイトル・ログアウト）
│   │   ├── CardGrid.jsx    # 一覧のコンテナ（検索・ソート・グリッド管理）
│   │   └── StudentCard.jsx # 個別の名簿カード（学年別カラー適用）
│   ├── hooks/              # カスタムフック（ロジック担当）
│   │   └── useRoster.js    # Firebase認証監視・Firestoreデータ取得
│   ├── styles/             # スタイルシート（外部・特定UI用）
│   │   └── google-button.css # Googleログインボタン専用の装飾
│   ├── lib/                # 外部サービス設定
│   │   └── firebase.js     # Firebase 初期化・接続設定
│   ├── utils/              # 共通ユーティリティ
│   │   └── normalize.js    # 文字列正規化処理（検索用）
│   └── index.css           # Tailwind エントリ / 全体のスタイル統合
├── docs/                   # ビルド成果物（GitHub Pages 公開用）
│   ├── index.html          # 公開用エントリポイント
│   └── assets/             # 最適化済みの JS / CSS
├── vite.config.js          # Vite 設定（outDir: "docs" 等）
└── package.json            # プロジェクト設定・依存関係管理
└── README.md
````

---

## 開発

```bash
npm install
npm run dev
```

* `src/` を編集
* ブラウザで動作確認（ホットリロード）

---

## ビルド / 公開

```bash
npm run build
```

* `docs/` に出力される
* GitHub Pages で `docs` を指定すればそのまま公開可能

---

## 動作フロー

1. 認証状態を監視（AuthGate）
2. サインイン済みならアプリ開始
3. Firestore から名簿取得
4. カードとして描画（検索・ソートはクライアント処理）

---

## Firebase 注意点

* **承認済みドメイン**に公開URLを追加する必要あり
* `firebase.js` に設定が直接書かれているため、公開リポジトリでの扱いには注意
* APIキーは公開されても動作上は問題ない設計だが、**アクセス制御はFirestoreルールで厳密に管理する必要がある**

---

## 注意

* `docs/` はビルド成果物なので**直接編集しない**
* 変更は必ず `src/` 側で行う