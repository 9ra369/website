---
title: "Lucas Piazzini氏 — 金属の微細な傷が生む反射と、レンダラでの再現アプローチ比較"
slug: "lucas-piazzini-forgotten-metal-knowledge"
date: 2026-09-13
category: "tutorial"
type: "brief"
tags: ["Lookdev", "Rendering", "Shading", "V-Ray", "Blender", "Arnold"]
topics: ["lookdev", "lighting-rendering"]
tools: ["v-ray", "blender", "arnold"]
source_url: [{ "url": "https://www.youtube.com/watch?v=uz8PIi3ELJg", "label": "Lucas Piazzini「Forgotten Metal Knowledge | Vray, Cycles, Arnold..」（YouTube）" }, { "url": "https://cgworld.jp/flashnews/01-202608-MetalKnowledge.html", "label": "CGWORLD.jp の紹介記事" }, { "url": "https://www.artstation.com/lucaspiazzini", "label": "Lucas Piazzini氏のArtStation" }]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000008"
summary: "ILMのジェネラリストLucas Piazzini氏による解説動画。映画『アイアンマン』のCGスーツに見られる「反射のテールオフ」に着目し、金属表面の微細な傷が複雑な反射を生む物理的な仕組みを顕微鏡写真で示したうえで、マテリアルレイヤリング・クリアコート・GGXといった再現方法をV-Ray、Blender（Cycles）、Arnoldで比較している。"
ai_confidence: "high"
status: draft
---

![マテリアルレイヤリングとGround Truthの比較](images/posts/2090000000000000008-metal-00-material-layering.webp)

![顕微鏡で見た金属表面の微細な傷](images/posts/2090000000000000008-metal-01-microscope.webp)

![クリアコートによる再現のPros/Cons](images/posts/2090000000000000008-metal-02-coat.webp)

ILMのジェネラリスト、Lucas Piazzini氏がYouTubeで「Forgotten Metal Knowledge | Vray, Cycles, Arnold..」という動画を公開しています！
（以前このサイトでもArtStationの背景制作解説を紹介した方です）

テーマは、映画『アイアンマン』のCGスーツに見られる「Reflection Tail-off（反射のテールオフ）」。
実際の金属表面を顕微鏡で観察して、深さや密度、幅の違う微細な傷が無数に重なっていることが、あの複雑な反射の原因になっていることを示しています。

そのうえで、レンダラ上で再現する方法を複数比較しています。

- **マテリアルレイヤリング**: 複数のマテリアルを重ねてブレンドする方法。リッチでリアルな見た目を作れる
- **クリアコート**: 手軽で計算コストも低いが、誘電体としてふるまうので色が乗らず、色付きの金属には不向き
- **GGX反射モデル**: 負荷はほぼゼロだが、細かい制御が難しく、パラメータの見え方も環境に依存する

クリアコートのスライドでは「Just not suitable for serious/hero lookdev」とまで書かれていて、手軽な"それっぽい"反射と、ヒーローアセットで求められる反射の違いがはっきり見えるのが面白いです。
金属のラフネスを1枚のテクスチャで済ませがちですが、傷の重なりがハイライトの裾野を作っている、という物理的な理由から考えると、レイヤーで組む意味が腑に落ちるなと。

V-Ray、Cycles、Arnoldと複数のレンダラで比べているので、普段使っている環境に置き換えて試しやすいと思います。ぜひ動画で見てみてください！
（Lucas Piazzini氏、とても参考になる解説ありがとうございます）
