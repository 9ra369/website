---
title: "山岸氏による「USDとVFXワークフロー概要」解説（Qiita USD Advent Calendar 2024）"
slug: "usd-vfx-workflow-overview-yamagishi"
date: 2026-09-21
category: "article"
type: "explainer"
tags: ["USD", "Houdini", "Pipeline", "VFX"]
topics: ["pipeline"]
tools: ["usd", "houdini"]
source_url: [{ "url": "https://brave-deer-ac6.notion.site/01-USD-VFX-ea644d919d2441378d033bc8f0d5475e", "label": "01. USDとVFXワークフロー概要｜解説（Notion）" }, { "url": "https://qiita.com/advent-calendar/2024/usd", "label": "Qiita USD Advent Calendar 2024" }]
language: "日本語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000019"
summary: "Qiita『Universal Scene Description』アドベントカレンダー2024の記事の1本。VFX制作現場の視点からUSDを解説する山岸氏担当シリーズの1本目で、アセットワーク／ショットワークという2系統のVFX制作フローの全体像と、複数ショットを跨いだアセット参照によるインタラクティブな並列作業の仕組みを、動画中心の解説でまとめている。"
ai_confidence: "high"
status: draft
---

![VFX制作ワークフロー（アセットワークとショットワークの2系統）](images/posts/2090000000000000019-usd-vfx-workflow-00-diagram.webp)

Qiitaの「Universal Scene Description」アドベントカレンダー2024で、山岸氏が担当した「USDとVFXワークフロー概要」シリーズの1本目（全13本の解説記事＋実演記事）を紹介します。

USDを「3DCGのレンダリングシーンを管理するためのオープンソースフレームワーク」と位置づけた上で、VFX制作を「アセットワーク（Model → Rig / Look → Assets）」と「ショットワーク（Tracking → Layout → Animation → Env → FX/CFX → Lighting → Composite）」の2系統に整理し、それぞれがUSDレイヤーとしてどう組み合わさるかを説明しています。ASWF（Academy Software Foundation）やAlliance for OpenUSDといった、USDを支えるオープンソースエコシステムの背景にも触れているのが特徴です。

![shot.usdを介した複数ショット（ep1_itr_0010〜0040）でのインタラクティブな並列作業の例](images/posts/2090000000000000019-usd-vfx-workflow-01-multishot.webp)

個人的に面白かったのは、settings/render_settings/aovs/lightingをまとめたshot.usdを複数のショット（ep1_itr_0010〜0040）が参照する構成で、共通設定を1箇所で管理しながら各ショット側でlighting/fx/cfx/animation/layout/Assetsを重ねられるという「アセット管理によるマルチショットワーク」の図です。Asset側でもlook.usdとmodel.usdをモデラーとルックデブ担当がそれぞれ独立して編集できる、という参照ベースならではの並列作業のイメージが掴みやすいと思います。

記事本文よりも解説動画がメインとのことで、キャプチャ中心の構成になっていますが、Houdini Solaris・NVIDIA Omniverse・KatanaといったUSD実装ツールを横断してVFXパイプラインの全体像を掴みたい人には良い導入になりそうです。
（山岸さん、USDアドベントカレンダーの分かりやすい解説ありがとうございます）
