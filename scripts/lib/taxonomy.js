// Shared topic/tool/type taxonomy — introduced per research/vfx-cg-site-spec.md
// §1-2 (3-axis flat tagging), extended with 2 values the spec's fixed 13-item
// topic list has no room for but this site's actual content clearly needs
// (see "設計決定" in the approved plan, 2026-08-31).
//
// Used by scripts/25-tag-taxonomy.js (frontmatter migration), and
// scripts/26-build-topics.js / 27-build-tools.js (listing pages).

/** Axis A: topic. Spec's 13 fixed values + 2 site-specific additions
 *  (environment, art-fundamentals — see plan doc for why). */
const TOPICS = [
  { slug: "environment", label: "環境・背景制作" },
  { slug: "fx", label: "FX" },
  { slug: "modeling", label: "モデリング" },
  { slug: "lookdev", label: "ルックデブ" },
  { slug: "lighting-rendering", label: "ライティング・レンダリング" },
  { slug: "animation-rigging", label: "アニメーション・リギング" },
  { slug: "compositing", label: "コンポジット" },
  { slug: "pipeline", label: "パイプライン" },
  { slug: "realtime", label: "リアルタイム" },
  { slug: "gis-digitaltwin", label: "GIS・デジタルツイン" },
  { slug: "ai", label: "AI" },
  { slug: "hardware", label: "ハードウェア" },
  { slug: "industry", label: "業界動向" },
  { slug: "career", label: "キャリア" },
  { slug: "art-fundamentals", label: "アート基礎（構図・配色など）" },
];
const TOPIC_SLUGS = new Set(TOPICS.map((t) => t.slug));

/** Axis B: tool. Open vocabulary — label defaults to the slug itself
 *  (title-cased) unless overridden here for a nicer display form. */
const TOOL_LABELS = {
  houdini: "Houdini",
  blender: "Blender",
  unreal: "Unreal Engine",
  maya: "Maya",
  nuke: "Nuke",
  usd: "USD",
  python: "Python",
  comfyui: "ComfyUI",
  "v-ray": "V-Ray",
  "3ds-max": "3ds Max",
  substance: "Substance Painter",
  gaea: "Gaea",
  speedtree: "SpeedTree",
  zbrush: "ZBrush",
  davinci: "DaVinci Resolve",
};

/** Existing free-text `tags` values (case-insensitive) -> tool slug(s).
 *  A tag may map to more than one tool (e.g. Solaris is Houdini's USD/Hydra
 *  context, so it signals both). */
const TAG_TO_TOOLS = {
  houdini: ["houdini"],
  sidefx: ["houdini"],
  houenv: ["houdini"],
  b3d: ["blender"],
  blender: ["blender"],
  "unreal engine": ["unreal"],
  ue5: ["unreal"],
  maya: ["maya"],
  nuke: ["nuke"],
  usd: ["usd"],
  solaris: ["houdini", "usd"],
  python: ["python"],
  comfyui: ["comfyui"],
  "v-ray": ["v-ray"],
  "3ds max": ["3ds-max"],
  "substance painter": ["substance"],
  gaea: ["gaea"],
  speedtree: ["speedtree"],
  zbrush: ["zbrush"],
  davinci: ["davinci"],
};

/** Existing free-text `tags` values (case-insensitive) -> topic slug(s). */
const TAG_TO_TOPICS = {
  environment: ["environment"],
  背景制作: ["environment"],
  terrain: ["environment"],
  vegetation: ["environment"],
  scattering: ["environment"],
  hdri: ["environment"],
  megascans: ["environment"],
  speedtree: ["environment"],
  "matte painting": ["environment"],
  houenv: ["environment"],
  biomes: ["environment"],
  gaea: ["environment"],
  composition: ["art-fundamentals"],
  毎日作品分析: ["art-fundamentals"],
  "concept art": ["art-fundamentals"],
  texturing: ["lookdev"],
  "substance painter": ["lookdev"],
  lighting: ["lighting-rendering"],
  rendering: ["lighting-rendering"],
  "v-ray": ["lighting-rendering"],
  vfx: ["fx"],
  hda: ["pipeline"],
  assets: ["pipeline"],
  pipeline: ["pipeline"],
  rigging: ["animation-rigging"],
  modeling: ["modeling"],
  uv: ["modeling"],
  nuke: ["compositing"],
  pcg: ["realtime"],
  "game design": ["realtime"],
  ai: ["ai"],
  comfyui: ["ai"],
};

/** `category` (existing frontmatter field) -> `type` (spec §1-2 axis C).
 *  Used both as the type value itself and as the topic fallback when no
 *  tag matches TAG_TO_TOPICS. */
const CATEGORY_TO_TYPE = {
  "daily-analysis": "note",
  tutorial: "brief",
  pipeline: "brief",
  article: "explainer",
  showreel: "brief",
  tips: "brief",
  website: "brief",
};

/** category -> topic fallback, used only when no tag in a post matches
 *  TAG_TO_TOPICS at all (rare — most posts carry a tool/subject tag). */
const CATEGORY_TOPIC_FALLBACK = {
  "daily-analysis": "art-fundamentals",
  pipeline: "pipeline",
};
const DEFAULT_TOPIC_FALLBACK = "industry";

/** Derives {topics, tools, type} for a post from its existing `category`
 *  and `tags` frontmatter. Pure function — no I/O. */
function inferTaxonomy({ category, tags }) {
  const lowerTags = (tags || []).map((t) => t.toLowerCase());

  const topics = [];
  for (const t of lowerTags) {
    for (const slug of TAG_TO_TOPICS[t] || []) {
      if (!topics.includes(slug)) topics.push(slug);
    }
  }
  if (topics.length === 0) {
    topics.push(CATEGORY_TOPIC_FALLBACK[category] || DEFAULT_TOPIC_FALLBACK);
  }

  const tools = [];
  for (const t of lowerTags) {
    for (const slug of TAG_TO_TOOLS[t] || []) {
      if (!tools.includes(slug)) tools.push(slug);
    }
  }

  const type = CATEGORY_TO_TYPE[category] || "brief";

  return { topics: topics.slice(0, 3), tools: tools.slice(0, 3), type };
}

module.exports = {
  TOPICS,
  TOPIC_SLUGS,
  TOOL_LABELS,
  TAG_TO_TOOLS,
  TAG_TO_TOPICS,
  CATEGORY_TO_TYPE,
  inferTaxonomy,
};
