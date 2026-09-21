---
title: "Houdiniノート — requestsとPillowでWeb上の画像をPython SOPから直接ポイント化する"
slug: "houdini-load-image-from-web-python"
date: 2026-09-21
category: "tutorial"
type: "brief"
tags: ["Houdini", "Python", "Point Cloud", "Tutorial"]
topics: ["pipeline"]
tools: ["houdini", "python"]
source_url: [{ "url": "https://technical-notes.com/houdini/2021/05/20/load-image-from-web/", "label": "WEBから画像を読み込む（Houdiniノート）" }]
language: "日本語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000018"
summary: "Pythonのrequestsとimage処理ライブラリPillowを使い、WEB上の画像URLから直接ピクセルデータを取得してHoudiniのポイントとして並べるPython SOPのコードスニペット。ローカル保存やCOPsを経由せずに、画素ごとの色（Cd属性）と位置を持つ点群を生成できる。"
ai_confidence: "high"
status: draft
---

![元になったサンプル画像](images/posts/2090000000000000018-houdini-webimage-00-source.webp)

「とあるデザイナーのテクニカルノート」のHoudiniノートから、WEB上の画像をそのままポイントクラウド化するテクニックを紹介します。

Python SOPの中でrequestsライブラリを使ってURLから画像データを取得し、Pillow（PIL）の`Image.open(io.BytesIO(...))`でデコードした上で、画素を1つずつ`geo.createPoint()`で生成しながら位置（x, 0, y）とCd属性（0〜255を0〜1に正規化したRGB）を設定していく、という内容です。コードはおよそ15行程度で、ファイルへの保存やCOPsネットワークを経由する必要が一切ありません。

![実行結果 — 画素がそのままポイントとして並べられた状態](images/posts/2090000000000000018-houdini-webimage-01-result.webp)

実行すると、画像の画素がそのままグリッド状のポイント群として並べられ、色属性にも元画像の色がそのまま入ります。ローカルにファイルを置かずにネットワーク越しの画像をジオメトリの参照データとして使えるので、リファレンス画像をそのまま点群化してビューポート内で確認したい時や、簡易的なハイトフィールド/カラーマップ生成の下ごしらえに便利そうなテクニックだと思います。
