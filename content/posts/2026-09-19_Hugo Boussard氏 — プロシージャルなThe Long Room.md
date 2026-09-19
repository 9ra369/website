---
title: "Hugo Boussard氏 — トリニティ・カレッジ図書館をHoudiniでプロシージャルに再現"
slug: "hugo-boussard-procedural-long-room"
date: 2026-09-19
category: "showreel"
type: "brief"
tags: ["Houdini", "Procedural Modeling", "Unreal Engine", "Environment", "Architecture"]
topics: ["environment", "pipeline"]
tools: ["houdini", "unreal"]
source_url: [{ "url": "https://www.artstation.com/artwork/mAn0xe", "label": "Hugo Boussard「The Procedural Long Room」（ArtStation）" }, { "url": "https://www.artstation.com/hugo_boussard", "label": "Hugo Boussard氏のArtStation" }]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000012"
summary: "3D StudentのHugo Boussard氏が、Houdiniのプロシージャルモデリング練習として、ダブリンのトリニティ・カレッジ図書館「The Long Room」をフルプロシージャルで再現した作品をArtStationで公開。全体の縦横比から棚の増減まで調整可能なシステムをHoudiniで組み、UVとマテリアル属性付きのFBXとしてUnreal Engineに書き出している。"
ai_confidence: "high"
status: draft
---

![完成したThe Long Roomの再現ショット](images/posts/2090000000000000012-longroom-00-final-render.webp)

![実際のThe Long Roomのリファレンスボード](images/posts/2090000000000000012-longroom-01-reference-board.webp)

![各サブネットワークの役割を色分けしたHoudiniのネットワーク図](images/posts/2090000000000000012-longroom-02-network-breakdown.webp)

![ポイント出力部分のクローズアップ](images/posts/2090000000000000012-longroom-03-point-outputs.webp)

3D StudentのHugo Boussard氏が、ダブリンのトリニティ・カレッジ図書館にある有名な書庫「The Long Room」をHoudiniで完全にプロシージャルに再現した作品「The Procedural Long Room」をArtStationで公開しています。

本人いわく、複雑に絡み合う多数の要素を持つシーンをHoudiniで管理する練習として作ったラボプロジェクトとのことです。The Long Roomの実物が持つ独特な雰囲気を保ちながら、全体の縦横比の調整から棚の増減まで、マクロからミクロまで見た目のアイデンティティを崩さずに変更できるシステムを目指したと説明されています。

生成プロセスはすべてHoudini内で完結していて、UVとマテリアル属性を付けたFBXとして書き出し、Unreal Engineに読み込んでいます。FBXベースのワークフローなので、どのDCC・レンダラでも再現・テストしやすいポータビリティを意識しているとのことです。

ネットワーク図では「青」がポイント生成後にUV・マテリアル付きジオメトリを出力するサブネット、「赤」が処理の最初に生成される各種ポイント出力として色分けされていて、複雑なプロシージャルシステムを整理する際の考え方の参考になります。
（Hugo Boussard氏、丁寧な解説の共有ありがとうございます）
