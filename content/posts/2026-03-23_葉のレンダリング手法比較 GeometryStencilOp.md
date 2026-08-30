---
title: "葉のレンダリング手法比較: Geometry/Stencil/Opacityの速度差"
date: 2026-03-23
category: "tips"
type: "brief"
tags: ["Houdini", "Solaris", "Vegetation", "Rendering"]
topics: ["environment","lighting-rendering"]
tools: ["houdini","usd"]
source_url: ""
language: "日本語"
original_post: "https://x.com/kuramaKageya/status/2036031841292149105"
summary: "木の葉のレンダリング時間を、Geometry（16秒）、Stencil（27秒）、Opacity/Texture（2分35秒）の3手法で比較検証。Solarisでは、Scatterする場合はAlphaでモデルをカットアウトし、それ以外はOpacityなしで使うのが最適ではないかと考察している。"
ai_confidence: "high"
status: draft
---

木の葉っぱがOpacityベースとStencil, Geometryの時のレンダリング時間の違いを説明しています。

レンダリング時間が短い順に

Geometry: 16秒
Stencil: 27秒
Opacity (Texture): 2分35秒

Solarisでは、ScatterするならAlphaでモデルをCuoutして、それ以外はそのままOpacityなしで使うのが最適か…

![](images/posts/2036031841292149105-HEFrOYUasAAP1wz.jpg)
