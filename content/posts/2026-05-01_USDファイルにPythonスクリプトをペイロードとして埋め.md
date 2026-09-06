---
title: "USDファイルにPythonスクリプトをペイロードとして埋め込む"
slug: "immersive-workflow-3d-python-payloads-usd"
date: 2026-05-01
category: "pipeline"
type: "brief"
tags: ["USD", "Python", "Pipeline", "Tools"]
topics: ["pipeline"]
tools: ["usd", "python"]
source_url: "https://www.youtube.com/watch?v=FqjhS2zDmwc"
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000074"
summary: "処理の指示をUSDファイル自体に同梱し、パイプラインの異なる環境でも処理できるようにするという手法の解説。usd-coreモジュールで一から構築する。"
source_type: "youtube-playlist"
playlists: ["WatchLater"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000074-FqjhS2zDmwc.jpg)

USDファイルの中にパイプラインそのものを同梱してしまう、という変わったアプローチの解説です。

処理の指示をUSDに直接パッケージすることで、別のネットワーク上の、別のパイプラインでもそのファイルを処理できるようにする、という発想です。動画ではusd-coreモジュールを使って、Pythonで一からUSDファイルを構築していきます。

19分ほど。一般的な使い方ではありませんが、USDを単なるシーン記述以上のものとして扱う事例として面白い内容です。
