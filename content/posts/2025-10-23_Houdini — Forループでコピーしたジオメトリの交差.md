---
title: "Houdini — Forループでコピーしたジオメトリの交差を避ける"
slug: "houdinisimon-avoid-intersections-for-loops"
date: 2025-10-23
category: "tutorial"
type: "brief"
tags: ["Houdini", "sidefx", "Procedural Modeling", "Scattering"]
topics: ["environment"]
tools: ["houdini"]
source_url: "https://www.youtube.com/watch?v=Qp-VjCHTrzo"
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000036"
summary: "Forループでポイントにジオメトリをコピーする際、既に置いたものと交差する配置を弾いて重なりを防ぐHoudiniの手法解説。"
source_type: "youtube-playlist"
playlists: ["WatchLater"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000036-Qp-VjCHTrzo.jpg)

Houdiniで、Forループを使ってジオメトリをポイント上に配置するときに起きる「めり込み」を避ける方法です。

壁面などにオブジェクトをプロシージャルに並べていくと、既に置いたものと新しく置くものが交差してしまいます。この動画では、交差が発生した場合は新しい方を配置しない、という判定をループ内に組み込むアプローチを扱っています。

スキャッター系のセットアップで詰まりやすいところなので、対処法として押さえておける内容です。
