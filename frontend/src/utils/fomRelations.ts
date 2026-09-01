// Mirrors backend/fom_relations.py's is_recognized_definition EXACTLY (same
// normalization: lowercase, collapse whitespace, replace the whole word
// "sensitivity" with "s") -- lets the review UI decide whether to offer the
// algebraic FOM/Sensitivity/FWHM recompute options for a record without a
// round trip to the backend just to check. The actual algebraic solve
// itself stays backend-only (see recompute-field) -- this is only the
// "does this record's own stated Definition even qualify" gate.
const RECOGNIZED_DEFINITIONS = new Set(["fom=s/fwhm"]);

function normalizeDefinition(definition: string | null | undefined): string {
  if (!definition) return "";
  let text = definition.trim().toLowerCase();
  text = text.replace(/\bsensitivity\b/g, "s");
  text = text.replace(/\s+/g, "");
  return text;
}

export function isRecognizedFomDefinition(definition: string | null | undefined): boolean {
  return RECOGNIZED_DEFINITIONS.has(normalizeDefinition(definition));
}
