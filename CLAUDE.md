# SF 2026 旅のしおり

単一HTML・外部リクエストゼロ・localStorageのみ。海外で圏外でも開くことが最優先。
詳細は PROJECT.md を読むこと。

## 絶対に守ること
- CDN参照・外部フォント・サーバー通信を追加しない（画像はbase64埋め込み）
- **リポジトリはPublic**。private/ をコミットしない
  （チケットQR・予約番号・宿名/番地入りのgeo.svg・本人用テンプレートが入っている）
- 個人情報を含むファイルを private/ から src/ や assets/ へ戻さない
- build_shared.py の個人情報混入チェックを毎回通す
  （検出語の実物は `private/leakwords.json`。スクリプト側に書き戻さない）
- Service Worker を追加しない（更新が届かなくなる）
- setup.js のバッジ枠「間に合わない」警告を消さない

## 最優先タスク
共有版を GitHub Pages にデプロイ。Public リポジトリ、リポジトリ名は推測されにくいものに。
