---
title: "Carlo Jongen — FAB/MegascansアセットをUSD化するHoudiniツール解説2本"
slug: "carlo-jongen-asset-usd-builder"
date: 2026-07-05
category: "pipeline"
type: "brief"
tags: ["Houdini", "USD", "Solaris", "Megascans", "Instancing", "sidefx"]
topics: ["environment"]
tools: ["houdini", "usd"]
source_url: [{"url":"https://www.youtube.com/watch?v=KWSud0ZphtY","label":"Asset USD Builder 1.1 — 統合された新バージョンの紹介（3:09）","image":"images/posts/2091000000000000028-KWSud0ZphtY.jpg"},{"url":"https://www.youtube.com/watch?v=s0XeBWZbddE","label":"Houdini FAB to USD Builder — FABアセットの一括USD変換デモ（0:49）","image":"images/posts/2091000000000000028-s0XeBWZbddE.jpg"}]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000028"
summary: "FABやMegascansのアセットをUSDへ一括変換しSolarisでのインスタンシングまで自動化するAsset USD Builderの紹介と、その前身にあたるFAB to USD Builderの短いデモ。"
source_type: "youtube-playlist"
playlists: ["Environment_Generalist"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000028-collage-banner.jpg)

Carlo Jongenさんの「Asset USD Builder」のアップデート版の紹介です。Orbolt経由で配布されています。

従来のFAB用とMegascans用のビルダーを統合して、一から書き直したものとのことです。主な機能として挙げられているのは、FABやMegascansのアセットのUSDへの一括変換、MaterialXまたはRedshiftマテリアルでのSolarisネットワーク構築、FABアセットのプレビュー画像のベイク、USDインスタンシング用のサブネットワークの自動生成、種類とバリアントをランダムに選んだインスタンス例の自動作成、レンダー出力とプロキシ出力それぞれへのポリゴン削減の設定です。

スキャンアセットをSolarisに載せる工程はどうしても手数が多くなるところなので、そこをまとめて面倒みるツールとして参照先に置いておきます。
