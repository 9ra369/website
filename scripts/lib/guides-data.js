// Curation rules/lists for the 6 hub ("guide") pages — see scripts/22-build-guides.js.
// Four hubs are rule-based (derived from existing category/tags, no manual
// per-post curation needed); two (sites, gis-terrain) needed editorial
// judgment beyond a simple tag rule, so their post lists are hand-picked.

const hasTag = (entry, ...tags) =>
  tags.some((t) => entry.tags.some((tag) => tag.toLowerCase() === t.toLowerCase()));

const GUIDES = [
  {
    slug: "houdini-environment",
    title: "Houdini背景制作まとめ",
    description:
      "Houdiniを使った背景（環境）制作のチュートリアル・Tipsを一箇所に。スキャッター・地形生成・植生など、工程別に散らばっていた記事をまとめています。",
    // Houdini + an environment-flavored tag.
    filter: (e) =>
      hasTag(e, "Houdini") &&
      hasTag(e, "Environment", "Vegetation", "Terrain", "Scattering", "Scatter", "Heightfield", "Landscape", "houEnv", "背景制作"),
  },
  {
    slug: "environment",
    title: "背景制作まとめ",
    description:
      "ソフトを問わず、背景・環境制作に関するチュートリアルやリファレンスをまとめています。Houdini以外の事例も含む、上位互換のまとめページです。",
    // Any environment-flavored tag, regardless of tool.
    filter: (e) => hasTag(e, "Environment", "Vegetation", "Terrain", "Scattering", "houEnv", "背景制作", "Landscape"),
  },
  {
    slug: "houdini-pipeline",
    title: "Houdiniのパイプライン/TD系ツールまとめ",
    description:
      "HDA・自動化スクリプト・プラグインなど、Houdini完結型のツール群を横断的に整理しています。",
    filter: (e) => e.category === "pipeline" && hasTag(e, "Houdini"),
  },
  {
    slug: "usd",
    title: "USD資料まとめ",
    description:
      "Composition・LOPs・Solarisなど、USD（OpenUSD）関連の資料を一箇所に。英語ソース中心の情報を日本語の解説つきでまとめています。",
    filter: (e) => hasTag(e, "USD"),
  },
  {
    slug: "sites",
    title: "海外CG/VFX情報サイト",
    description:
      "普段の情報収集に使っている海外サイト・プラットフォーム・アセット配布サイトの一覧。自分の情報源そのものを公開しています。",
    // Hand-picked: genuine "here's a site/platform" introductions, not just
    // articles that happen to mention a proper noun.
    hrefs: [
      "entry-cglounge.html",
      "posts/cg-lounge-arvid-schneider.html",
      "posts/render-node-comparison.html",
      "posts/houdini-codercat.html",
      "posts/artstation-tips.html",
      "posts/vfx-ai-924666.html",
      "posts/image-engine-arvid-schneider.html",
      "posts/vfx-ai.html",
      "posts/3d-cgtrader-turbosquid.html",
      "posts/hdri-poly-heaven-poliigon.html",
      "posts/the-terrain-domain.html",
      "posts/3d-three-scans.html",
      "posts/wire-wheels-club-027750.html",
    ],
  },
  {
    slug: "gis-terrain",
    title: "GIS×3DCGのデータソース一覧",
    description:
      "標高データ・衛星写真など、実地形をベースにした環境制作で使えるデータソース・ツールをまとめています。",
    // Hand-picked: genuinely about real-world data sources, not general
    // "terrain" technique posts (those live in the environment hubs above).
    hrefs: [
      "posts/plateau-houdini.html",
      "posts/10m-px-30m-px.html",
      "posts/hda-cops-ai-meta-sam.html",
      "posts/cgworld-houdini-usd-aurora-innovation.html",
      "posts/the-terrain-domain.html",
      "posts/samuel-krug-hda-ktt-for-houdini.html",
    ],
  },
];

module.exports = { GUIDES };
