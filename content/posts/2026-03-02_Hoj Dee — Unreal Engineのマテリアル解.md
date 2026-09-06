---
title: "Hoj Dee — Unreal Engineのマテリアル解説2本（Naniteテッセレーションとセルボミング）"
slug: "hoj-dee-unreal-material-techniques"
date: 2026-03-02
category: "tutorial"
type: "brief"
tags: ["Unreal Engine", "Texturing", "Materials", "Nanite"]
topics: ["lookdev"]
tools: ["unreal"]
source_url: [{"url":"https://www.youtube.com/watch?v=X5LsyzjKFGI","label":"Nanite Tessellation + Vertex Painting with Height Lerp（14:57）","image":"images/posts/2091000000000000062-X5LsyzjKFGI.jpg"},{"url":"https://www.youtube.com/watch?v=tQ49FnQjIHk","label":"No More Texture Repetition! — Cell Bombingでタイリングを解消する（25:16）","image":"images/posts/2091000000000000062-tQ49FnQjIHk.jpg"}]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000062"
summary: "NaniteテッセレーションとハイトLerpを使った頂点ペイントの回と、テクスチャの繰り返しを解消するセルボミングの回の2本。"
source_type: "youtube-playlist"
playlists: ["WatchLater"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000062-collage-banner.jpg)

Hoj DeeさんのUnreal Engineマテリアル解説を2本まとめました。どちらも地形や壁面の見た目を詰める話です。

1本目はハイトLerpと頂点ペイント、そしてNaniteテッセレーションを組み合わせたマテリアルの作り方です。Naniteメッシュに対する頂点ペイントの扱いまで踏み込んでいます。

2本目はテクスチャの繰り返しを消す「Texture Cell Bombing」の実装です。ランダムなスケール・オフセット・回転をかけ、回転させたときにノーマルが破綻する問題の対処、そしてマテリアルファンクション化まで扱われます。タイリングの目立ちは背景で必ず出る問題なので、実装を一度追っておくと効きます。
