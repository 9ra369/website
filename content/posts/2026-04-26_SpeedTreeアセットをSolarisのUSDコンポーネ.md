---
title: "SpeedTreeアセットをSolarisのUSDコンポーネントに変換するHDA"
slug: "masao-hieno-speedtree-component-builder"
date: 2026-04-26
category: "pipeline"
type: "brief"
tags: ["Houdini", "Solaris", "USD", "SpeedTree", "HDA", "sidefx"]
topics: ["environment", "pipeline"]
tools: ["houdini", "usd", "speedtree"]
source_url: "https://www.youtube.com/watch?v=u_uPCxizMTA"
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000021"
summary: "SpeedTreeから書き出したアセットを、Solaris上でUSDとMaterialXシェーダのコンポーネントに組み立てる自作HDAの紹介。"
source_type: "youtube-playlist"
playlists: ["Environment_Generalist"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000021-u_uPCxizMTA.jpg)

SpeedTreeから書き出したアセットを、SolarisでUSDのコンポーネントとして組み立てる自作HDAの紹介です。

仕組みとしては、SpeedTreeがエクスポート時に自動生成する.stmatファイルを利用しています。このファイルにテクスチャやマテリアル設定、各種の値が入っているので、それを読んでMaterialXのシェーダごとコンポーネントを構築する、という流れです。SpeedTreeが提供している標準のPythonインポートスクリプトをカスタマイズしてHDAに組み込んだ、と説明されています。

植生アセットをUSDベースのパイプラインに載せる部分は毎回手作業になりがちなので、そこを自動化した事例として参考になります。
