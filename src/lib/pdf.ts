/**
 * Client-side PDF export for a condition's food-recommendation report.
 *
 * Uses jsPDF only (no html2canvas): the output is structured, selectable text
 * rather than a screenshot, so it captures every recommendation regardless of
 * which tab is on screen, stays a few KB, and never trips on modern CSS colour
 * functions (oklch/lab). jsPDF is imported dynamically so it is pulled into the
 * bundle only when a user actually downloads a report.
 */
import type { jsPDF } from "jspdf";
import type { AutomationRunResponse } from "./api";
import {
  DATA_SOURCE_SUMMARY,
  PUBMED_HOST,
  groupReferences,
  pubmedUrl,
  totalPublicationCount,
} from "./citations";
import { GRADE_META, gradeDistribution, normalizeGrade, type GradeKey } from "./food-display";

export interface RecommendationsPdfInput {
  diseaseName: string;
  data: AutomationRunResponse;
}

// A4 portrait, millimetre units.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 22; // keep clear of the footer

type RGB = [number, number, number];

const BRAND: RGB = [22, 132, 90]; // wellness green
const INK: RGB = [31, 41, 55]; // slate-800
const MUTED: RGB = [107, 114, 128]; // slate-500
const LINE: RGB = [226, 232, 240]; // slate-200

const GRADE_RGB: Record<GradeKey, RGB> = {
  A: [22, 132, 90],
  B: [202, 138, 4],
  C: [37, 99, 235],
  None: [148, 163, 184],
};

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// jsPDF's built-in Helvetica encodes Latin-1 only and silently DROPS anything
// above U+00FF — a bullet or em dash disappears and leaves a double space, and
// the Greek letters common in phytochemical names ("beta-Carotene" is curated
// as "β-Carotene" in places) vanish mid-word. Map them to ASCII first.
const PDF_CHAR_MAP: [RegExp, string][] = [
  [/[‘’‛]/g, "'"],
  [/[“”‟]/g, '"'],
  [/[–—−]/g, "-"],
  [/[•·‧]/g, "·"], // bullet -> middle dot (Latin-1 safe)
  [/…/g, "..."],
  [/[→➡]/g, "->"],
  [/\u00a0/g, " "], // non-breaking space
  [/α/g, "alpha-"],
  [/β/g, "beta-"],
  [/γ/g, "gamma-"],
  [/δ/g, "delta-"],
  [/κ/g, "kappa-"],
  [/ω/g, "omega-"],
];

/** Rewrite text so every character survives jsPDF's Latin-1 standard fonts. */
export function pdfSafe(text: string): string {
  let out = text ?? "";
  for (const [pattern, replacement] of PDF_CHAR_MAP) out = out.replace(pattern, replacement);
  // Anything still outside Latin-1 would be dropped mid-word; a marker is
  // clearer to a reader than a silently mangled compound name.
  return out.replace(/[^ -ÿ]/g, "?").replace(/-{2,}/g, "-");
}

function safeFileName(s: string): string {
  const base = s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return base || "Condition";
}

/** Trim `text` with an ellipsis until it fits within `maxW` mm at the current font. */
function fit(doc: jsPDF, text: string, maxW: number): string {
  const t = pdfSafe(text ?? "").trim() || "-";
  if (doc.getTextWidth(t) <= maxW) return t;
  let s = t;
  // "..." not "…": the ellipsis character is outside Latin-1 and would be
  // dropped, leaving a silently truncated word with no marker.
  while (s.length > 1 && doc.getTextWidth(`${s}...`) > maxW) s = s.slice(0, -1);
  return `${s}...`;
}

export async function downloadRecommendationsPdf({
  diseaseName,
  data,
}: RecommendationsPdfInput): Promise<void> {
  const mod = await import("jspdf");
  const doc = new mod.jsPDF({ unit: "mm", format: "a4" });

  const recs = data.recommendations ?? [];
  const title = titleCase((diseaseName || "Condition").trim());
  const generated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let y = MARGIN;

  // ── Brand header ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.text("NatureWellness", MARGIN, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("Evidence-graded food recommendations", MARGIN, y + 9.5);
  y += 16;

  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // ── Disease title + date ──────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const titleLines = doc.splitTextToSize(pdfSafe(title), CONTENT_W) as string[];
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(`Report generated: ${generated}`, MARGIN, y);
  y += 10;

  // ── Stats row ─────────────────────────────────────────────────────────────
  const stats: [string, number][] = [
    ["Genes", data.genes_found ?? 0],
    ["Pathways", data.pathways_found ?? 0],
    ["Compounds", data.compounds_found ?? 0],
    ["Foods", data.foods_found ?? 0],
  ];
  const gap = 4;
  const boxW = (CONTENT_W - gap * (stats.length - 1)) / stats.length;
  const boxH = 16;
  stats.forEach(([label, value], i) => {
    const x = MARGIN + i * (boxW + gap);
    doc.setFillColor(245, 247, 246);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(value), x + boxW / 2, y + 7.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(label, x + boxW / 2, y + 12.5, { align: "center" });
  });
  y += boxH + 12;

  // ── Evidence summary ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("Evidence Summary", MARGIN, y);
  y += 6;

  // Counted once per (phytochemical, gene) pair — the API repeats a pair for
  // every food carrying the compound.
  const totalPublications = totalPublicationCount(recs);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(
    `${recs.length} recommendation${recs.length === 1 ? "" : "s"} graded` +
      (totalPublications > 0
        ? ` · based on ${totalPublications} publication${
            totalPublications === 1 ? "" : "s"
          } (counted once per compound-gene pair)`
        : ""),
    MARGIN,
    y,
  );
  y += 7;

  const distribution = gradeDistribution(recs);
  const barX = MARGIN + 52;
  const barW = 96;
  for (const row of distribution) {
    const meta = GRADE_META[row.key];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(`Grade ${row.key} · ${meta.chartLabel}`, MARGIN, y + 3);
    doc.setFillColor(LINE[0], LINE[1], LINE[2]);
    doc.roundedRect(barX, y, barW, 4, 1, 1, "F");
    const pct = Math.max(0, Math.min(100, row.percent));
    if (pct > 0) {
      const fillW = (pct / 100) * barW;
      const g = GRADE_RGB[row.key];
      doc.setFillColor(g[0], g[1], g[2]);
      doc.roundedRect(barX, y, fillW, 4, 1, 1, "F");
    }
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`${row.count} · ${row.percent}%`, barX + barW + 4, y + 3.3);
    y += 8;
  }
  y += 5;

  // ── Recommendations table ─────────────────────────────────────────────────
  const cols = {
    idx: MARGIN,
    food: MARGIN + 10,
    phyto: MARGIN + 58,
    gene: MARGIN + 108,
    grade: MARGIN + 130,
    pubsRight: PAGE_W - MARGIN, // right-aligned anchor
  };
  const ROW_H = 7;

  const drawTableHeader = (yy: number): number => {
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.roundedRect(MARGIN, yy, CONTENT_W, 7, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("#", cols.idx + 1.5, yy + 4.8);
    doc.text("Food", cols.food, yy + 4.8);
    doc.text("Phytochemical", cols.phyto, yy + 4.8);
    doc.text("Gene", cols.gene, yy + 4.8);
    doc.text("Grade", cols.grade, yy + 4.8);
    doc.text("Pubs", cols.pubsRight - 1.5, yy + 4.8, { align: "right" });
    return yy + 9;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("Food Recommendations", MARGIN, y);
  y += 6;
  y = drawTableHeader(y);

  recs.forEach((r, i) => {
    if (y + ROW_H > BOTTOM_LIMIT) {
      doc.addPage();
      y = drawTableHeader(MARGIN);
    }
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 249);
      doc.rect(MARGIN, y - 1.5, CONTENT_W, ROW_H, "F");
    }
    const grade = normalizeGrade(r.evidence_grade);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(i + 1), cols.idx + 1.5, y + 3);
    doc.text(fit(doc, titleCase(r.fruit_vegetable || ""), cols.phyto - cols.food - 2), cols.food, y + 3);
    doc.text(fit(doc, r.phytochemical || "", cols.gene - cols.phyto - 2), cols.phyto, y + 3);
    doc.text(fit(doc, r.gene_target || "", cols.grade - cols.gene - 2), cols.gene, y + 3);
    doc.setFont("helvetica", "bold");
    const g = GRADE_RGB[grade];
    doc.setTextColor(g[0], g[1], g[2]);
    doc.text(grade === "None" ? "—" : grade, cols.grade, y + 3);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(String(r.publication_count || 0), cols.pubsRight - 1.5, y + 3, { align: "right" });
    y += ROW_H;
  });

  if (recs.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("No recommendations available for this condition yet.", MARGIN, y + 3);
    y += 8;
  }

  // ── Scientific references ─────────────────────────────────────────────────
  // Break to a new page when `needed` mm would not fit above the footer.
  const ensureSpace = (needed: number) => {
    if (y + needed > BOTTOM_LIMIT) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const references = groupReferences(recs);

  y += 8;
  ensureSpace(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("Scientific References", MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const referenceIntro =
    references.length > 0
      ? `Based on ${totalPublications} peer-reviewed publication${
          totalPublications === 1 ? "" : "s"
        }. Every PMID below links to its PubMed record.`
      : "No individual PubMed citations were returned for this condition yet.";
  const introLines = doc.splitTextToSize(pdfSafe(referenceIntro), CONTENT_W) as string[];
  doc.text(introLines, MARGIN, y);
  y += introLines.length * 4.5 + 3;

  references.forEach((g, i) => {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    // "->" not "→": the built-in Helvetica encoding has no arrow glyph. The
    // compound name is printed as curated, matching the table above — title-
    // casing it would turn "beta-Carotene" into "Beta-carotene".
    doc.text(fit(doc, `${i + 1}. ${g.phytochemical} -> ${g.gene}`, CONTENT_W - 26), MARGIN, y);
    const gradeRgb = GRADE_RGB[g.grade];
    doc.setFontSize(8.5);
    doc.setTextColor(gradeRgb[0], gradeRgb[1], gradeRgb[2]);
    doc.text(g.grade === "None" ? "Grade n/a" : `Grade ${g.grade}`, PAGE_W - MARGIN, y, {
      align: "right",
    });
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    const meta = [
      `${g.publicationCount} publication${g.publicationCount === 1 ? "" : "s"}`,
      g.interactionType ? `Interaction: ${g.interactionType}` : "",
      `Source: ${g.source}`,
      g.evidenceType,
      g.foods.length > 0 ? `Found in: ${titleCase(g.foods.join(", "))}` : "",
    ]
      .filter(Boolean)
      .join("  ·  ");
    const metaLines = doc.splitTextToSize(pdfSafe(meta), CONTENT_W) as string[];
    doc.text(metaLines, MARGIN, y);
    y += metaLines.length * 4 + 0.5;

    for (const pmid of g.pmids) {
      ensureSpace(6);
      const url = pubmedUrl(pmid);
      doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
      doc.textWithLink(`PMID ${pmid} - ${url}`, MARGIN + 4, y, { url });
      y += 4.2;
    }

    y += 3;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 1.5, PAGE_W - MARGIN, y - 1.5);
    y += 2;
  });

  // ── Reference footer: databases + where to read the originals ─────────────
  ensureSpace(16);
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(pdfSafe(`Data Sources: ${DATA_SOURCE_SUMMARY}`), MARGIN, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(`All references available at ${PUBMED_HOST}`, MARGIN, y);

  // ── Footer on every page ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("For educational purposes only. Not medical advice.", MARGIN, PAGE_H - 11);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by NatureWellness", PAGE_W / 2, PAGE_H - 11, { align: "center" });
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 11, { align: "right" });
  }

  doc.save(`NatureWellness-${safeFileName(title)}-recommendations.pdf`);
}
