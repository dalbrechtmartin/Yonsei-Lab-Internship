export interface StructureLayer {
  material: string;
  thicknessNm: number | null;
  /**
   * Number of consecutive times this layer -- together with the other
   * layers adjacent to it that share the same repeatCount/groupId -- repeats
   * as a periodic block (e.g. 10 for a 10-period Ta2O5/SiO2 Bragg mirror).
   * Undefined/1 means "appears once", the common case. See
   * parseLayerStructure's "(A(t)/B(t)) x10" grammar.
   */
  repeatCount?: number;
  /**
   * Internal grouping key, not part of the text format itself -- lets
   * formatLayerStructure tell two adjacent repeat-groups with the same
   * repeatCount apart when re-serializing (e.g. two different DBR blocks
   * that both happen to repeat 10 times), instead of merging them into one
   * bigger period. Only set on layers parsed out of a "(...)  xN" or raw
   * periodic token.
   */
  groupId?: number;
}

/**
 * Layer stack colors for the materials the extraction pipeline is prompted
 * to normalize to (see backend/prompt.txt "Base Materials"). Unrecognized
 * materials still get a stable color (see materialColor's fallback) so an
 * arbitrary sheet never renders an uncolored/blank segment.
 */
const LAYER_COLORS: Record<string, string> = {
  Ta2O5: "#dcd6c8",
  SiO2: "#c9d8e6",
  Si3N4: "#b7cdb0",
  Au: "#e8c766",
  Ag: "#cfd4d8",
  TiO2: "#cbb7dd",
  Graphene: "#9aa5ab",
  PMMA: "#e3d9c6",
  Al2O3: "#c7cfe0",
  Cu: "#caa25a",
};

const FALLBACK_COLORS = ["#d8c9dc", "#c9dcd0", "#dccbc9", "#c9d0dc", "#d6dcc9"];

/** Deterministic fallback color for a material not in LAYER_COLORS, so the same unrecognized material always renders the same color within a session. */
function fallbackColor(material: string): string {
  let hash = 0;
  for (let i = 0; i < material.length; i++)
    hash = (hash * 31 + material.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function materialColor(material: string): string {
  return LAYER_COLORS[material] ?? fallbackColor(material);
}

/** True for reflective metals, which render with a brushed-metal sheen on the layer stack (see LayerStack.vue). */
export function isMetal(material: string): boolean {
  return material === "Ag" || material === "Au" || material === "Cu";
}

function shiftColor(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (c: number) => Math.max(0, Math.min(255, c));
  const r = clamp(((n >> 16) & 0xff) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return "#" + (((r << 16) | (g << 8) | b) >>> 0).toString(16).padStart(6, "0");
}

export const darkenColor = (hex: string, amt: number): string =>
  shiftColor(hex, -amt);
export const lightenColor = (hex: string, amt: number): string =>
  shiftColor(hex, amt);

/** nm-per-unit factor for the thickness units a paper might state, despite backend/prompt.txt requiring the AI to normalize to nm itself (belt-and-suspenders for older/already-extracted data that predates that rule, or a hand-typed µm value). */
function unitToNmFactor(unit: string): number {
  const u = unit.toLowerCase();
  if (u === "pm") return 0.001;
  if (u === "um" || u === "µm" || u === "μm") return 1000;
  return 1; // nm
}

const UNIT_ALT = "nm|pm|um|µm|μm";
const LAYER_TOKEN_RE = new RegExp(
  `^(.*?)\\s*\\(\\s*([\\d.]+)\\s*(${UNIT_ALT})\\s*\\)\\s*$`,
  "i",
);
// A whole "+"-joined token that is itself a repeating period, written
// "(MaterialA(tA) / MaterialB(tB)) xN" or "... ×N" -- see parseLayerStructure.
const GROUP_TOKEN_RE = /^\(\s*(.+?)\s*\)\s*[x×]\s*(\d+)\s*$/i;
// Fallback for a periodic stack transcribed close to how a paper states it,
// without the "(...) xN" wrapping -- e.g. "Ta2O5(107nm)/SiO2(150 nm) 10
// layers each" or "Ta2O5(107nm)/SiO2(150nm) x10" -- so data that predates
// (or bypassed) the normalized grammar still renders as real layers instead
// of leaking the entire phrase through as one bogus "material" name.
const RAW_PERIODIC_RE = new RegExp(
  `^(.+?)\\(\\s*([\\d.]+)\\s*(${UNIT_ALT})\\s*\\)\\s*\\/\\s*(.+?)\\(\\s*([\\d.]+)\\s*(${UNIT_ALT})\\s*\\)\\s*,?\\s*(?:[x×]\\s*)?(\\d+)\\s*(?:layers?|periods?|pairs?|times?)?(?:\\s+each)?\\s*$`,
  "i",
);

function parseSingleLayer(token: string): StructureLayer {
  const match = token.match(LAYER_TOKEN_RE);
  if (match) {
    const thicknessNm =
      Math.round(Number(match[2]) * unitToNmFactor(match[3]) * 1000) / 1000;
    return { material: match[1].trim(), thicknessNm };
  }
  return { material: token, thicknessNm: null };
}

/**
 * Parses a "Layer Structure" cell like "Si3N4(180nm) + Ta2O5(5nm) + Au(50nm)"
 * (format documented in backend/prompt.txt) into ordered layers, top
 * (incident light) first. Thickness is omitted (null) when not stated in
 * the text, per that same format. Recognizes um/µm/μm/pm alongside nm and
 * converts to nm -- without this, a stray non-nm value (e.g. "Au(0.45um)")
 * fails the nm-only match entirely and the whole "Au(0.45um)" string leaks
 * through as the *material name* instead, corrupting both the LayerStack
 * preview and the Add Point dialog's material suggestions.
 *
 * A "+"-joined token can also be a periodic/repeated block -- e.g. a
 * 10-period Ta2O5/SiO2 Bragg mirror -- written "(Ta2O5(107nm)/SiO2(150nm))
 * x10" (materials in the repeating period slash-separated, top to bottom,
 * repeat count right after the closing paren). Without this, such a block
 * has no representation at all: it doesn't match the single-layer
 * Material(nm) shape, so the ENTIRE phrase (materials, thicknesses, and
 * repeat count together) would otherwise leak through as one bogus material
 * name -- exactly the "no layer / mixed-together materials" symptom this
 * grammar exists to fix. Each material in the period comes back as its own
 * StructureLayer with `repeatCount` set (and a shared `groupId`), NOT
 * expanded into N physical copies -- the visual/export renderers show the
 * period once with a "×N" suffix (see layerLabel) instead of an unreadably
 * tall stack for a large N. A raw, un-normalized transcription of the same
 * kind of block (e.g. straight from a paper's "10 layers each" phrasing,
 * without the "(...) xN" wrapping) is still recovered via RAW_PERIODIC_RE.
 */
export function parseLayerStructure(value: unknown): StructureLayer[] {
  if (value === null || value === undefined || value === "") return [];
  let nextGroupId = 0;
  return String(value)
    .split("+")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .flatMap((token): StructureLayer[] => {
      const groupMatch = token.match(GROUP_TOKEN_RE);
      if (groupMatch) {
        const repeatCount = Number(groupMatch[2]);
        const groupId = nextGroupId++;
        return groupMatch[1]
          .split("/")
          .map((sub) => sub.trim())
          .filter((sub) => sub.length > 0)
          .map((sub) => ({ ...parseSingleLayer(sub), repeatCount, groupId }));
      }

      const rawMatch = token.match(RAW_PERIODIC_RE);
      if (rawMatch) {
        const repeatCount = Number(rawMatch[7]);
        const groupId = nextGroupId++;
        const thicknessA =
          Math.round(Number(rawMatch[2]) * unitToNmFactor(rawMatch[3]) * 1000) /
          1000;
        const thicknessB =
          Math.round(Number(rawMatch[5]) * unitToNmFactor(rawMatch[6]) * 1000) /
          1000;
        return [
          {
            material: rawMatch[1].trim(),
            thicknessNm: thicknessA,
            repeatCount,
            groupId,
          },
          {
            material: rawMatch[4].trim(),
            thicknessNm: thicknessB,
            repeatCount,
            groupId,
          },
        ];
      }

      return [parseSingleLayer(token)];
    });
}

/** Human-readable label for one layer row, shared by LayerStack.vue and the PNG export helpers so a repeating period always reads the same way ("Material · 107nm ×10") wherever it's rendered. */
export function layerLabel(layer: StructureLayer): string {
  const base =
    layer.thicknessNm !== null
      ? `${layer.material} · ${layer.thicknessNm}nm`
      : layer.material;
  return layer.repeatCount && layer.repeatCount > 1
    ? `${base} ×${layer.repeatCount}`
    : base;
}

/**
 * Inverse of parseLayerStructure -- serializes the Add Point dialog's layer
 * builder rows (see LayerStructureField) back into the "Material(nm) +
 * Material(nm)" / "(Material(nm)/Material(nm)) xN" text format documented in
 * backend/prompt.txt, so a manually built stack round-trips through
 * parseLayerStructure/LayerStack identically to one extracted from a paper.
 * Rows with no material name are dropped -- an in-progress empty row
 * shouldn't produce a stray " + " in the stored value. A run of consecutive
 * rows that share the same repeatCount (>1) and groupId is re-collapsed into
 * a single "(...) xN" period token; rows with a repeatCount but no group
 * partner (or a repeatCount typed in freehand on freshly-added rows, which
 * never carry a groupId) still serialize as a valid single-material "(...)
 * xN" repeat.
 */
export function formatLayerStructure(layers: StructureLayer[]): string {
  const layerText = (layer: StructureLayer): string =>
    layer.thicknessNm !== null && !isNaN(layer.thicknessNm)
      ? `${layer.material.trim()}(${layer.thicknessNm}nm)`
      : layer.material.trim();

  const validLayers = layers.filter((layer) => layer.material.trim() !== "");
  const tokens: string[] = [];
  let i = 0;
  while (i < validLayers.length) {
    const layer = validLayers[i];
    if (layer.repeatCount && layer.repeatCount > 1) {
      const run = [layer];
      let j = i + 1;
      while (
        j < validLayers.length &&
        validLayers[j].repeatCount === layer.repeatCount &&
        validLayers[j].groupId === layer.groupId
      ) {
        run.push(validLayers[j]);
        j++;
      }
      tokens.push(`(${run.map(layerText).join("/")}) x${layer.repeatCount}`);
      i = j;
    } else {
      tokens.push(layerText(layer));
      i++;
    }
  }
  return tokens.join(" + ");
}
