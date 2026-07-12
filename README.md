# wt-manager

Git worktree を管理するデスクトップ GUI アプリ（Wails v2）。

機能の実装状況は [FEATURES.md](FEATURES.md) を参照。

## 前提条件

- Go 1.23+
- Node.js 22+
- pnpm（`corepack enable` 推奨）
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)
- Windows では WebView2 ランタイム

## 開発

### ネイティブ GUI（推奨）

```powershell
wails dev
```

### ブラウザのみ（モック動作）

```powershell
cd frontend
pnpm dev
```

開発サーバーは `http://localhost:5174`（db-gui 等とのポート競合回避のため 5173 以外を使用）。

ブラウザでは Go バックエンドに接続せず、`wails.ts` のモックが使われます。

### ローカル用サンプルリポジトリ

手動確認用にルートへ `sample-repo/` を置ける（gitignore 済み）。中に `.go` があると `go build ./...` の対象になるので、次の `go.mod` を必ず入れる:

```text
module sample-repo

go 1.23
```

（これで Go は別モジュールとみなし、wt-manager の `./...` から外れる）

## ビルド

```powershell
wails build
```

出力: `build/bin/wt-manager.exe`

## プロジェクト構成

```
wt-manager/
├── main.go              # Wails エントリポイント
├── internal/app/        # フロントに公開する Go API
└── frontend/            # React + TypeScript (Vite/pnpm)
    └── src/
        ├── lib/wails.ts # Wails 抽象化（モック付き）
        └── App.tsx      # メイン画面
```

## ライセンス

Private
