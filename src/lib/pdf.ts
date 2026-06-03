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

function safeFileName(s: string): string {
  const base = s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return base || "Condition";
}

/** Trim `text` with an ellipsis until it fits within `maxW` mm at the current font. */
function fit(doc: jsPDF, text: string, maxW: number): string {
  const t = (text ?? "").trim() || "—";
  if (doc.getTextWidth(t) <= maxW) return t;
  let s = t;
  while (s.length > 1 && doc.getTextWidth(`${s}…`) > maxW) s = s.slice(0, -1);
  return `${s}…`;
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
  const titleLines = doc.splitTextToSize(title, CONTENT_W) as string[];
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

  const totalPublications = recs.reduce((sum, r) => sum + (r.publication_count || 0), 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(
    `${recs.length} recommendation${recs.length === 1 ? "" : "s"} graded` +
      (totalPublications > 0
        ? ` · based on ${totalPublications} publication${totalPublications === 1 ? "" : "s"}`
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
  }

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
