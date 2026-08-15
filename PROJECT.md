# SF 2026 旅のしおり

2026年8月末のサンフランシスコ（PokémonXP / Pokémon World Championships 2026）向けの
単一HTML旅程アプリ。GitHub Pages に置いて、スマホのホーム画面から使う。

## 最初にやってほしいこと

**共有版（`index.html`）を GitHub Pages にデプロイする。** これが最優先タスク。

手順は「デプロイ」の節を参照。ユーザーはGitHubのWeb UIでの手順を把握済みだが、
`gh` CLI が使えるならそちらで進めてよい。

---

## 成果物は2つ

| ファイル | 用途 | 配布 |
|---|---|---|
| `sf-2026.html` | 本人専用。予約番号・乗船QRを含む | **配らない** |
| `index.html` | 友人配布用。個人データを一切含まない | GitHub Pages に置く |

ビルドは `private/build_mine.py` と `scripts/build_shared.py`。
どちらもテンプレートHTMLのプレースホルダを置換して、単一HTMLを吐く。

```bash
python3 private/build_mine.py     # → dist/sf-2026.html（本人用・配らない）
python3 scripts/build_shared.py   # → index.html（共有版・これをPagesに置く）
```

**本人用のビルド一式は `private/` にある**（公開リポジトリに置けないため。理由は下記）。

パスはリポジトリルート基準の相対パスで解決される（どこから実行してもよい）。
共有版はそのままデプロイできるようリポジトリ直下に `index.html` として出る。

---

## 設計の前提（勝手に変えないでほしいところ）

### 1. 単一HTML・外部リクエストゼロ
画像はすべて base64 で埋め込む。CDN参照もフォント読み込みもしない。
**理由**: 海外で圏外・機内・地下でも開く必要がある。
唯一の外部リンクは Google Maps の経路URLと Twitch（どちらもユーザーが明示的にタップしたとき）。

### 2. localStorage のみ。サーバーもDBもアカウントもなし
**理由**: 他人の宿泊先や予約番号を預からない設計にするため。
運用コストもゼロ。ここを変えると責任の所在が変わるので、変更しないこと。

使用しているキー:
- `sf2026-profile` … 個人の予定（共有版のみ）
- `sf2026-checks` … 準備チェックリスト
- `sf2026-xp` … XPの「行った」記録

### 3. データは共通層と個人層に分かれている
- **共通層** (`data/common.json`) … 会場マップ、XP/UNITE/GOの情報、Tips、緊急連絡先、チェックリスト。全員同じ
- **個人層** … 共有版ではセットアップ入力から生成。本人用は `private/trip.json` に直書き

### 4. 共有版に個人情報を混入させない
`build_shared.py` の末尾に混入チェックがある。ビルドのたびに必ず通すこと。
検出語のうち**個人を特定するもの（予約番号・氏名・住所・便名）は
`private/leakwords.json` に置く**。`build_shared.py` は公開されうるので、
スクリプト本体に実物を書かないこと。private/ が無い環境ではチェックが
実行されず警告だけ出るので、配布前の最終確認は必ず本人環境で行う。

---

## ディレクトリ

```
src/
  shared_template.html   共有版テンプレート（セットアップ機能つき）
  setup.js               逆算ロジック（タイムライン生成）
  setup_ui.js            セットアップ画面のUI
data/
  common.json            共通データ
  pins.json              会場マップのピン座標（62件、%指定）
assets/
  overview / levels / ground / lower / ybg .webp   会場マップ5枚
  geo_generic.svg        街の位置関係図（共有版・宿名なし）
private/                 ← .gitignore 対象。絶対にコミットしない
  trip.json              本人の全予定
  *_qr.png               乗船QR（有効なチケット）
  leakwords.json         混入チェックの検出語（実物の予約番号・氏名・住所・便名）
  geo.svg                街の位置関係図（本人用）。宿名・宿泊日・番地が入っている
  shiori_template.html   本人用テンプレート。予約番号を直書きしている箇所がある
  build_mine.py          本人用ビルド
scripts/
  build_shared.py        共有版ビルド（公開される）
```

**なぜ本人用が `private/` にあるか**: リポジトリはPublicなので、
`geo.svg`（宿名・宿泊日・番地）と `shiori_template.html`（乗船予約番号を直書き）を
`assets/` や `src/` に置くと、そのまま公開される。2026-08-15にここへ移した。
本人用の成果物 `dist/sf-2026.html` も `.gitignore` 対象。
このドキュメント自体も公開されるので、**具体的な番号や番地を書かないこと。**

### テンプレートのプレースホルダ

| | 中身 |
|---|---|
| `__TRIP__` | データJSON |
| `__MAPS__` | マップ画像5枚（base64 data URI） |
| `__PINS__` | ピン座標 |
| `__GEO__` | 位置関係図のSVG（インライン） |
| `__QR__` | 乗船QR（本人用のみ） |
| `__ICON__` `__MANIFEST__` | PWA用（data URI） |
| `__SETUP__` `__SETUPUI__` | setup.js / setup_ui.js（共有版のみ） |

---

## 画面構成

6タブ: 今日 / 日程 / マップ / イベント / 情報 / 準備

- **今日** … 1レーンのタイムライン。当日は現在時刻に赤線、過去は減光。基準点は金色カード
- **日程** … 3ブロック（到着・準備／本番／観光・帰国）で全日程を俯瞰
- **マップ** … 街の位置関係図（SVG）＋ 会場マップ5枚。ピンチズーム、ピンは種類でフィルタ。
  引きの状態（`sc <= minSc*2.1`）ではラベルを隠して点だけ表示する
- **イベント** … XP / UNITE / GO の3セグメント
- **情報** … 予約、緊急連絡先（`tel:` リンク）、宿の設備、現地Tips
- **準備** … 持ち物チェックリスト。共有版はここから予定の再編集ができる

---

## 逆算ロジック（`setup.js`）

このアプリの中身はここ。所要時間の見積りは `EST` にまとまっている。

```js
immigration: [60, 120]   入国審査＋荷物
bartToCity : 30          SFO → Powell St
badgeQueue : [20, 40]    バッジ受け取りの列
westToPC   : 4           Registration Hall → Pokémon Center
airportLead: 180         国際線は3時間前
```

到着便・宿・バッジ枠の3つから、到着日のタイムラインを組み立てる。

**重要な仕様**: バッジ枠に物理的に間に合わない入力を検出して警告を出す。
`earliest = hotelAt + walk` が枠の時刻を超えたら、代案つきの警告項目を差し込む。
この警告がこのツールで一番役に立つ部分なので、消さないこと。

宿は複数登録でき、日付で自動的に切り替わる（`stayOn(date)`）。
チェックアウト当日も「その宿にいる」判定にしてある（`date <= x.to`）。

---

## 未着手のタスク

### A. 保存データのバージョン管理 ✅ 2026-08-15 完了
`setup.js` に `PROFILE_V` と `migrateProfile()` を入れた。`v` を持たない既存データは
v1 として扱い、読み込み時に書き戻す。構造を変えるときは `PROFILE_V` を上げて
`migrateProfile()` に分岐を足す。新しい版で保存されたデータ（`v > PROFILE_V`）は
捨てずにそのまま使う。

### B. キャッシュ対策 ✅ 2026-08-15 完了
共有版テンプレートに `Cache-Control: no-cache, must-revalidate` 等のmetaを追加。
**Service Worker は入れないこと**（入れると更新が届かなくなる）。

### C. 実機での確認（デプロイ後すぐ）
位置情報とコンパスは HTTPS でないと動かないため、まだ一度もテストできていない。
- 「🧭 方角と距離」で許可ダイアログが出るか
- iOS で `DeviceOrientationEvent.requestPermission` が通り、矢印が端末の向きに追従するか
- ホーム画面から起動したときにナビが隠れないか

### D. 情報が出たら反映するもの
- UNITE の試合時間割（出たら日程タブへ）
- 8/28〜30 の個別予定

---

## デプロイ

GitHub Pages。**Public リポジトリ**でないと無料枠が使えない。
リポジトリ名は推測されにくいものにする（例 `sf26-a7k2m9`）。

```bash
gh repo create <name> --public --source=. --push
# Settings → Pages → Deploy from a branch → main / (root)
```

- 共有版を `index.html` としてリポジトリ直下に置く
- `private/` は `.gitignore` に入れる（`.gitignore` は同梱済み）
- `sf-2026.html`（本人用）もコミットしない

配布はURLを直接渡す形。SNSに貼らない。
iPhone は Safari、Android は Chrome で開いて「ホーム画面に追加」。
LINEの内蔵ブラウザだとこのメニューが出ないので、案内に一言添える。

---

## 素材の扱いについて

`assets/*.webp` はポケモン公式の会場マップPDFを変換したもの。
知り合いに直接URLを渡す範囲で使う前提。**SNSで広く告知して配る場合は、
自作の簡略マップに差し替えるか、公式のDLページへのリンクに置き換えること。**
その判断はユーザーが行う。勝手に公開範囲を広げる提案をしない。

セットアップ画面の末尾に「ファンが個人的に作ったもの」の表記を入れてある。消さないこと。
