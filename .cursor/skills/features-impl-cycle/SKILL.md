---
name: features-impl-cycle
description: >-
  Implements one unchecked FEATURES.md item at a time using priority (P0–P3),
  then plan, implement, quality-gate, and update FEATURES.md. Use when the user
  asks for the next feature, FEATURES implementation, 次の機能, 実装サイクル,
  or to pick from FEATURES.md.
---

# FEATURES 実装サイクル

1 サイクル = **未実装 1 項目のみ**。完了後はユーザが「次」と言うまで止めろ。

## 1. 選定

1. リポジトリルートの `FEATURES.md` を読む
2. `[ ]` のうち **最小の P 番号**を候補にする（同点は上から先）
3. 候補を **1つ**提案し、理由と依存（あれば）を短く書く
4. スコープが曖昧なら **1〜2問だけ**質問してから次へ

優先度: **P0** 基盤 / **P1** 高 / **P2** 中 / **P3** 低

## 2. Plan

1. 関連 Go / TS / 既存テストを短く調査する
2. `CreatePlan` で計画を出し、**受け入れ条件**（何ができたら DONE へ移すか）を明記する
3. **ユーザ承認を待つ**。承認前に実装しない

## 3. 実装

- 最小差分。UI は db-gui デザイントークン準拠
- UI 追加・変更 → Storybook も更新
- Go API 追加 → Wails バインド / `mockApp` / フロント型を同期
- コミットはユーザが依頼したときだけ

## 4. 品質ゲート（必須）

リポジトリルートで、両方とも exit 0 になるまで「完了」と言わない:

```bash
go test -short ./internal/...
cd frontend && pnpm exec tsc -b && pnpm test
```

Go / Wails バインド変更時は追加で:

```bash
go build ./...
```

詳細は `.cursor/rules/frontend-quality-check.mdc`（品質ゲート）に従う。

## 5. FEATURES.md 反映

- 受け入れ条件を満たしたら、`FEATURES.md` から該当行を **削除**し、`FEATURES_DONE.md` へ `[x]` で追記する
- 部分実装なら `FEATURES.md` に `[ ]` のまま残し、括弧で現状を注記する（無理に完了扱いにしない）
- 両方の最終更新日を今日にする

## 6. 完了報告

- 何を実装したか、ゲート結果、`FEATURES.md` / `FEATURES_DONE.md` 更新の有無を短く報告する
- **次の機能は開始しない**
