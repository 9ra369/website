---
title: "Adobe公式 — Substance 3D PainterのACES対応を解説するシリーズ全3本"
slug: "substance-3d-painter-aces-series"
date: 2026-03-17
category: "tutorial"
type: "brief"
tags: ["Substance Painter", "ACES", "OCIO", "Color Management", "Texturing", "Maya"]
topics: ["lookdev"]
tools: ["substance", "maya"]
source_url: [{"url":"https://www.youtube.com/watch?v=hDiYqODGoHg","label":"01 — Color Space Fundamentals（7:04）","image":"images/posts/2091000000000000017-hDiYqODGoHg.jpg"},{"url":"https://www.youtube.com/watch?v=WrFqBNI6Tx4","label":"02 — OCIO & ACEScg in Painter（10:27）","image":"images/posts/2091000000000000017-WrFqBNI6Tx4.jpg"},{"url":"https://www.youtube.com/watch?v=Lksg6Fum3gw","label":"03 — Textures in Maya and Blender（9:31）","image":"images/posts/2091000000000000017-Lksg6Fum3gw.jpg"}]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000017"
summary: "Substance 3D PainterでACESを扱うための公式解説シリーズ。カラースペースの基礎、PainterでのOCIO設定、Maya・Blenderへの受け渡しを3本で扱う。"
source_type: "youtube-playlist"
playlists: ["ACES and OCIO"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000017-collage-banner.jpg)

Adobe公式による、Substance 3D PainterでACESを扱うための解説シリーズ全3本です。

01はカラースペースの基礎回で、カラースペースとは何か、sRGBとガンマカーブ、そしてACESとACEScgが何なのか、なぜACESが業界標準として使われるのかを扱います。テクスチャリングの文脈に絞った説明になっているのが、汎用のカラーマネジメント解説との違いです。

02が実作業の中心で、PainterがOCIOでACEScgをどう扱うかという話です。OCIOロール、ディスプレイトランスフォーム、カラーデータとスカラーデータの区別、テクスチャやHDRIをインポートするときのカラースペース指定、エクスポート時の指定、と押さえるべき箇所が順に出てきます。

03は他ソフトへの受け渡しで、書き出したACEScgテクスチャをMayaとBlenderで正しく読み込む手順です。Painterで見えていたものがレンダリング時にそのまま出るようにする、という着地点になっています。

3本で約27分と短く、Painterを使っていてACESまわりが曖昧なままになっている場合に一気に整理できる内容です。
