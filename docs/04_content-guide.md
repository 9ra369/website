# 記事フォーマット指示書（コンテンツ作成ガイド）

このドキュメントは、Merge VFX&CGのエントリー（記事）を作成する際の**唯一の正となるルール集**です。自分で書く場合はもちろん、AIに過去の紹介コンテンツ（Xの投稿、ブックマーク、メモ等）をこのフォーマットへ変換させる場合の指示書としてもそのまま使えるように設計しています。

> AIに変換を依頼する場合は、このファイル全体をプロンプトに含めた上で「元テキスト」を渡してください。

## 1. ファイル配置とファイル名

```
content/entries/{slug}.md
```

- `slug` は英語kebab-case（半角小文字＋ハイフン）。日本語タイトルからの意訳でよい
- 例: `houdini-vellum-cloth-basics.md`
- 1ファイル＝1エントリー（＝1つの紹介対象）

## 2. Frontmatterフィールド定義

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | string | ○ | エントリーのタイトル。元記事タイトルの直訳ではなく、内容が一目でわかる日本語タイトルにする |
| `url` | string (URL) | ○*1 | 紹介先の外部リンク。自作コンテンツの場合は省略可 |
| `category` | string（下記§3の許容値のみ） | ○ | 大カテゴリのslug。1エントリー1カテゴリ |
| `tags` | string配列 | ○ | 2〜6個。§4のルールに従う |
| `type` | `tutorial` \| `article` \| `tool` \| `reel` \| `interview` \| `resource` \| `note` | ○ | コンテンツの種類 |
| `level` | `beginner` \| `intermediate` \| `advanced` | ○ | §6の基準に従って判定 |
| `software` | string配列 | △ | 関連する主要ソフト名（正式表記。§4参照） |
| `thumbnail` | string（画像パス） | △ | 未取得の場合は省略可。省略時はカテゴリ既定のグラデーション（§3の`thumb class`）が自動適用される |
| `summary` | string（1〜2文、80〜120字目安） | ○ | §5参照。客観的な要約 |
| `memo` | string（複数文可、YAML `\|` ブロック） | ○ | §5参照。自分の考察・評価・活用メモ |
| `rating` | number（1〜5の整数） | ○ | §7の基準で自己評価 |
| `sourceLang` | `ja` \| `en` \| `other` | ○ | 参照先の言語 |

*1 `type: note`（自分の考察のみで外部参照がない場合）を除き必須。

## 3. カテゴリ一覧（`category`の許容値）

**カテゴリの正データは [`data/categories.json`](../data/categories.json)。** このファイルのslugをそのまま使うこと（表記ゆれ厳禁）。以下は現時点のスナップショット（2026-08-08〜）で、`categories.json`更新時はこの表も追随させる。

| slug | label | 対応thumbクラス |
|---|---|---|
| `environment` | Environment | `thumb-environment` |
| `pipeline` | Pipeline/Plugin/Tool | `thumb-pipeline` |
| `article` | Article | `thumb-article` |
| `showreel` | Showreel/Demoreel | `thumb-reel` |

判断に迷う場合は「その情報を後で自分が探すとしたら、どのカテゴリの棚を見るか」で決める。ソフト名（Houdini, Nuke等）は`category`ではなく`software`/`tags`側で表現する（§4参照）。

> 旧11カテゴリ（モデリング/サーフェシング/ライティング/シミュレーション/リギング/撮影/業界動向/学習リソース等）は廃止。既存の`prototype/index.html`・`archive.html`・`entry.html`はこの旧カテゴリのままのデモ内容が残っているため、新カテゴリへの一括移行はまだ未実施（要フォローアップ）。

## 4. タグ・ソフト名の表記ルール

- `tags`は**基本的に英語（Title Case）で統一する**。海外の技術記事・検索キーワードとの親和性を優先するため、日本語タグは原則使わない
  - 良い例: `Houdini`, `Procedural Modeling`, `Environment`, `Scattering`, `Tutorial`, `USD`, `VEX`
  - 避ける例: `houdini`（小文字）, `クロスシム`（和文技法名）
- ソフト名・固有名詞は**公式表記**で統一する
  - 良い例: `Houdini`, `Nuke`, `Blender`, `Unreal Engine`, `Substance Painter`, `Arnold`, `Redshift`, `Karma`, `Python`, `USD`
  - 悪い例: `nuke5`, `UE5`（→`Unreal Engine`とバージョンはタグを分ける）
- `tags`には**技法・概念名**を優先して入れる（`category`や`type`と意味が重複するタグは避ける）
  - 良い例: `Scattering`, `Rim Light`, `Denoising`
  - 避ける例: `Houdini Beginner`（→`Houdini`＋`level: beginner`で表現済み）
- `type`に対応する英語タグ（`Tutorial`, `Article`, `Tool`, `Reel`, `Interview`, `Resource`, `Note`）を`tags`にも1つ含めてよい（`tag-accent`スタイルで強調表示する運用）
- `software`と`tags`のソフト名は重複してよい（`software`は構造化データ用、`tags`は検索・関連表示用）
- タイトル・summary・memo等の本文は引き続き日本語で書く（タグのみ英語）

## 5. `summary` と `memo` の書き分け（最重要）

単なるリンク集にしないための核となるルール。**必ず両方を書く**。

| フィールド | 視点 | 内容 |
|---|---|---|
| `summary` | 三人称・客観 | 元記事/動画が何を解説しているかの要約のみ。自分の感想は書かない |
| `memo` | 一人称・主観 | 自分がどう役立てたか、どこに疑問/注意点を感じたか、自分の制作にどう接続するか |

- `memo`が「良かったです」だけなど中身がない場合は、そのエントリーを**保留**して後で書き足す（AIに変換させる場合も、元テキストに自分の一次コメントが含まれていなければ`memo`は仮置き文言にせず空欄のままにし、後で本人が加筆する）
- `memo`はこのサイトの独自性の源泉であり、AdSense審査やSEOの観点でも最重要フィールド

## 6. `level` 判定基準

| 値 | 基準 |
|---|---|
| `beginner` | ソフトの基本操作を知っていれば追える。専門用語の説明つき |
| `intermediate` | 特定機能・ワークフローの実務知識が前提。中規模の応用がテーマ |
| `advanced` | パイプライン設計、独自ツール開発、内部実装の理解が前提。原典が英語の専門記事であることが多い |

## 7. `rating`（自己評価）基準

| 値 | 基準 |
|---|---|
| 5 | 実制作のやり方を変えた／繰り返し参照している |
| 4 | 具体的に役立った点が明確にある |
| 3 | 参考にはなったが代替情報でも良い／情報がやや古い |
| 2 | 一部のみ参考になった、期待外れな点があった |
| 1 | ほぼ参考にならなかったが記録として残す価値がある（反面教師含む） |

## 8. コピー用テンプレート

```yaml
---
title: ""
url: ""
category: ""
tags: []
type: "article"
level: "intermediate"
software: []
thumbnail: ""
summary: ""
memo: |

rating: 3
sourceLang: "ja"
---
```

## 9. 記入例

```yaml
---
title: "Houdini Vellum入門: 布シミュレーションの基礎"
url: "https://example.com/houdini-vellum-cloth-tutorial"
category: "article"
tags: ["Houdini", "Vellum", "Cloth Simulation", "Tutorial"]
type: "tutorial"
level: "beginner"
software: ["Houdini"]
thumbnail: ""
summary: "Houdini Vellumソルバーを使った布シミュレーションの基本ワークフローを解説した入門記事。セットアップからコリジョン設定、初期パラメータの目安値までを一通りカバーしている。"
memo: |
  パラメータの初期値の目安として非常に参考になった。自分のプロジェクトでは布が重すぎて破綻したため、
  Gravity Scaleを0.6程度まで弱めて調整した。
  Substepsを上げるより先にConstraintの反復回数を見直す方が安定することが多い、という点は今後も意識したい。
rating: 4
sourceLang: "en"
---
```

## 10. 過去コンテンツをまとめる際のワークフロー

1. 元投稿（Xのポスト、ブックマーク、メモ等）を1件ずつ集める
2. `category`を§3の表から1つ選ぶ
3. `summary`（客観要約）を作成
4. `memo`（自分の一次コメント）を、元投稿に自分の言葉が残っていればそれを元に、なければ本人が後で加筆する前提で保留
5. `tags`・`software`を§4のルールで付与
6. `level`・`rating`を判定
7. §8のテンプレートに従ってfrontmatterを組み立て、`content/entries/{slug}.md`として保存

## 11. 公開前チェックリスト

- [ ] `memo`が自分の言葉で書かれている（コピペ・空欄のまま放置していない）
- [ ] `category`が§3のslugと完全一致している
- [ ] `tags`が`category`/`type`と意味重複していない
- [ ] ソフト名の表記が§4のルールに従っている
- [ ] `url`が生きている（リンク切れでない）
