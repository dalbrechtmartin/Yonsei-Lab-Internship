// Backend's `Location` field is free text like "Page 6; Fig 4; Para 2" --
// no structured page number. This pulls the first page reference out of it
// for the PDF preview to default to, falling back to page 1 when the model
// didn't cite a page (or the record has no location at all).
export function parsePageNumber(location: string | null): number {
  const match = location?.match(/Page\s*(\d+)/i);
  const page = match ? Number(match[1]) : NaN;
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// Mirrors backend's _apply_page_labels_to_location -- rewrites every
// "Page N" token in a Location string to the PDF's own printed label for
// that physical page (see apiService.getPageLabels), so a reviewer reading
// it here sees the same number they'd find printed on the page itself.
// `pageLabels` is one entry per physical page, 0-indexed; null/missing
// entries (no distinct label, or labels not loaded yet) leave "Page N" as-is.
export function applyPageLabels(
  location: string,
  pageLabels: (string | null)[] | null | undefined,
): string {
  if (!pageLabels?.length) return location;
  return location.replace(/\bPage\s+(\d+)\b/g, (match, n) => {
    const label = pageLabels[Number(n) - 1];
    return label ? `Page ${label}` : match;
  });
}

export interface EvidenceSource {
  quote: string;
  location: string;
  // Which of this record's COLUMN_ORDER field labels (e.g. "FOM (RIU^-1)")
  // this specific fragment's citation supports -- from backend's "Evidence
  // Field Map" (see schema.py's COLUMN_ORDER), parsed the same fragment-
  // aligned way as `location`. Empty when there's no field-map data at all
  // (a job extracted before this feature existed, or this fragment's own
  // entry was blank) -- callers must treat that as "no source icon", never
  // crash or guess.
  fields: string[];
}

// Splits an "Evidence Field Map" string into one string[] per Evidence/
// Location fragment (";"-separated, same as `location`), each itself
// comma-separated when a fragment supports more than one field. Returns []
// when there's no field-map data at all.
function splitFieldMapFragments(evidenceFieldMap: string | null): string[][] {
  if (!evidenceFieldMap) return [];
  return evidenceFieldMap.split(";").map((entry) =>
    entry
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// Splits `evidence`/`location` back into the ordered (quote, location) pairs
// prompt.txt asks the model to produce: fragments in `evidence` separated by
// "[...]", one matching ";"-separated entry per fragment in `location`, same
// order (e.g. evidence "A [...] B" + location "Page 3, Para 1; Page 5, Para
// 2" -> [{quote: "A", location: "Page 3, Para 1"}, {quote: "B", location:
// "Page 5, Para 2"}]). Falls back to a single pair with the whole, unsplit
// evidence string whenever `location` itself isn't a multi-entry list --
// covers both the common single-source case (one location, "[...]" only
// elides words within the one quote) and any pre-existing record written
// under the old single-location format.
//
// When `location` DOES have multiple entries but the model still miscounted
// (e.g. it over-split evidence into more fragments than it gave locations
// for -- a real observed failure mode where two sentences from the same
// paragraph got split into separate fragments), pair by index anyway rather
// than collapsing everything back into one block: a reviewer seeing 5
// distinct quoted fragments should never have all 4 of the model's locations
// crammed into a single citation entry just because the counts are off by
// one. A fragment with no matching location index is left with "" (its
// citation block just omits the Location line -- see ExtractionReviewDetail).
//
// `evidenceFieldMap` (optional, e.g. record.evidenceFieldMap) is split the
// same fragment-aligned way -- when its fragment count doesn't match
// `location`'s (a miscount, or simply absent), every source degrades to
// `fields: []` rather than misattributing a field to the wrong fragment.
export function parseEvidenceSources(
  evidence: string | null,
  location: string | null,
  evidenceFieldMap: string | null = null,
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
  const fieldFragments = splitFieldMapFragments(evidenceFieldMap);
  if (locations.length > 1) {
    const fieldsAligned = fieldFragments.length === locations.length;
    // The model sometimes over-splits Evidence into more "[...]"-separated
    // fragments than it gives Location entries for (a real observed case:
    // 4 quotes, 3 locations, because the last quote continues describing the
    // same passage without restating a fresh location). Rather than orphaning
    // a trailing fragment to "" -- which parsePageNumber then silently
    // defaults to page 1, so its own citation becomes unreachable and its
    // "Source N" chip navigates nowhere real -- carry the LAST stated
    // location forward. This is a safe inference (the model kept describing
    // content without citing a new page, so it's still on the last one it
    // named), unlike guessing which FIELDS a trailing fragment supports --
    // `fields` still degrades to [] past the field-map's own last entry,
    // since there's no equivalently safe assumption for that.
    const lastLocation = locations[locations.length - 1] ?? "";
    return quotes.map((quote, i) => ({
      quote,
      location: locations[i] ?? lastLocation,
      fields: fieldsAligned ? (fieldFragments[i] ?? []) : [],
    }));
  }
  const fieldsAligned = fieldFragments.length <= 1;
  return [
    {
      quote: evidence,
      location: location ?? "",
      fields: fieldsAligned ? (fieldFragments[0] ?? []) : [],
    },
  ];
}
