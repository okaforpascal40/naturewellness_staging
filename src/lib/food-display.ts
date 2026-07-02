/**
 * Presentation helpers shared by the home and recommendations screens.
 *
 * Pure, data-driven utilities — they never call the API. They turn the raw
 * `Recommendation` rows from `@/lib/api` into the emoji, scientific names,
 * evidence styling, benefit areas, mechanism phrasing and serving notes that
 * the prototype UI needs. All lookups degrade gracefully to sensible defaults.
 */
import {
  Activity,
  Brain,
  Droplets,
  Flame,
  HeartPulse,
  Leaf,
  Shield,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Recommendation } from "./api";

/* ------------------------------------------------------------------ */
/* Evidence grades                                                     */
/* ------------------------------------------------------------------ */

export type GradeKey = "A" | "B" | "C" | "None";

export function normalizeGrade(g?: string | null): GradeKey {
  const up = (g || "").trim().toUpperCase();
  if (up === "A" || up === "B" || up === "C") return up;
  return "None";
}

export interface GradeMeta {
  key: GradeKey;
  /** Compact word shown on food badges. */
  cardLabel: string;
  /** Word shown in the evidence-summary legend. */
  chartLabel: string;
  /** Long descriptive label. */
  fullLabel: string;
  /** Solid badge styling (background + foreground). */
  badgeClass: string;
  /** Bar-fill background for the evidence chart. */
  barClass: string;
  /** Legend dot background. */
  dotClass: string;
}

export const GRADE_META: Record<GradeKey, GradeMeta> = {
  A: {
    key: "A",
    cardLabel: "High",
    chartLabel: "Strong",
    fullLabel: "Grade A · Strong Evidence",
    badgeClass: "bg-evidence-a text-evidence-a-foreground border-transparent",
    barClass: "bg-evidence-a",
    dotClass: "bg-evidence-a",
  },
  B: {
    key: "B",
    cardLabel: "Moderate",
    chartLabel: "Moderate",
    fullLabel: "Grade B · Moderate Evidence",
    badgeClass: "bg-evidence-b text-evidence-b-foreground border-transparent",
    barClass: "bg-evidence-b",
    dotClass: "bg-evidence-b",
  },
  C: {
    key: "C",
    cardLabel: "Low",
    chartLabel: "Emerging",
    fullLabel: "Grade C · Emerging Evidence",
    badgeClass: "bg-evidence-c text-evidence-c-foreground border-transparent",
    barClass: "bg-evidence-c",
    dotClass: "bg-evidence-c",
  },
  None: {
    key: "None",
    cardLabel: "—",
    chartLabel: "Insufficient",
    fullLabel: "Insufficient Evidence",
    badgeClass: "bg-muted text-muted-foreground border-border",
    barClass: "bg-muted-foreground/40",
    dotClass: "bg-muted-foreground/40",
  },
};

export function gradeMeta(g?: string | null): GradeMeta {
  return GRADE_META[normalizeGrade(g)];
}

const GRADE_RANK: Record<GradeKey, number> = { A: 3, B: 2, C: 1, None: 0 };

/* ------------------------------------------------------------------ */
/* Food visuals — emoji, avatar tint, scientific name                  */
/* ------------------------------------------------------------------ */

export interface FoodVisual {
  emoji: string;
  /** Tailwind classes for the circular avatar behind the emoji. */
  ring: string;
  scientificName?: string;
}

interface FoodEntry {
  emoji: string;
  ring: string;
  scientificName?: string;
}

const FOOD_TABLE: Record<string, FoodEntry> = {
  apple: { emoji: "🍎", ring: "bg-red-100 text-red-700", scientificName: "Malus domestica" },
  grapefruit: { emoji: "🍊", ring: "bg-orange-100 text-orange-700", scientificName: "Citrus paradisi" },
  grape: { emoji: "🍇", ring: "bg-purple-100 text-purple-700", scientificName: "Vitis vinifera" },
  tomato: { emoji: "🍅", ring: "bg-red-100 text-red-700", scientificName: "Solanum lycopersicum" },
  broccoli: { emoji: "🥦", ring: "bg-green-100 text-green-700", scientificName: "Brassica oleracea var. italica" },
  cauliflower: { emoji: "🥦", ring: "bg-emerald-100 text-emerald-700", scientificName: "Brassica oleracea var. botrytis" },
  carrot: { emoji: "🥕", ring: "bg-orange-100 text-orange-700", scientificName: "Daucus carota" },
  spinach: { emoji: "🥬", ring: "bg-green-100 text-green-700", scientificName: "Spinacia oleracea" },
  "sweet potato": { emoji: "🍠", ring: "bg-orange-100 text-orange-700", scientificName: "Ipomoea batatas" },
  potato: { emoji: "🥔", ring: "bg-amber-100 text-amber-700", scientificName: "Solanum tuberosum" },
  garlic: { emoji: "🧄", ring: "bg-stone-100 text-stone-600", scientificName: "Allium sativum" },
  onion: { emoji: "🧅", ring: "bg-amber-100 text-amber-700", scientificName: "Allium cepa" },
  ginger: { emoji: "🫚", ring: "bg-amber-100 text-amber-700", scientificName: "Zingiber officinale" },
  turmeric: { emoji: "🫚", ring: "bg-yellow-100 text-yellow-700", scientificName: "Curcuma longa" },
  "green tea": { emoji: "🍵", ring: "bg-emerald-100 text-emerald-700", scientificName: "Camellia sinensis" },
  tea: { emoji: "🍵", ring: "bg-emerald-100 text-emerald-700", scientificName: "Camellia sinensis" },
  soybean: { emoji: "🫘", ring: "bg-lime-100 text-lime-700", scientificName: "Glycine max" },
  soy: { emoji: "🫘", ring: "bg-lime-100 text-lime-700", scientificName: "Glycine max" },
  blueberry: { emoji: "🫐", ring: "bg-indigo-100 text-indigo-700", scientificName: "Vaccinium corymbosum" },
  strawberry: { emoji: "🍓", ring: "bg-rose-100 text-rose-700", scientificName: "Fragaria × ananassa" },
  cherry: { emoji: "🍒", ring: "bg-rose-100 text-rose-700", scientificName: "Prunus avium" },
  orange: { emoji: "🍊", ring: "bg-orange-100 text-orange-700", scientificName: "Citrus sinensis" },
  lemon: { emoji: "🍋", ring: "bg-yellow-100 text-yellow-700", scientificName: "Citrus limon" },
  banana: { emoji: "🍌", ring: "bg-yellow-100 text-yellow-700", scientificName: "Musa acuminata" },
  pomegranate: { emoji: "🍎", ring: "bg-red-100 text-red-700", scientificName: "Punica granatum" },
  mango: { emoji: "🥭", ring: "bg-amber-100 text-amber-700", scientificName: "Mangifera indica" },
  pineapple: { emoji: "🍍", ring: "bg-yellow-100 text-yellow-700", scientificName: "Ananas comosus" },
  watermelon: { emoji: "🍉", ring: "bg-green-100 text-green-700", scientificName: "Citrullus lanatus" },
  peach: { emoji: "🍑", ring: "bg-orange-100 text-orange-700", scientificName: "Prunus persica" },
  pear: { emoji: "🍐", ring: "bg-lime-100 text-lime-700", scientificName: "Pyrus communis" },
  avocado: { emoji: "🥑", ring: "bg-green-100 text-green-700", scientificName: "Persea americana" },
  kale: { emoji: "🥬", ring: "bg-green-100 text-green-700", scientificName: "Brassica oleracea var. sabellica" },
  cabbage: { emoji: "🥬", ring: "bg-emerald-100 text-emerald-700", scientificName: "Brassica oleracea var. capitata" },
  lettuce: { emoji: "🥬", ring: "bg-green-100 text-green-700", scientificName: "Lactuca sativa" },
  "bell pepper": { emoji: "🫑", ring: "bg-red-100 text-red-700", scientificName: "Capsicum annuum" },
  pepper: { emoji: "🌶️", ring: "bg-red-100 text-red-700", scientificName: "Capsicum annuum" },
  chili: { emoji: "🌶️", ring: "bg-red-100 text-red-700", scientificName: "Capsicum annuum" },
  cucumber: { emoji: "🥒", ring: "bg-green-100 text-green-700", scientificName: "Cucumis sativus" },
  eggplant: { emoji: "🍆", ring: "bg-purple-100 text-purple-700", scientificName: "Solanum melongena" },
  mushroom: { emoji: "🍄", ring: "bg-stone-100 text-stone-600", scientificName: "Agaricus bisporus" },
  corn: { emoji: "🌽", ring: "bg-yellow-100 text-yellow-700", scientificName: "Zea mays" },
  peanut: { emoji: "🥜", ring: "bg-amber-100 text-amber-700", scientificName: "Arachis hypogaea" },
  walnut: { emoji: "🌰", ring: "bg-amber-100 text-amber-700", scientificName: "Juglans regia" },
  almond: { emoji: "🌰", ring: "bg-amber-100 text-amber-700", scientificName: "Prunus dulcis" },
  olive: { emoji: "🫒", ring: "bg-lime-100 text-lime-700", scientificName: "Olea europaea" },
  coconut: { emoji: "🥥", ring: "bg-stone-100 text-stone-600", scientificName: "Cocos nucifera" },
  chickpea: { emoji: "🫘", ring: "bg-amber-100 text-amber-700", scientificName: "Cicer arietinum" },
  lentil: { emoji: "🫘", ring: "bg-orange-100 text-orange-700", scientificName: "Lens culinaris" },
  bean: { emoji: "🫘", ring: "bg-amber-100 text-amber-700", scientificName: "Phaseolus vulgaris" },
  pea: { emoji: "🫛", ring: "bg-green-100 text-green-700", scientificName: "Pisum sativum" },
};

// Match longer keys first so "sweet potato" wins over "potato" and "peach" over "pea".
const FOOD_KEYS = Object.keys(FOOD_TABLE).sort((a, b) => b.length - a.length);

const DEFAULT_VISUAL: FoodVisual = { emoji: "🥗", ring: "bg-emerald-100 text-emerald-700" };

export function getFoodVisual(name: string): FoodVisual {
  const key = (name || "").toLowerCase().trim();
  if (!key) return DEFAULT_VISUAL;
  for (const k of FOOD_KEYS) {
    if (key === k || key.includes(k)) {
      const v = FOOD_TABLE[k];
      return { emoji: v.emoji, ring: v.ring, scientificName: v.scientificName };
    }
  }
  return DEFAULT_VISUAL;
}

/* ------------------------------------------------------------------ */
/* Benefit areas — derived from pathway names                          */
/* ------------------------------------------------------------------ */

export interface BenefitArea {
  label: string;
  icon: LucideIcon;
  pathway: string;
}

function benefitForPathway(pathway: string): { label: string; icon: LucideIcon } {
  const p = (pathway || "").toLowerCase();
  if (/insulin|glucose|glycol|glyca?emic|diabet|ampk/.test(p)) return { label: "Blood Sugar Balance", icon: Droplets };
  if (/inflamm|nf-?kb|cytokine|tnf|interleukin|cox-?2/.test(p)) return { label: "Inflammation Response", icon: Flame };
  if (/lipid|cholesterol|fatty acid|ppar|adipo|metabol/.test(p)) return { label: "Lipid & Metabolism", icon: Activity };
  if (/oxidat|antioxidant|reactive oxygen|nrf2|glutathione|stress/.test(p)) return { label: "Antioxidant Defense", icon: Sparkles };
  if (/apopto|cell cycle|prolifer|p53|tumou?r|cancer|angiogen/.test(p)) return { label: "Cell Growth Control", icon: ShieldCheck };
  if (/immun|t.?cell|b.?cell|nk.?cell|complement|macrophage/.test(p)) return { label: "Immune Support", icon: Shield };
  if (/cardi|vascular|blood pressure|nitric|endothel|platelet/.test(p)) return { label: "Heart & Vessels", icon: HeartPulse };
  if (/neuro|amyloid|tau|synap|cognit|dopamine|serotonin|brain/.test(p)) return { label: "Brain & Nerves", icon: Brain };
  return { label: pathway || "Cellular Signaling", icon: Leaf };
}

/** Up to `count` distinct benefit chips derived from the given pathway names. */
export function topBenefitAreas(pathways: string[], count = 4): BenefitArea[] {
  const seen = new Set<string>();
  const out: BenefitArea[] = [];
  for (const p of pathways) {
    if (!p) continue;
    const b = benefitForPathway(p);
    if (seen.has(b.label)) continue;
    seen.add(b.label);
    out.push({ ...b, pathway: p });
    if (out.length >= count) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Mechanisms — derived from interaction_type                          */
/* ------------------------------------------------------------------ */

export function mechanismText(interaction: string, gene: string): string {
  const t = (interaction || "").toLowerCase();
  const g = (gene || "").trim() || "the target gene";
  if (t.includes("decreases expression")) return `May reduce ${g} activity`;
  if (t.includes("increases expression")) return `May enhance ${g} activity`;
  if (t.includes("binding")) return `May modulate ${g} binding`;
  if (t.includes("decreases activity")) return `May suppress ${g} function`;
  if (t.includes("increases activity")) return `May boost ${g} function`;
  if (t.includes("decreases") || t.includes("downreg")) return `May downregulate ${g}`;
  if (t.includes("increases") || t.includes("upreg")) return `May upregulate ${g}`;
  if (interaction) return `May influence ${g} via ${interaction}`;
  return `May interact with ${g}`;
}

/* ------------------------------------------------------------------ */
/* Serving quantity defaults — by food category                        */
/* ------------------------------------------------------------------ */

// Ordered rules: leafy greens must win over the broad "fruit" matcher, and
// nuts/seeds before anything else that might partially match.
const QUANTITY_RULES: { match: RegExp; quantity: string }[] = [
  {
    match: /kale|spinach|broccoli|chard|collard|cabbage|lettuce|bok|sprout|arugula|rocket|leafy|green(s)?\b/,
    quantity: "1-2 cups daily (cooked)",
  },
  {
    match: /turmeric|curcum|ginger|cinnamon|clove|nutmeg|cardamom|cumin|coriander|pepper\b|spice/,
    quantity: "1-2 tsp daily",
  },
  {
    match: /peanut|pistachio|almond|walnut|cashew|hazelnut|pecan|macadamia|\bnut\b|seed|flax|chia|sesame|sunflower/,
    quantity: "30g daily (small handful)",
  },
  {
    match: /green tea|\btea\b|matcha|coffee|cocoa|cacao/,
    quantity: "2-3 cups daily",
  },
  {
    match: /blueberr|grape|apple|cranberr|strawberr|raspberr|blackberr|cherry|berry|orange|lemon|lime|citrus|banana|mango|peach|pear|pineapple|melon|pomegranate|fruit/,
    quantity: "100-150g daily",
  },
];

const DEFAULT_QUANTITY = "100-150g daily";

/** Suggested daily serving quantity for a food, from static category defaults. */
export function servingQuantity(name: string): string {
  const key = (name || "").toLowerCase().trim();
  if (key) {
    for (const rule of QUANTITY_RULES) {
      if (rule.match.test(key)) return rule.quantity;
    }
  }
  return DEFAULT_QUANTITY;
}

/* ------------------------------------------------------------------ */
/* Evidence type & data source labels                                  */
/* ------------------------------------------------------------------ */

/** Human label for the study type implied by a CTD interaction phrase. */
export function evidenceType(interaction?: string | null): string | null {
  const t = (interaction || "").toLowerCase();
  if (/expression|activity|phosphorylation/.test(t)) return "Mechanistic Study";
  if (/binding|reaction/.test(t)) return "Association Study";
  return null;
}

/** Which upstream database a recommendation is attributed to. */
export function dataSourceLabel(rec: Recommendation): string {
  const explicit = (rec.data_source || rec.source || "").toLowerCase();
  if (explicit) {
    if (explicit.includes("ctd")) return "CTD Database";
    if (explicit.includes("open")) return "Open Targets";
    return rec.data_source || rec.source || "";
  }
  // Curated chemical–gene interactions with literature come from CTD; a bare
  // disease→gene association without citations traces back to Open Targets.
  return (rec.sample_citations?.length ?? 0) > 0 ? "CTD Database" : "Open Targets";
}

/* ------------------------------------------------------------------ */
/* Serving & preparation defaults                                      */
/* ------------------------------------------------------------------ */

export interface ServingInfo {
  /** Best serving condition. */
  serving: string;
  /** Cooking / preparation effect note. */
  effect: string;
}

const SERVING_RULES: { match: RegExp; info: ServingInfo }[] = [
  { match: /tomato/, info: { serving: "Lightly cooked", effect: "Gentle cooking boosts lycopene availability." } },
  { match: /carrot|sweet potato|pumpkin|squash/, info: { serving: "Cooked", effect: "Cooking softens cell walls, raising beta-carotene uptake." } },
  { match: /broccoli|cauliflower|kale|cabbage|brussels|bok|sprout/, info: { serving: "Steamed or raw", effect: "Light steaming preserves sulforaphane — avoid boiling." } },
  { match: /garlic|onion|leek|shallot|chive/, info: { serving: "Crushed raw, rested 10 min", effect: "Resting after crushing activates allicin before any heat." } },
  { match: /spinach|chard|collard/, info: { serving: "Lightly cooked", effect: "Brief cooking reduces oxalates and frees lutein." } },
  { match: /blueberr|strawberr|raspberr|blackberr|cranberr|grape|cherry|berry/, info: { serving: "Fresh / raw", effect: "Heat degrades anthocyanins — enjoy raw or frozen." } },
  { match: /green tea|\btea\b|matcha/, info: { serving: "Steeped 2–3 min", effect: "Brew below boiling to protect catechins." } },
  { match: /turmeric|curcum/, info: { serving: "Cooked with fat + pepper", effect: "Black pepper and oil greatly boost curcumin absorption." } },
  { match: /orange|lemon|lime|grapefruit|citrus/, info: { serving: "Fresh / raw", effect: "Vitamin C is heat-sensitive — eat fresh." } },
  { match: /pepper|chili|chilli|capsicum/, info: { serving: "Raw or lightly cooked", effect: "Light cooking retains capsaicin and vitamin C." } },
  { match: /tomato|olive|avocado|nut|seed|flax/, info: { serving: "With healthy fats", effect: "Pairing with fat improves uptake of fat-soluble compounds." } },
  { match: /ginger/, info: { serving: "Fresh, grated", effect: "Fresh ginger holds more gingerol than dried." } },
];

const DEFAULT_SERVING: ServingInfo = {
  serving: "Fresh / raw",
  effect: "Minimal processing best preserves bioactive compounds.",
};

export function servingInfo(name: string): ServingInfo {
  const key = (name || "").toLowerCase().trim();
  if (key) {
    for (const rule of SERVING_RULES) {
      if (rule.match.test(key)) return rule.info;
    }
  }
  return DEFAULT_SERVING;
}

/* ------------------------------------------------------------------ */
/* Aggregations over the recommendation list                           */
/* ------------------------------------------------------------------ */

/** Distinct, trimmed, non-empty values preserving first-seen order. */
export function uniqueNonEmpty(values: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = (v || "").trim();
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  }
  return out;
}

export interface FoodSummary {
  name: string;
  phytochemical: string;
  grade: GradeKey;
  publicationCount: number;
}

/** One row per food, keeping the best grade and summing publications, sorted best-first. */
export function topFoods(recs: Recommendation[]): FoodSummary[] {
  const map = new Map<string, FoodSummary>();
  for (const r of recs) {
    const name = (r.fruit_vegetable || "").trim();
    if (!name) continue;
    const grade = normalizeGrade(r.evidence_grade);
    const k = name.toLowerCase();
    const existing = map.get(k);
    if (!existing) {
      map.set(k, {
        name,
        phytochemical: (r.phytochemical || "").trim(),
        grade,
        publicationCount: r.publication_count || 0,
      });
    } else {
      if (GRADE_RANK[grade] > GRADE_RANK[existing.grade]) existing.grade = grade;
      existing.publicationCount += r.publication_count || 0;
      if (!existing.phytochemical && r.phytochemical) existing.phytochemical = r.phytochemical.trim();
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => GRADE_RANK[b.grade] - GRADE_RANK[a.grade] || b.publicationCount - a.publicationCount,
  );
}

export interface GradeDistributionRow {
  key: GradeKey;
  count: number;
  /** Percentage of all recommendations (0–100). */
  percent: number;
}

/** Grade A/B/C counts and percentages across all recommendations. */
export function gradeDistribution(recs: Recommendation[]): GradeDistributionRow[] {
  const counts: Record<GradeKey, number> = { A: 0, B: 0, C: 0, None: 0 };
  for (const r of recs) counts[normalizeGrade(r.evidence_grade)]++;
  const total = recs.length || 1;
  return (["A", "B", "C"] as GradeKey[]).map((key) => ({
    key,
    count: counts[key],
    percent: Math.round((counts[key] / total) * 100),
  }));
}
