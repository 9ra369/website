---
title: "HoudiniのGPUツールチェーンでUnreal上の64km²地形をリアルタイム編集"
slug: "adrian-pan-houdini-gpu-landscape-unreal"
date: 2026-03-12
category: "showreel"
type: "brief"
tags: ["Houdini", "Terrain", "Unreal Engine", "sidefx", "Environment"]
topics: ["environment"]
tools: ["houdini", "unreal"]
source_url: "https://www.youtube.com/watch?v=19gIzQGnSaU"
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000064"
summary: "8129×8129pxの64km²地形をUnrealエディタ上でリアルタイム編集する自作Houdiniツールチェーンのショーリール。計算の大半をGPUで処理している。"
source_type: "youtube-playlist"
playlists: ["WatchLater"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000064-19gIzQGnSaU.jpg)

Adrian Panさんによる、自作のHoudini地形ツールチェーンのショーリールです。

8129×8129ピクセル、64平方キロメートルの地形をUnrealエディタ上でリアルタイムに編集できる、という内容になっています。計算のほとんどをCUDA／OpenCLでGPU処理していて、山の形状を素早く出すためのGPU SDFや、河川・湖・道のためのGPU重み付き距離場アルゴリズムなどが挙げられています。

1分強の短い映像です。解説動画ではありませんが、地形ツールをどこまで作り込めるかの到達点として見応えがあります。
