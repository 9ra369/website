---
title: "Nachiket Bhand氏 — フォトグラメトリの波打つメッシュを平面化するBlenderアドオン「Planer」"
slug: "planer-photogrammetry-mesh-refiner"
date: 2026-09-20
category: "pipeline"
type: "brief"
tags: ["Blender", "Photogrammetry", "Retopology", "GIS", "Architecture"]
topics: ["gis-digitaltwin", "pipeline"]
tools: ["blender"]
source_url: [{ "url": "https://superhivemarket.com/products/planer--photogrammetry-mesh-refiner", "label": "Planer — Photogrammetry Mesh Refiner（Superhive Market、$35）" }]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000015"
summary: "Nachiket Bhand氏が、Google 3D Tilesやドローン測量由来のフォトグラメトリメッシュにありがちな「波打った壁」「ノコギリ状の稜線」「丸まった角」を、平面検出とスナップで解消するBlenderアドオン「Planer」をSuperhive Marketで公開（$35、Blender 4.2〜5.2対応）。UV・テクスチャ・マテリアルを一切壊さず、結果の元サーフェスからの偏差を数値で報告してくれるのが特徴。"
ai_confidence: "high"
status: draft
---

![製品バナー: Same Geometry. Sharper Results.](images/posts/2090000000000000015-planer-03-product-banner.webp)

![Before/After: 都市街区まるごとのフォトグラメトリをPlanerで整形](images/posts/2090000000000000015-planer-00-cityblock-before-after.webp)

![「Refine」ワンクリックでの整形デモ](images/posts/2090000000000000015-planer-01-refine-in-place.webp)

![Before/After: 民家メッシュのノイズが平面・シャープエッジに](images/posts/2090000000000000015-planer-02-house-before-after.webp)

Nachiket Bhand氏が、フォトグラメトリ由来のメッシュにありがちな崩れを直すBlenderアドオン「Planer」をSuperhive Market（旧Blender Market）で公開しています。

Google Photorealistic 3D Tilesやドローン測量、その他フォトグラメトリパイプラインから出てくるメッシュは決まって、本来平らな壁が波打ち、屋根の稜線がノコギリ状になり、本来シャープなはずの角が丸くつぶれてしまう、とのこと。よくある対処法（スムージング・リメッシュ・デシメーション・手動リトポロジー）はそれぞれディテールを失ったりUVを壊したりベイク済みテクスチャがにじんだりと、何かしらの代償を伴います。

Planerは、ノイズの乗ったメッシュの中に隠れている「平面」を検出し、ジオメトリをその平面上にスナップさせることで、壁を本当に平らに、稜線を直線に、角をシャープな点に「解決」するアプローチを取っています。処理は元の頂点ループを保ったコピー上でジオメトリだけを動かす方式なので、UV・マテリアル・テクスチャはそのまま引き継がれ、再ベイクやデータ転送によるにじみが発生しないとのことです。元メッシュは変更されず、常に新しい`REFINED_`付きのオブジェクトとして出力される点も安心できます。

もう一つの特徴が、処理のたびに元サーフェスからの偏差（deviation）を数値で報告してくれる点です。都市街区まるごとの例では平均偏差7cm、単体の55m規模の建物では平均偏差2cm（バウンディング対角線の約0.1%）程度とのことで、「なんとなく元に忠実そう」ではなく数値で検証してクライアント報告にそのまま使えるのが実務的だと感じました。

内部的にはBilateral Normal Filtering→平面領域の検出・統合→平面スナップ＋シャープエッジ/コーナー再構築という流れで、3D Tilesにありがちな粗い大きめの三角形タイルでも面積ベースの判定で拾えるように設計されているそうです。Blenderに同梱のnumpyのみを使ったピュアPythonで、外部依存なし。対応はBlender 4.2〜5.2、価格は$35（12か月のサポート・アップデート付き）です。
ポリゴン数の削減や穴埋め・水密化はできない（フォトグラメトリ特有の開いたシェルはそのまま）とのことですが、「建物が溶けたように見える」という悩みそのものにはピンポイントで効きそうなツールです。
（Nachiket Bhand氏、便利なアドオンの公開ありがとうございます）
