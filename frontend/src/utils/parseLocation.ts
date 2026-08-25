// Backend's `Location` field is free text like "Page 6; Fig 4; Para 2" --
// no structured page number. This pulls the first page reference out of it
// for the PDF preview to default to, falling back to page 1 when the model
// didn't cite a page (or the record has no location at all).
export function parsePageNumber(location: string | null): number {
  const match = location?.match(/Page\s*(\d+)/i);
  const page = match ? Number(match[1]) : NaN;
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export interface EvidenceSource {
  quote: string;
  location: string;
}

// Splits `evidence`/`location` back into the ordered (quote, location) pairs
// prompt.txt asks the model to produce: fragments in `evidence` separated by
// "[...]", one matching ";"-separated entry per fragment in `location`, same
// order (e.g. evidence "A [...] B" + location "Page 3, Para 1; Page 5, Para
// 2" -> [{quote: "A", location: "Page 3, Para 1"}, {quote: "B", location:
// "Page 5, Para 2"}]). Falls back to a single pair with the whole, unsplit
// strings whenever the fragment counts don't line up 1:1 -- covers both the
// common single-source case and any pre-existing record written under the
// old single-location format (where "[...]" only ever elided words within
// one quote, never separated sources, so the counts won't match).
export function parseEvidenceSources(
  evidence: string | null,
  location: string | null,
): EvidenceSource[] {
  if (!evidence) return [];
  const quotes = evidence
    .split("[...]")
    .map((s) => s.trim())
    .filter(Boolean);
  const locations = (location ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (locations.length > 1 && locations.length === quotes.length) {
    return quotes.map((quote, i) => ({ quote, location: locations[i] }));
  }
  return [{ quote: evidence, location: location ?? "" }];
}
