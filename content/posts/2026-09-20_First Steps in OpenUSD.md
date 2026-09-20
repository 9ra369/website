---
title: "「First Steps in OpenUSD」— NVIDIA公式ドキュメントを整理し直した無料のUSD学習サイト"
slug: "openusd-first-steps"
date: 2026-09-20
category: "website"
type: "brief"
tags: ["USD", "OpenUSD", "NVIDIA Omniverse", "Tutorial"]
topics: ["pipeline"]
tools: ["usd"]
source_url: [{ "url": "https://owllaxe.github.io/OpenUSD-First-Steps/", "label": "First Steps in OpenUSD（公式サイト）" }, { "url": "https://github.com/Owllaxe/OpenUSD-First-Steps", "label": "GitHubリポジトリ（ソース）" }]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000014"
summary: "OpenUSDをNVIDIAの公式ドキュメントから再構成した、無料のコミュニティ学習サイト「First Steps in OpenUSD」。6章33セクション（約1.7時間）を、前の章で出てきた言葉だけを使うという依存関係順に並べており、ブラウザ内でUSDステージを実際に操作しながら学べる「USD Sandbox」も内蔵している。"
ai_confidence: "high"
status: draft
---

![「First Steps in OpenUSD」のトップページ](images/posts/2090000000000000014-openusd-00-hero.webp)

OpenUSDの学習サイト「First Steps in OpenUSD」が公開されています。GitHub上で個人（Owllaxe氏）が運営するコミュニティプロジェクトで、NVIDIA公式のOmniverse/OpenUSDドキュメントを土台に、内容を整理し直して1枚の読み物にまとめ直しているのが特徴です。

構成は全6章・33セクション・合計約1.7時間で、章の並び順が「前の章で出てきた言葉しか使わない」という依存関係の順序になっているとのこと。

1. What OpenUSD is — OpenUSDとは何か、何を解決するのか、重要な2つの考え方
2. Stage, Prim, Layer — Stage・Prim・Attribute・Layer・Compositionの仕組み
3. Reuse, Don't Copy — コピーがパイプラインを壊す理由（Reference・Override・Payload）
4. Structure a USD Asset — 他人が読めるアセット構造（階層・命名・バージョニング）
5. Interoperability: Moving Between Tools — ツール間を移動する際に何が残り何が失われるか
6. Explore Real OpenUSD Scenes — ダウンロードする価値のあるサンプルシーンの紹介

最初から順番に読むだけでなく、知りたい項目に直接ジャンプする使い方もできるようになっています。

個人的に一番面白いのは、ブラウザ内で完結する「USD Sandbox」という自作のミニUSDエディタが埋め込まれている点です。Cube・Sphere・Mesh・Xformなどのprimを配置して移動・回転・スケールでき、4層のレイヤースタックをミュートしたり強度を並べ替えたりしながら、どのレイヤーが勝っているかや`.usda`が実際にどう書き換わるかをリアルタイムに確認できます。フレームワークもライブラリも使わず素のWebGL/JSで組まれているとのことで、Composition（合成）の考え方を手を動かしながら理解するのにちょうど良さそうです。

なお、章立ては13章構成だった旧バージョン（`v13/`以下に今も残っている）から6章に絞り込む形でリライトされたそうで、usdview・USD Composerの使い方・パフォーマンス・ロボティクス関連などはこの新バージョンでは意図的にカットされています。まずはUSDの考え方の骨組みだけを最短で押さえたい人に向いた内容だと思います。
（Owllaxe氏、分かりやすい学習サイトの公開ありがとうございます）
