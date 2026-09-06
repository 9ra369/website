---
title: "BlenderGIS — OpenTopographyのAPIキーを設定して標高データを取得する"
slug: "julian-jones-blendergis-api-key"
date: 2025-12-27
category: "tutorial"
type: "brief"
tags: ["Blender", "Terrain", "GIS", "Environment"]
topics: ["environment"]
tools: ["blender"]
source_url: "https://www.youtube.com/watch?v=VCifUEBcQIU"
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2091000000000000009"
summary: "OpenTopography側のAPIキー必須化でBlenderGISの標高データ取得が失敗する問題を、設定を書き換えて解消する手順の解説。"
source_type: "youtube-playlist"
playlists: ["Environment_Generalist"]
ai_confidence: "high"
status: draft
---

![](images/posts/2091000000000000009-VCifUEBcQIU.jpg)

BlenderGISでOpenTopographyの標高データが取得できなくなった場合の対処手順です。

原因はOpenTopography側がAPIキーを要求するようになったことで、BlenderGISのElevation Server設定にキーを追加すれば解決します。動画では、opentopography.orgでアカウントを作りMyOpenTopoからAPIキーを発行するところから、Preferences内のアドオン設定でSRTM 30mのURLを書き換えてキーを付け足すところまでを実演しています。

地形データをBlenderに持ってくる作業でつまずきやすい箇所なので、同じエラーに当たったときの参照先として置いておきます。
