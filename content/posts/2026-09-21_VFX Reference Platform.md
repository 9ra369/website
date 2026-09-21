---
title: "VFX Reference Platform — VFX/アニメーション業界のライブラリバージョンを毎年標準化するサイト"
slug: "vfx-reference-platform"
date: 2026-09-21
category: "website"
type: "brief"
tags: ["Industry", "Pipeline", "Open Source", "Linux"]
topics: ["industry", "pipeline"]
tools: []
source_url: [{ "url": "https://vfxplatform.com/", "label": "VFX Reference Platform（公式サイト）" }]
language: "英語"
original_post: "https://x.com/kuramaKageya/status/2090000000000000017"
summary: "VFX・アニメーションスタジオとソフトウェアベンダー間の互換性を保つため、OS・コンパイラ・Python・Qt・OpenEXRなど主要ライブラリのバージョンを年次（Calendar Year）で標準化して公開しているサイト「VFX Reference Platform」。パイプライン担当者にとって毎年の環境構築の拠り所になっている。"
ai_confidence: "high"
status: draft
---

![VFX Reference Platformのトップページ](images/posts/2090000000000000017-vfxplatform-00-hero.webp)

VFX・アニメーション業界の標準ビルド環境を毎年定義している「VFX Reference Platform」を紹介します。

サイトの説明によると、目的は「ソフトウェア提供元にとっての一貫したビルドターゲットを定めることで、異なるソフトウェアパッケージ間の非互換性を最小化し、統合パイプラインのサポート負荷を減らし、Linuxの採用をさらに促進すること」とのこと。gcc・glibcといったLinux側の要件から、Python・Qt・Boost・OpenEXR・OpenColorIO・OpenVDBといった主要ライブラリまで、CY（Calendar Year）単位でバージョンを一覧表にまとめています。

![CY2024〜CY2027のバージョン比較表（一部）](images/posts/2090000000000000017-vfxplatform-01-table.webp)

現在の最新は2027年1月から有効になるCY2027で、Linuxがglibc 2.34（実質EL9系OS必須）に移行するのが今回の大きな変更点とのこと。表の各項目には「↓↑」マークが付いているものがあり、ランタイム提供側は最低バージョン、ビルド側は許容される最大バージョンという読み方をする点も明記されています。

Academy Software Foundation（ASWF）やAlliance for OpenUSD周りの動きとも密接に関わっており、Python 3対応状況を追う「VFXpy Compatibility Tracker」や、ASWF公式のDockerコンテナへのリンクも用意されています。バージョンがずれて初めて困るタイプの情報なので、パイプラインを触る人はブックマークしておいて損はなさそうです。
