---
title: "Triplanar — 負荷対策、面の向きに応じたPlanar/Biplanar使い分け"
slug: "triplanar-planar-biplanar"
date: 2026-08-02
category: "tips"
type: "brief"
tags: ["Rendering", "Texturing"]
topics: ["lighting-rendering","lookdev"]
tools: []
source_url: "https://www.linkedin.com/feed/update/urn:li:activity:7483813488113389568/"
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2083727331286561056"
summary: "Triplanarの計算負荷への対応策として、面の向きに応じてplanar projection（地面など上向きの面）とbiplanar projection（建物など横向きの面）を選択的に使い分けるという手法。"
ai_confidence: "high"
status: draft
---

対応策：Triplanarを選択的に使用

ほとんどの面が上を向いている(地面など)
→ planar projection(1方向からの投影)

ほとんどの面が横を向いている(建物など)
→ biplanar projection(2方向からの投影)

LinkedIn(同ポスト)
https://www.linkedin.com/feed/update/urn:li:activity:7483813488113389568/ https://x.com/kuramaKageya/status/2083725842044387772

![](images/posts/2083727331286561056-HOrh1IAagAAuSDJ.jpg)
![](images/posts/2083727331286561056-HOrh2J3acAAVZFl.jpg)
![](images/posts/2083727331286561056-HOrh3CGaMAAEj6s.jpg)
