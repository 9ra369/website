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
      "tips/CG_Loungeのジャーナル（Arvid_Schneider氏運営）.html",
      "tips/レンダラー別ノード比較サイト「Render_Node_Comparison」.html",
      "tips/Houdiniの便利なノードセットアップまとめサイト（codercat）.html",
      "tips/ArtStationの見落とされがちなTips集約ページ活用法.html",
      "tips/VFX向けAIワークフロー共有プラットフォームを紹介.html",
      "tips/Image_Engine_Arvid_Schneider氏、手数料無料の販売プラットフォームをローンチ.html",
      "tips/VFX×AI記事を定期更新するウェブサイトを紹介.html",
      "tips/3Dアセットサイトまとめ（CGTrader,_Turbosquid他）.html",
      "tips/HDRI入手サイトまとめ（Poly_Heaven,_Poliigon等）.html",
      "tips/地形スキャンモデル販売サイト「The_Terrain_Domain」.html",
      "tips/無料の彫刻3Dスキャンモデルサイト「Three_D_Scans」.html",
      "tips/無料の高品質な車アセットサイト「Wire_Wheels_Club」.html",
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
      "tips/塚島氏のPLATEAU×Houdiniミニチュアルック制作チュートリアル.html",
      "tips/Google_MapsとTerrarium標高データからHeight_Field生成.html",
      "tips/高解像度地形生成ツールがリリース（米国内1-10mpx、全世界30mpx）.html",
      "tips/実地形生成HDA_COPs＋AI_Meta_SAMによるスプラットマップ自動生成.html",
      "tips/CGWORLD記事_Houdini×USDで自動運転用デジタルツイン生成（Aurora_Innovation）.html",
      "tips/地形スキャンモデル販売サイト「The_Terrain_Domain」.html",
      "tips/Samuel_A_Krug氏の地形生成HDA「KTT_for_Houdini」.html",
    ],
  },
];

module.exports = { GUIDES };
