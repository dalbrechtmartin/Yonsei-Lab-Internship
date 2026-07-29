export interface StructureLayer {
  material: string;
  thicknessNm: number | null;
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
  for (let i = 0; i < material.length; i++) hash = (hash * 31 + material.charCodeAt(i)) >>> 0;
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

export const darkenColor = (hex: string, amt: number): string => shiftColor(hex, -amt);
export const lightenColor = (hex: string, amt: number): string => shiftColor(hex, amt);

/**
 * Parses a "Layer Structure" cell like "Si3N4(180nm) + Ta2O5(5nm) + Au(50nm)"
 * (format documented in backend/prompt.txt) into ordered layers, top
 * (incident light) first. Thickness is omitted (null) when not stated in
 * the text, per that same format.
 */
export function parseLayerStructure(value: unknown): StructureLayer[] {
  if (value === null || value === undefined || value === "") return [];
  return String(value)
    .split("+")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => {
      const match = token.match(/^(.*?)\s*\(\s*([\d.]+)\s*nm\s*\)\s*$/i);
      if (match) {
        return { material: match[1].trim(), thicknessNm: Number(match[2]) };
      }
      return { material: token, thicknessNm: null };
    });
}
