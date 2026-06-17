# 学年名簿

React + Vite による学年名簿閲覧アプリケーションです。

Google アカウントでサインインし、Firebase Firestore に保存された名簿データを取得・表示します。

---

## 技術スタック

* React
* Vite
* Firebase Authentication
* Firebase Firestore
* Tailwind CSS

---

## ディレクトリ構成

```text
student-roster/
├── public/
├── src/
│   ├── components/    # UIコンポーネント
│   ├── hooks/         # カスタムフック
│   ├── lib/           # Firebase設定
│   ├── utils/         # 共通ユーティリティ
│   ├── styles/        # スタイル
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── package.json
├── vite.config.js
└── README.md
```

---

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 開発サーバ起動

```bash
npm run dev
```

デフォルト

```text
http://localhost:5173
```

---

## ビルド

```bash
npm run build
```

ビルド成果物は

```text
dist/
```

へ出力されます。

---

## 動作フロー

1. Firebase Authentication で認証状態を監視
2. Google アカウントでサインイン
3. Firestore から名簿データを取得
4. 検索・ソートを適用
5. 名簿カードとして表示

---

## Firebase 設定

Firebase プロジェクト側で以下の設定が必要です。

### Authentication

Google プロバイダを有効化し、公開URLを承認済みドメインへ追加してください。

### Firestore

Firestore Security Rules によってアクセス制御を行ってください。

Firebase API キーは秘匿情報ではありませんが、適切な認証・認可設定を行うことが重要です。

---

## デプロイ

Vercel を想定しています。

GitHub リポジトリと連携することで、Push 時に自動ビルド・自動デプロイが実行されます。

---

## 開発メモ

* Firebase 設定は `src/lib/firebase.js` に集約する
* 認証・データ取得ロジックは `src/hooks/useRoster.js` に集約する
* 共通処理は `src/utils` に配置する
* UI コンポーネントは `src/components` に配置する