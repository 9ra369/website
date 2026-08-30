---
title: "リアルタイムTriplanarの計算負荷について（LinkedIn引用）"
date: 2026-08-02
category: "tips"
type: "brief"
tags: ["Rendering", "Texturing"]
topics: ["lighting-rendering","lookdev"]
tools: []
source_url: ""
language: "日本語"
original_post: "https://x.com/kuramaKageya/status/2083725842044387772"
summary: "リアルタイムレンダリングにおけるTriplanarマッピングの計算負荷（LinkedInの投稿を引用して紹介）。UV展開が不要で便利だが、サンプル数が3倍になる分のコストは単純比例せず、L1/L2キャッシュの挙動に左右されるという技術的な補足がある。"
ai_confidence: "high"
status: draft
---

リアルタイムにおけるTriplanarの計算負荷(LinkedInより引用)

UV展開しなくてよく、とても便利だが、それ相応のコストがある
・サンプル数は3倍だが、コストは単純な3倍にはならない。L1/L2キャッシュの挙動に左右される…

![](images/posts/2083725842044387772-HOrfYo3bsAASrVl.jpg)
![](images/posts/2083725842044387772-HOrfa7WbUAERDfA.jpg)
![](images/posts/2083725842044387772-HOrgtvNaMAASYdS.jpg)
![](images/posts/2083725842044387772-HOrg7neaoAAUUUe.jpg)
