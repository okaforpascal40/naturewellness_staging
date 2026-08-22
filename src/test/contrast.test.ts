import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The evidence-grade badges carry 11px labels, so WCAG AA asks for 4.5:1 —
 * the 3:1 large-text allowance does not apply to them. These tests read the
 * real tokens out of index.css so a palette edit cannot quietly drop a badge
 * below the line again.
 */
type Hsl = [number, number, number];

function hslToRgb([h, s, l]: Hsl): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = light - c / 2;
  return [r + m, g + m, b + m];
}

/** WCAG 2.1 relative luminance. */
function luminance(hsl: Hsl): number {
  const [r, g, b] = hslToRgb(hsl).map((v) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: Hsl, b: Hsl): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");

/** Split the file at the dark-theme block so the two palettes read separately. */
const darkIndex = css.search(/\.dark\s*\{/);
if (darkIndex < 0) throw new Error("index.css: could not find the .dark theme block");
const SECTIONS = { light: css.slice(0, darkIndex), dark: css.slice(darkIndex) };

function token(theme: "light" | "dark", name: string): Hsl {
  const match = SECTIONS[theme].match(
    new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`),
  );
  if (!match) throw new Error(`index.css: --${name} not found in the ${theme} palette`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

const AA_TEXT = 4.5;

describe("index.css token parsing", () => {
  it("finds both palettes", () => {
    expect(token("light", "evidence-c")).not.toEqual(token("dark", "evidence-c"));
    expect(token("light", "card")).toEqual([0, 0, 100]);
  });
});

describe.each(["light", "dark"] as const)("%s theme evidence badges", (theme) => {
  it.each(["a", "b", "c"])("grade %s label clears WCAG AA on its own fill", (grade) => {
    const ratio = contrastRatio(
      token(theme, `evidence-${grade}`),
      token(theme, `evidence-${grade}-foreground`),
    );
    expect(
      ratio,
      `--evidence-${grade} vs --evidence-${grade}-foreground in ${theme} = ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  // The same tokens also fill progress bars, legend dots and the CamScan
  // confidence ring. Those are deliberately NOT asserted at 3:1 against the
  // card: WCAG 1.4.11 covers graphics required to understand content, and each
  // of these is accompanied by its own text label ("Grade B · Moderate",
  // "12 · 34%", "68%"), so colour is never the sole carrier. Grade B's amber
  // measures 2.04:1 on white and is fine for that reason.

  it("the insufficient-evidence badge clears WCAG AA", () => {
    const ratio = contrastRatio(token(theme, "muted"), token(theme, "muted-foreground"));
    expect(ratio, `--muted vs --muted-foreground in ${theme} = ${ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("secondary text clears WCAG AA on the page and on cards", () => {
    for (const surface of ["background", "card"]) {
      const ratio = contrastRatio(token(theme, surface), token(theme, "muted-foreground"));
      expect(ratio, `--muted-foreground on --${surface} in ${theme} = ${ratio.toFixed(2)}:1`)
        .toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe("light theme grade C", () => {
  it("stays distinguishable from the destructive red", () => {
    const [gradeC] = [token("light", "evidence-c")];
    const destructive = token("light", "destructive");
    // A weak grade must not be mistaken for an error state.
    expect(Math.abs(gradeC[0] - destructive[0])).toBeGreaterThanOrEqual(10);
  });
});
