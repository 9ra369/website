---
title: "Hugo Boussard氏 — 文法ベースで道路断面を組む無料Houdini HDA「Grammar Road」"
slug: "hugo-boussard-grammar-road-hda"
date: 2026-09-19
category: "pipeline"
type: "brief"
tags: ["Houdini", "HDA", "Procedural Modeling", "Road Generation", "Pipeline"]
topics: ["pipeline"]
tools: ["houdini"]
source_url: [{ "url": "https://www.artstation.com/artwork/DYka29", "label": "Hugo Boussard「Grammar Road - HDA」（ArtStation）" }, { "url": "https://gitlab.com/hugo.boussard.3d/grammar-road-open-demo", "label": "Grammar Road - Open Demo（GitLab、ダウンロード）" }, { "url": "https://www.artstation.com/hugo_boussard", "label": "Hugo Boussard氏のArtStation" }]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000013"
summary: "Hugo Boussard氏が、入力カーブから道路断面をプロシージャルに生成するスタンドアロンのHoudini HDA「Grammar Road」を無料公開。歩道・車線・自転車レーン・バリア・中央分離帯・駐車帯・トラム軌道などを、読みやすいテキスト文法で組み合わせて道路プロファイルを定義でき、JSONの「文法ウォレット」でパターンを整理できる。GitLabでソース込みで公開されている。"
ai_confidence: "high"
status: draft
---

![Grammar Roadで生成した道路断面のバリエーション（Urban Basic / Tram Urbain Street / Rural / Tram Mediam）](images/posts/2090000000000000013-grammarroad-00-variants-1.webp)

![さらに別のバリエーション（Rural Guardrail / Pedestrian Priority / One Way / Protected Bike）](images/posts/2090000000000000013-grammarroad-01-variants-2.webp)

![GitLabで公開されているGrammar Road - Open Demoのリポジトリ](images/posts/2090000000000000013-grammarroad-02-gitlab-repo.webp)

Hugo Boussard氏が、入力カーブから道路の断面をプロシージャルに生成するスタンドアロンのHoudini HDA「Grammar Road Demo Tool」をArtStationとGitLabで無料公開しています。

シンプルな文法ベースのシステムで道路の断面を記述する仕組みで、歩道・車線・自転車レーン・バリア・緑地帯の中央分離帯・駐車帯・トラム軌道・排水帯・ガードレールといった要素を、読みやすいテキスト形式で組み合わせて指定できます。各要素は文法側で幅を直接指定することも、HDAのインターフェースに公開されたデフォルト値にフォールバックさせることもできるとのことです。

さらにJSON形式の「文法ウォレット」に対応していて、道路のカテゴリやバリエーションをまとめて整理し、素早くイテレーションできるようになっています。公開されているスクリーンショットだけでも、Urban Basic・Rural・Tram系・Pedestrian Priority・Protected Bikeなど、かなり多様な断面パターンが1本のHDAから生成されているのが分かります。

本人のコメントによると、軽量なプロシージャル道路デモとして「素早いプロトタイピング」「分かりやすいコントロール」「柔軟な断面生成」に焦点を当てて作ったとのことで、GitLab（grammar-road-open-demo）でソース一式が公開されているので、中身を見て学んだり、自作の道路生成ツールの土台として使ったりできます。
（Hugo Boussard氏、ツールの無料公開ありがとうございます）
