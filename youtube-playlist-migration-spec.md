# YouTubeプレイリスト移行仕様

`_raw/youtube_playlist/*.json`（YouTubeでまとめていた動画のエクスポート）を、
既存のXアーカイブ移行パイプラインと同じ形の `content/posts/*.md` に変換するための仕様。

関連: [x-archive-migration-spec.md](./x-archive-migration-spec.md) / [docs/03_spec.md](./docs/03_spec.md) / [docs/04_content-guide.md](./docs/04_content-guide.md)

---

## 1. 目的とスコープ

- YouTubeのプレイリストで貯めていた動画を、サイトのエントリーとしてストック化する
- **同じ配信者（チャンネル）の動画は1つのポストにまとめ、統一感を持たせる**
- 単発の動画は、これまで通り1動画 = 1ポストとして独立させる
- サムネイルはYouTubeの公式サムネイル画像を取得してローカルに保存する

対象は現時点で2ファイル・41本。

| ファイル | 本数 | チャンネル数 |
|---|---|---|
| `ACES and OCIO.json` | 8 | 4 |
| `Environment_Generalist.json` | 33 | 28 |

---

## 2. 入力データ

JSONは動画オブジェクトの配列。移行で使うフィールドは以下。

| フィールド | 用途 |
|---|---|
| `Title` | 動画タイトル（`source_url[].label`、post titleの素材） |
| `Description` | `summary` と本文の**主要な情報源**。要約・翻案して使う（§4.4）。全文の逐語翻訳転記だけはしない |
| `Thumbnail url` | `https://i.ytimg.com/vi/{VIDEO_ID}/maxresdefault.jpg`。§5で使用 |
| `Channel name` | **グルーピングキー**（§3） |
| `Duration in timestamp` | 動画一覧に表示する尺 |
| `Uploaded Time` | 動画の公開日（ポストの `date` とは別物、§4.3） |
| `Video url` | `source_url[].url` |
| `Tags` / `Tags (in description)` | `tags` 生成のヒント（そのまま採用はしない、§4.3） |
| `Views` / `Likes` / `Comments` | **不採用**。取得時点のスナップショットで陳腐化するため保存しない |
| `Links (in description)` | 参考。関連リンクとして採用するかは個別判断 |

動画ID単体のフィールドは無いが、`Video url` の `v=` パラメータ、または `Thumbnail url` の `/vi/{ID}/` から抽出できる。

---

## 3. グルーピング仕様

### 3.1 基本ルール

```
グループキー = Channel name（正規化: 前後空白除去 → 小文字化 → 連続空白を1つに）
```

- **同一キーの動画が2本以上** → 1つの「チャンネルまとめポスト」に統合
- **1本のみ** → 従来通り独立ポスト

判定は **`_raw/youtube_playlist/` 全体を横断**して行う（ファイル単位ではない）。
将来同じチャンネルの動画を別プレイリストから追加した場合は、新規ポストを作らず既存のまとめポストに追記する。

> **代替案**: グループキーを「プレイリスト × チャンネル」にすればプレイリストごとの話題の一貫性は保たれるが、
> 同じ人の動画が複数ポストに散る。現データではどのチャンネルも1プレイリストにしか登場しないため両案の結果は同一。
> **チャンネル横断案（上記）を採用**。プレイリストのテーマ性は §6 のガイドページ側で担保する。

**企業・媒体チャンネルも同じルールで統合する**（決定済み）。
`80 Level` / `Rebelway` / `Chaos V-Ray` / `Houdini`（SideFX公式） / `Adobe Substance 3D` を個人チャンネルと区別しない。

### 3.2 現データへの適用結果（41本 → 32ポスト）

**まとめポスト: 6件 / 15本**

| チャンネル | 本数 | 内容 |
|---|---|---|
| Andreas Mischok | 3 | "What the hell is Colour Management?" Part 1〜3（完全な連番シリーズ） |
| Adobe Substance 3D | 3 | "Substance 3D Painter & ACES" 01〜03（完全な連番シリーズ） |
| Houdini（SideFX公式） | 3 | Terrain / OSM都市生成 / Project Elderwood |
| Alex Villabon | 2 | Nuke Script Optimization / smartElements |
| Solso4D | 2 | Nuke breakdown / Blender宇宙CGI |
| Maxime Gerardin | 2 | Blender環境チュートリアル / 冬コンセプトショット |

**独立ポスト: 26件**

Guy's Dojo, CG Forge, Irinel Papuc, VFX SHOWDOWN, Inside The Mind, Hang Yuri Yang, c g s l a v,
Hristo Velev, Split The Diff, fabien escudero, Lance Culver, Rohan Dalvi, cgside, Chaos V-Ray,
masao hieno, 80 Level, Rebelway, Simon's utak, Steffen Hampel, The Adam, IanHubert,
GIS Solutions LLC, Julian Jones, Maarten Nauta, Carlo Jongen, Palm Pixel

尺による特別扱いはしない（決定済み）。`Maarten Nauta` の2時間41分の座談会
`Pro Environment Artists Answer Your Questions!` も他と同じ単独ポストにする。
尺は `source_url[].label` に表示されるので、長さは読み手が判断できる。

### 3.3 シリーズ検出（まとめポスト内の並び順）

1. **シリーズ物**（タイトルに `Part N/M` / `- 0N -` / `EP0N` 等の連番、または共通プレフィックスを持つ）
   → 連番の昇順。Andreas Mischok と Adobe Substance 3D はこれに該当し、そのまま「講座」として読める形になる
2. **それ以外** → `Uploaded Time` の昇順（学習順として自然な古い順）

### 3.4 まとめポストのタイトル・カテゴリ

- **title**: `{チャンネル名} — {テーマ / シリーズ名}（全N本）`
  - 例: `Andreas Mischok — カラーマネジメント解説シリーズ「What the hell is Colour Management?」全3本`
  - 例: `SideFX公式 — Houdiniによる地形・都市・ワールド構築の解説動画3本`
- **category**: 収録動画の内容の多数決で決める（大半は `tutorial`）。
  チャンネルそのものの紹介が主眼なら `showreel`（既存の `houdini-vex-horikawa-youtube` と同じ扱い）
- **slug**: `{channel-kebab}-{テーマ}` 例: `andreas-mischok-colour-management`

---

## 4. 出力データモデル

### 4.1 既存の「まとめポスト」パターンをそのまま踏襲する

`content/posts/2026-09-05_Kitbashアセットサイトまとめ.md` 等（合成ID `20900000000000000xx` を持つ3件）で
すでに確立している形式に完全に乗る。**レンダラー側の改修は不要**。

```yaml
---
title: "Andreas Mischok — カラーマネジメント解説シリーズ 全3本"
slug: "andreas-mischok-colour-management"
date: 2026-09-06
category: "tutorial"
type: "brief"
tags: ["ACES", "OCIO", "Color Management", "Nuke"]
topics: ["lookdev"]
tools: ["nuke"]
source_url: [{"url":"https://www.youtube.com/watch?v=...","label":"Part 1/3 — Colour Spaces（14:50）","image":"images/posts/2091000000000000001-XXXXXXXXXXX.jpg"}, ...]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000001"
summary: "..."
ai_confidence: "high"
status: draft
---
```

`render-tip.js` が `source_url` の各要素を `source-link-item`（サムネ画像 + ラベル + 「サイトを見る」ボタン）として
縦に並べてくれるので、**動画リストのUIは既に存在する**。

### 4.2 ID採番（重要）

パイプラインのほぼ全スクリプト（`08` / `15` / `16` / `23` / `24` / `28` / `lib/entries.js` / `lib/checklist.js`）が
`original_post: ".../status/{数字}"` を**正規表現で抜き出して主キーとして使っており、これが無いポストは黙って無視される**。
そのため既存の合成ID方式に合わせる。

```
2091 000000000000 NNN   ← YouTube移行ぶんの専用ブロック
```

- 既存の手動まとめポストが `2090000000000000001`〜`005` を使用済み。**衝突しないよう `2091…` 帯を割り当てる**
- 画像ファイル名も既存規約通り `images/posts/{ID}-{識別子}.jpg`

> **将来的な整理案（今回はやらない）**: `post_id` フィールドを新設し、各スクリプトのID抽出を
> 「`post_id` があればそれ、無ければ `original_post` から抽出」に変更すれば、偽の x.com URL を持たせる必要がなくなる。
> ただし影響範囲が8ファイルに及ぶため、YouTube移行とは切り離して実施する。

### 4.3 各フィールドの決め方

| フィールド | 決め方 |
|---|---|
| `date` | 既存アーカイブの期間に等間隔で散らす。算出方法と割り当て結果は §4.5 |
| `language` | 動画の言語。現データはほぼ `"英語"`（`masao hieno` 等は要確認） |
| `tags` | docs/04 のルール通り英語Title Case。JSONの `Tags` は小文字・雑多なのでそのままは使わず、AIで正規化してから採用 |
| `topics` / `tools` | 手書きしない。`tags` を付けた後 `node scripts/25-tag-taxonomy.js` が導出する |
| `summary` | AI生成。**`Description` の翻訳ではなく要約**（1〜2文、80〜120字） |
| `type` | `category` から `lib/taxonomy.js` の `CATEGORY_TO_TYPE` が導出 |
| `source_type` | 新設（任意）: `"youtube-playlist"`。出自の記録用。既存スクリプトは未知キーを無視するので安全 |
| `playlists` | 新設（任意）: `["ACES and OCIO"]`。§6 のガイド生成で使う |

### 4.4 本文（body）の制約

- `parseFrontMatter()` は**行単位のJSONパーサ**であり真のYAMLではない。
  `source_url` の配列は**必ず1行**で書くこと（複数行のYAMLブロック配列は読めない）
- **本文はページに表示しない**（決定済み、2026-09-06）。`render-tip.js` の `renderTipPage()` が
  `<div class="prose">` に書き出すのは `summary` と `source_url` のリンクカードだけで、
  `textToHtml()` は定義されているだけでどこからも呼ばれていない未使用関数になっている。
  これはYouTube移行に限った話ではなく、**既存230ポストの本文も同じく非表示**。この挙動を維持する
- 表示を試した結果（`renderTipPage()` に `textToHtml(text)` を1行差し込んで全262ポストをビルド）:
  - **262ポスト中206件で、本文末尾の生URLが直下の `source_url` リンクカードと重複**した。
    Xポストの「本文にリンクを貼る」書式をそのまま引き継いでいるため。URLを含まない文章だけのポストは56件
  - `textToHtml()` は `escapeHtml` するだけなので、その生URLはリンクにならないただの文字列になる
  - `@ユーザー名` もサイドバーの「Xアカウント」欄と重複する
  - 採用しないことにしたため、この変更は元に戻してある
- そのため本文は「Markdown側に貯めておく記録」という位置づけになる。将来レンダラーを作り直す際の素材、
  および `summary` を書き直すときの下敷きとして使う
- 表示を再検討する場合に備え、本文は素の日本語の段落で書く。`textToHtml()` は段落と改行しか解釈しないため
  **見出し・箇条書き・リンクのマークダウンは効かない**
- 動画1本ごとの説明は `source_url[].label` 側に寄せ、本文には
  「なぜこのチャンネル/シリーズを勧めるか」という一次コメントを書く
  （docs/04 §5 の `memo` に相当する部分）
- 本文冒頭にコラージュバナー（§5.3）の画像参照を1行置く

**一次コメントは今回AIで生成する**（決定済み）。docs/04 §5 は本来「自分の視点＝サイトの独自性」を要求しているが、
32件を書き下ろすコストを優先し、AI生成で下書きを埋めてから後で加筆修正する運用にする。そのための取り決め:

- 文体は既存ポストに合わせる。日本語・です/ます調・2〜4段落・各段落1〜3文
  （例: 「〜のチュートリアルです！」「〜の方は必見です！」の温度感）
- **書いてよいこと**: `Description` から読み取れる内容（§4.4.1）、想定読者、前提知識、視聴順の提案、他ポストとの関連
- **書いてはいけないこと**: 実際に見ていないと言えない体験談（「自分の制作で使った」「このパラメータで破綻した」等）、
  評点、`Description` の**逐語翻訳の全文転記**
- `status: draft` のまま置き、加筆した時点で本人が `status` を進める
- AI生成であることの記録として `ai_confidence` を通常通り付ける

#### 4.4.1 `Description` を情報源として使う

各動画の `Description` には投稿者自身による解説文が入っており、本文と `summary` の一次情報として使える。
URL行・ハッシュタグ行・宣伝行（Patreon / buymeacoffee / SNS / Gumroad 等）・章タイムスタンプ・音楽クレジット・
`----- Links -----` のような区切り行を除いた「散文部分」の分量で分類すると:

| 区分 | 本数 | 扱い |
|---|---|---|
| 400字以上（充実） | 21 | `Description` の要約だけで本文が書ける |
| 120〜399字（標準） | 11 | 要約 + タイトル・尺・チャンネル文脈で補う |
| 1〜119字（希薄） | 7 | タイトル・尺・シリーズ内の位置づけを主な材料にする |
| 0字（無し） | 2 | fabien escudero / Maxime Gerardin「Winter concept shot」。タイトルと尺のみで書く |

- 除去した行のうち**章タイムスタンプは内容の手がかりとして読む**（本文には書き写さない）。
  Andreas Mischok の3本は `----- Chapters -----` に全章立てがあり、シリーズの構成説明にそのまま使える
- `Description` 内の `Part 2 → https://youtu.be/...` のような相互リンクは、§3.3 のシリーズ順の裏取りに使う
- 希薄・無しの9本は `ai_confidence` を `medium` 以下にして、加筆優先度が分かるようにする
- 企業チャンネル（Chaos V-Ray / Rebelway / Adobe 等）の `Description` は自社サービスへの誘導文が多い。
  製品の宣伝文句をそのまま日本語にして本文に置かない

### 4.5 `date` の割り当て

既存アーカイブの期間に等間隔で散らし、新着欄がYouTube移行ぶんで埋まらないようにする。

```
span  = 既存postsの最古日 .. 最新日 の日数
step  = floor(span / N)          N = 今回生成するポスト数
date(i) = 最古日 + step * i      i = 0 .. N-1
```

現データでの値:

| | |
|---|---|
| 既存postsの範囲 | `2025-10-08` .. `2026-09-05` |
| span | 332日 |
| N | 32 |
| **step** | **10日** |
| 割り当て範囲 | `2025-10-08` .. `2026-08-14` |

割り当て順は**各グループの最も古い動画の公開日の昇順**（`Uploaded Time` の最小値）。
古い動画ほど古い日付になり、アーカイブを遡ったときの並びが自然になる。

| # | date | 種別 | チャンネル | 最古動画 |
|---|---|---|---|---|
| 1 | 2025-10-08 | 単独 | Hristo Velev | 2019-06-05 |
| 2 | 2025-10-18 | 単独 | IanHubert | 2019-10-11 |
| 3 | 2025-10-28 | 単独 | Lance Culver | 2019-11-26 |
| 4 | 2025-11-07 | まとめ×3 | Houdini（SideFX） | 2020-03-30 |
| 5 | 2025-11-17 | 単独 | Rebelway | 2020-10-08 |
| 6 | 2025-11-27 | 単独 | CG Forge | 2021-02-08 |
| 7 | 2025-12-07 | まとめ×3 | Andreas Mischok | 2021-06-17 |
| 8 | 2025-12-17 | 単独 | Rohan Dalvi | 2021-07-15 |
| 9 | 2025-12-27 | 単独 | Julian Jones | 2022-09-22 |
| 10 | 2026-01-06 | 単独 | Guy's Dojo | 2022-11-08 |
| 11 | 2026-01-16 | 単独 | Inside The Mind | 2022-11-17 |
| 12 | 2026-01-26 | 単独 | Split The Diff | 2023-01-05 |
| 13 | 2026-02-05 | 単独 | GIS Solutions, LLC | 2023-01-07 |
| 14 | 2026-02-15 | 単独 | fabien escudero | 2023-02-04 |
| 15 | 2026-02-25 | 単独 | Simon's utak | 2023-04-06 |
| 16 | 2026-03-07 | 単独 | Irinel Papuc | 2023-04-14 |
| 17 | 2026-03-17 | まとめ×3 | Adobe Substance 3D | 2023-05-03 |
| 18 | 2026-03-27 | 単独 | cgside | 2023-07-16 |
| 19 | 2026-04-06 | まとめ×2 | Maxime Gerardin | 2023-07-30 |
| 20 | 2026-04-16 | 単独 | Hang Yuri Yang | 2024-01-26 |
| 21 | 2026-04-26 | 単独 | masao hieno | 2024-03-16 |
| 22 | 2026-05-06 | 単独 | 80 Level | 2024-03-24 |
| 23 | 2026-05-16 | 単独 | Chaos V-Ray | 2024-06-20 |
| 24 | 2026-05-26 | まとめ×2 | Alex Villabon | 2025-01-22 |
| 25 | 2026-06-05 | 単独 | Steffen Hampel | 2025-02-06 |
| 26 | 2026-06-15 | 単独 | VFX SHOWDOWN | 2025-02-15 |
| 27 | 2026-06-25 | 単独 | c g s l a v | 2025-03-14 |
| 28 | 2026-07-05 | 単独 | Carlo Jongen | 2025-05-07 |
| 29 | 2026-07-15 | まとめ×2 | Solso4D | 2025-05-13 |
| 30 | 2026-07-25 | 単独 | Maarten Nauta | 2025-05-25 |
| 31 | 2026-08-04 | 単独 | The Adam | 2025-07-08 |
| 32 | 2026-08-14 | 単独 | Palm Pixel | 2025-09-12 |

注意点:

- `date` は同日の既存ポストと重なる（1日に複数ポストがある日が既にあるので問題にはならない）
- ファイル名は `{date}_{titleの先頭30文字}.md`。既存ファイルと同名にならないことを書き出し時に確認する
- 末尾に22日ぶんの余りが出る（`step` を切り捨てているため）。最後のポストは `2026-08-14` で、
  アーカイブ最新の `2026-09-05` は既存ポストのまま残る
- **将来JSONを追加したときは既存32件の `date` を再計算しない**（URLとRSSが壊れるため）。追加ぶんの扱いは §4.6

### 4.6 JSONを追加していく運用（バッチ設計）

**結論: 実行日ごとの「バッチ」に分ける。** ただし `_raw/` のディレクトリを分けるのではなく、
**処理済みマニフェストを持たせて差分実行にする**のが正しい分け方。

`_raw/youtube_playlist/` にJSONを置きっぱなしで毎回全件処理すると、既存ポストのID・slug・`date` を
再計算してURLとRSSを壊す。これを構造的に防ぐ。

#### マニフェスト `data/yt-processed.json`

`_work/` ではなく `data/` に置く。`_work/` は `.gitignore` 対象の中間出力置き場であり、
このファイルを失うと全ポストのID・slug・`date` の対応が失われる（次回実行がバッチ1として
振る舞い、採番と日付を振り直す）。`legacy-redirects.json` / `retired-slugs.json` と同じ
「消えると困るパイプライン状態」なので、同じ `data/` で管理しコミットする。

```jsonc
{
  "batches": [
    { "batch": 1, "runDate": "2026-09-06", "idPrefix": "2091", "seq": [1, 32],
      "dateRange": ["2025-10-08", "2026-08-14"] }
  ],
  "videos": {                       // 動画ID → 確定した配属先
    "llwFTH4sh_0": { "batch": 1, "postId": "20910000000000000010", "date": "2026-01-06" }
  },
  "channels": {                     // 正規化チャンネル名 → 既存ポスト
    "guy's dojo": { "postId": "20910000000000000010", "slug": "guys-dojo-aces-ocio" }
  }
}
```

#### 実行時の判定（`31-yt-normalize.js`）

JSONを走査し、動画ごとに3つのどれかに振り分ける。

| 判定 | 条件 | 動作 |
|---|---|---|
| `skip` | `videos` に動画IDがある | 何もしない（既処理） |
| `append` | 未処理だが `channels` にそのチャンネルがある | **既存ポストに追記**。`source_url` に要素を足し、コラージュバナーを再生成し、title の「全N本」と `summary` を更新する。**`date` / `slug` / `postId` は変更しない** |
| `create` | 未処理でチャンネルも新規 | 新規ポストを作る（同一バッチ内で2本以上なら §3.1 通りまとめポスト） |

`append` は既存ポストを書き換えるだけなので、新着欄とRSSには再浮上しない。
これは意図通り（URLとフィードの安定を優先）。目立たせたい追加があれば、そのときだけ手動で `date` を更新する。

#### 追加バッチの `date`

初回（§4.5）は既存アーカイブ全期間に散らす特殊ケース。**2回目以降は素直に実行日を使う。**

戦略を決めるのは**バッチ番号ではなくバッチのサイズ**。2回目でも大量移行なら初回と同じだけ散らす必要があり、
前回と同日に走らせた場合は「前回実行日からの期間」が0日になって散らしようがない。

| `create` の件数 | `date` |
|---|---|
| 6件以下 | **全部その実行日**。既存アーカイブも1日最大6件（2025-10-09）あり、平均1.6件/日なので不自然にならない |
| 前回実行日からの日数に収まる | 前回実行日 .. 今回実行日 の期間に散らす。`step = max(1, floor(span / N))` |
| それ以外（＝大量移行） | 初回と同じくアーカイブ全期間に散らす |

未来日は絶対に付けない（新着とRSSの先頭に未公開扱いのポストが居座るため）。

#### 既存ポストとの重複チェック

マニフェストが知っているのは**このパイプラインが取り込んだ動画だけ**なので、それだけでは
Xから移行済みのポストが既に紹介している動画を二重に投稿してしまう。特にWatch Laterは
過去にXで紹介した動画を含みやすい。

そのため `31` は `content/posts/*.md` 全件から YouTube 動画IDを抽出し、
`source_type: "youtube-playlist"` を持たないポスト（＝X由来の既存ポスト）が既に参照している動画を
`既出` として除外する。除外した動画は `33` がマニフェストに `excluded` として記録するので、
次回以降は再報告されない。

実測: バッチ2（WatchLater 90本）で9本が該当した。

#### ID採番

`idPrefix` + 通し番号。バッチをまたいで連番を続ける（`seq` の続きから）。
バッチ番号自体はIDに埋めない — チャンネルが後から `append` される以上、
IDとバッチの対応は1対1にならないため。

---

## 5. サムネイル仕様（ご質問への回答）

### 5.1 youtube-thumbnail-grabber.com は「使えるが、使う必要がない」

- あのサイトがやっているのは、入力されたURLから動画IDを抜き出して
  `https://i.ytimg.com/vi/{VIDEO_ID}/maxresdefault.jpg` を表示・ダウンロードさせているだけ
- **そのURLは、すでに手元のJSONの `Thumbnail url` フィールドにそのまま入っている**
- サイト側にAPIは無く、1本ずつ手作業でURLを貼る必要がある（41本ぶん）。自動化もできない
- → **サイトは経由せず、JSONの `Thumbnail url` を直接ダウンロードする。** 得られる画像は完全に同一で、全自動になる

実測: 41本すべての `maxresdefault.jpg` が HTTP 200 で取得可能（63KB〜120KB程度）。

### 5.2 取得方法（既存 `scripts/16-fetch-og-thumbnails.js` と同じ作法）

1. `Thumbnail url` を `fetch`
2. 404の場合は `sddefault.jpg` → `hqdefault.jpg` の順にフォールバック
   （古い・低画質アップロードでは `maxresdefault` が存在しないことがある。現データでは発生しないが実装しておく）
3. `.tools/*/bin/ffmpeg.exe` で長辺1200px上限・JPEG `-q:v 4` に再エンコード
   （サイト内の他の写真と寸法・ファイルサイズのプロファイルを揃えるため。既存16番と同一設定）
4. `content/images/posts/{ID}-{VIDEO_ID}.jpg` として保存
5. `24-build-card-thumbs.js` → `17-sync-images.js` でカード用400px版生成と `prototype/` への同期

**ホットリンク（`i.ytimg.com` のURLを直接 `<img src>` に書く）はしない。**
既存の全画像と同じくローカル保存する（表示速度・可用性・オフラインビルドのため）。

### 5.3 まとめポストのサムネイル = コラージュバナー

まとめポストは動画が複数あるため代表画像を1枚に決められない。既存の
`2090000000000000005-collage-banner.jpg`（Kitbashまとめ）と同じ手法を使う。

- 収録動画のサムネイルをグリッド合成して1枚のバナーにする
  - 2本 → 横並び（レターボックス） / 3〜4本 → 2×2 / 5〜6本 → 3×2 / 7〜9本 → 3×3
  - 16:9のタイルを正方グリッドに並べると全体も16:9になるため、2×2と3×3はカンバスをちょうど埋める
  - 10本以上は先頭9本のみバナーに載せる（それ以上はタイルが小さく判別できない）
- 出力 **1200×675（16:9）**、JPEG `-q:v 4`。docs/03_spec.md §8「サムネイルは16:9で統一」に合わせる
  （既存のKitbashバナーは800×376。今回から16:9に揃える）
- ファイル名 `images/posts/{ID}-collage-banner.jpg`、本文冒頭の `![](...)` として配置
- 個々の動画サムネイルは `source_url[].image` に入り、記事下部のリンクカードに1本ずつ画像付きで並ぶ
- **合成用スクリプトは未整備**（Kitbashバナーは手作業）。§7 で新規作成する

独立ポストは動画1本のサムネイルをそのままヒーロー画像にする（コラージュ不要）。

### 5.4 権利について

YouTubeのサムネイルは動画の著作物。「紹介記事内で、当該動画へのリンクとセットで引用として掲載する」用途に限る。
`Description` の全文転記は行わない（§2）。

---

## 6. プレイリスト = ガイドページ

プレイリストそのもの（`ACES and OCIO` 等）は、ポストではなく
**`prototype/guides/` のガイドページ**として表現するのが既存アーキテクチャに合う。

- `scripts/lib/guides-data.js` に `aces-ocio` ガイドを追加 → `node scripts/22-build-guides.js`
- 「ACESとOCIOを一通り理解する」導線として、上記の関連ポスト群をまとめられる
- `Environment_Generalist` は粒度が広すぎるので単独ガイドにはせず、既存の
  `environment.html` / `gis-terrain.html` / `houdini-environment.html` に流し込む
  （GIS系4本 — GIS Solutions / Julian Jones / SideFX OSM / IanHubert — は `gis-terrain` に綺麗に収まる）

---

## 7. 実装パイプライン（新規スクリプト）

既存の番号体系（`01`〜`30`）の続きに追加する。

| # | スクリプト | 役割 |
|---|---|---|
| 31 | `31-yt-normalize.js` | `_raw/youtube_playlist/*.json` を読み、動画IDを抽出。`data/yt-processed.json` と突き合わせて `skip`/`append`/`create` を判定（§4.6）し、`create` を §3 のルールでグループ化。§4.2 のID採番と §4.5〜4.6 の `date` 割り当てまで行い `_work/yt-units.json` を出力 |
| 32 | `32-yt-fetch-thumbs.js` | 各動画のサムネイルをDL・再エンコードし、まとめポストにはコラージュバナーも生成（`append` 時はバナーを再生成） |
| 33 | `33-yt-write-posts.js` | AI生成フィールド（title / summary / tags / category / body）を `_work/yt-ai-fields.json` から読み、`content/posts/*.md` を書き出す。完了後 `data/yt-processed.json` を更新 |

`31` は `--dry-run` を必須で持たせる。`append` は既存ポストの書き換えなので、
何がどう変わるかを実行前に確認できるようにする。

その後は既存フローに合流:

```bash
node scripts/25-tag-taxonomy.js
node scripts/24-build-card-thumbs.js
node scripts/17-sync-images.js
node scripts/08-build-tip-pages.js
node scripts/11-build-archive.js
node scripts/14-build-homepage.js
node scripts/20-build-search-index.js
node scripts/21-build-rss.js
node scripts/26-build-topics.js
node scripts/27-build-tools.js
node scripts/22-build-guides.js
```

AI生成フィールドは既存の `_work/ai-fields-batch*.json` と同じ形式にして、
X移行時と同じレビューフロー（`ai_confidence: low` は `_triage/` 行き）に乗せる。

---

## 8. 決定事項

実装・実行済み（2026-09-06、バッチ1）。

| 論点 | 決定 | 反映先 |
|---|---|---|
| グルーピング | チャンネル名で横断グループ化。2本以上でまとめポスト、1本なら独立 | §3.1 |
| 企業・媒体チャンネル | 個人チャンネルと区別せず同じルールを適用 | §3.1 |
| `Maarten Nauta` の2時間41分の座談会 | 特別扱いせず、他と同じ単独ポストにする | §3.2 |
| `date`（初回） | 既存アーカイブ期間に `step = floor(332/32)` = 10日刻みで等間隔配置 | §4.5 |
| `date`（追加バッチ） | 6件以下は実行日、7件以上は前回実行日からの期間に散らす。未来日は付けない | §4.6 |
| 本文 | AI生成。`Description` の内容を日本語で要約したものを本文にする | §4.4 / §4.4.1 |
| 本文の表示 | ページには出さない。Markdown側の記録として持つだけにする | §4.4 |
| 追加運用 | `data/yt-processed.json` による差分実行。既存ポストのID・slug・`date` は再計算しない | §4.6 |
| サムネイル | JSONの `Thumbnail url` を直接DL。まとめポストはコラージュバナー | §5 |

### 実行結果

| | バッチ1 | バッチ2 |
|---|---|---|
| 入力 | `ACES and OCIO` + `Environment_Generalist`（41本） | `WatchLater`（90本） |
| skip（処理済み） | 0 | 41 |
| 既出（既存ポストがカバー） | 0 | 9 |
| 新規ポスト | 32件 / 41本 | 59件 / 66本 → レビュー後54件 |
| 既存ポストへ追記 | 0 | 9件 / 15本 |
| `date` の割り当て | 2025-10-08 .. 2026-08-14（10日刻み） | 2025-10-08 .. 2026-07-25（5日刻み） |

- サイト全体で 230 → 316ポスト、うちYouTube移行ぶんが86件
- レビューで5件を不採用として削除（マニフェストに `excluded` として記録済み、再実行で復活しない）
- 1件を1本に削減（Maxime Gerardin、17秒の作品映像を除外）
- frontmatter検証: `topics` / `tools` / `category` すべて既存タクソノミー内、slug重複0、孤立画像0
- ブラウザ確認: コンソールエラーなし、9本まとめのバナーと動画別サムネイルとも 200 OK

### バッチ2で判明し修正した不具合

| 症状 | 原因 | 対処 |
|---|---|---|
| 既存Xポストと9本重複 | `31` がマニフェストしか見ていなかった | 全ポストから動画IDを抽出して照合（§4.6） |
| 59件の `date` が同日に潰れた | 同日2回目で `prevRun..runDate` が0日 | サイズで戦略を決めるよう変更（§4.6） |
| 追記のバナーが既存動画を落とす | 追記ユニットが新規動画しか持たない | `collageImages` に既存画像も含める |
| 追記で既存動画にサムネが付かない | 単独ポストの `source_url` は文字列でラベルも画像もない | ディスク上の画像を引き当てて補完 |
| 追記でファイル名がタイトルと乖離 | `writeAppend` がリネームしていなかった | タイトル由来の名前にリネーム（slugは不変） |

未決事項なし。
