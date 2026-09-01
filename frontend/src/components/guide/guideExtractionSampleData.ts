import type {
  ExtractionRecord,
  JobStatusResponse,
} from "@/services/api";
import type { ExtractionLogEntry } from "@/composables/useExtractionEventLog";
import type { ExtractionStepDef } from "@/components/extraction/ExtractionStepper.vue";

// ---------------------------------------------------------------------
// Worked example dataset (Mode 2 only) -- three fictional PDFs that,
// together, extract into exactly the R1/R2/R3 rows Mode 1's own worked
// example (see guideSampleData.ts) already plots -- R3/EXP even carries
// the SAME flagged status and "digitized from a log-scale plot" note as
// Mode 1's sampleRows[4]. So Mode 2's pages tell the true origin story of
// the very dataset the rest of this guide visualizes, rather than a
// second, disconnected illustration. A fourth record (R7, a plasmonic
// design) exists only to be excluded -- a genuine, in-domain reason a
// human reviewer would step in, distinct from the AI's own file-level
// domain check (see backend/jobs.py).
// ---------------------------------------------------------------------

export const extractionStepperSteps: ExtractionStepDef[] = [
  { key: "drop", labelKey: "extraction.stepper.deposer" },
  { key: "running", labelKey: "extraction.stepper.extraire" },
  { key: "review", labelKey: "extraction.stepper.verifier" },
  { key: "export", labelKey: "extraction.stepper.exporter" },
];

const GUIDE_JOB_ID = "guide-demo-job";
const now = Date.now();

// -- Page 19 (Drop step): three staged files, not yet uploaded. ---------
export const stagedFiles = [
  { filename: "microring_2023.pdf", sizeBytes: 1_240_000, pageCount: 9 },
  { filename: "gmr_biosensor_2022.pdf", sizeBytes: 2_050_000, pageCount: 12 },
  { filename: "spr_sensor_2020.pdf", sizeBytes: 980_000, pageCount: 7 },
];

// -- Page 20 (Running step): file 1 is done, file 2 is held for an
// automatic retry (Gemini's free-tier quota), file 3 hasn't started --
// one coherent state that shows the progress header, the batch icon
// strip, the quota notice banner and the "Retrying" pill together,
// instead of a plain best-case run that never demonstrates the backend's
// own retry resilience. --------------------------------------------------
export const runningJob: JobStatusResponse = {
  jobId: GUIDE_JOB_ID,
  status: "running",
  modelChoice: "default",
  totalFiles: 3,
  completedCount: 1,
  errorMessage: null,
  createdAt: new Date(now - 7 * 60_000).toISOString(),
  notice: {
    reason: "quota",
    pendingCount: 1,
    retryAt: new Date(now + 38_000).toISOString(),
  },
  // The guide's journal panel renders the hand-authored runningLogEntries
  // below directly (it never goes through useExtractionEventLog), so this
  // only needs to satisfy JobStatusResponse's shape, not carry real events.
  events: [],
  files: [
    {
      id: "file-1",
      filename: "microring_2023.pdf",
      status: "done",
      modelUsed: "gemini-3.5-flash",
      recordCount: 1,
      errorReason: null,
      startedAt: new Date(now - 6 * 60_000).toISOString(),
      runs: [],
    },
    {
      id: "file-2",
      filename: "gmr_biosensor_2022.pdf",
      status: "pending",
      modelUsed: null,
      recordCount: 0,
      errorReason: "quota",
      startedAt: null,
      runs: [],
    },
    {
      id: "file-3",
      filename: "spr_sensor_2020.pdf",
      status: "pending",
      modelUsed: null,
      recordCount: 0,
      errorReason: null,
      startedAt: null,
      runs: [],
    },
  ],
};

export const runningLogEntries: ExtractionLogEntry[] = [
  {
    id: "log-1",
    atMs: now - 6 * 60_000,
    level: "info",
    messageKey: "extraction.log.fileProcessing",
    params: { filename: "microring_2023.pdf" },
  },
  {
    id: "log-2",
    atMs: now - 4 * 60_000,
    level: "info",
    messageKey: "extraction.log.fileDone",
    params: { filename: "microring_2023.pdf", count: 1 },
  },
  {
    id: "log-3",
    atMs: now - 3 * 60_000,
    level: "info",
    messageKey: "extraction.log.fileProcessing",
    params: { filename: "gmr_biosensor_2022.pdf" },
  },
  {
    id: "log-4",
    atMs: now - 40_000,
    level: "warn",
    messageKey: "extraction.log.noticeStarted",
    params: { count: 1 },
  },
];
export const runningWarningCount = runningLogEntries.filter(
  (e) => e.level === "warn",
).length;

// -- Pages 21-23 (Review, Correct, Export): every file has finished. ----
export const finishedJob: JobStatusResponse = {
  jobId: GUIDE_JOB_ID,
  status: "done",
  modelChoice: "default",
  totalFiles: 3,
  completedCount: 3,
  errorMessage: null,
  createdAt: new Date(now - 12 * 60_000).toISOString(),
  notice: null,
  events: [],
  files: [
    {
      id: "file-1",
      filename: "microring_2023.pdf",
      status: "done",
      modelUsed: "gemini-3.5-flash",
      recordCount: 1,
      errorReason: null,
      startedAt: new Date(now - 9 * 60_000).toISOString(),
      runs: [],
    },
    {
      id: "file-2",
      filename: "gmr_biosensor_2022.pdf",
      status: "done",
      modelUsed: "gemini-3.5-flash",
      recordCount: 2,
      errorReason: null,
      startedAt: new Date(now - 7 * 60_000).toISOString(),
      runs: [],
    },
    {
      id: "file-3",
      filename: "spr_sensor_2020.pdf",
      status: "done",
      modelUsed: "gemini-3.5-flash",
      recordCount: 1,
      errorReason: null,
      startedAt: new Date(now - 4 * 60_000).toISOString(),
      runs: [],
    },
  ],
};

function record(data: Partial<ExtractionRecord>): ExtractionRecord {
  return {
    fileId: "",
    filename: "",
    index: 0,
    ref: null,
    title: null,
    shortTitle: null,
    modeId: null,
    modeDescription: null,
    materialClass: null,
    baseMaterials: null,
    layerStructure: null,
    origin: null,
    domain: "Wavelength",
    resonanceWavelengthNm: null,
    spectralRange: null,
    fomRiuInv: null,
    definition: "Sensitivity / FWHM",
    sensitivityNmPerRiu: null,
    fwhmNm: null,
    qFactor: null,
    sensingMedium: null,
    rawValue: null,
    conversionMethod: null,
    calculatedFields: null,
    evidence: null,
    location: null,
    evidenceFieldMap: null,
    reviewStatus: "Approve (AI)",
    notes: null,
    reconciliationLog: null,
    modelUsed: "gemini-3.5-flash",
    reviewedAt: null,
    ...data,
  };
}

// R1/EXP -- same design as Mode 1's sampleRows[0], clean AI approval.
const recordR1 = record({
  fileId: "file-1",
  filename: "microring_2023.pdf",
  index: 0,
  ref: "R1",
  title: "High-Q silicon microring resonator RI sensor",
  shortTitle: "Si microring RI sensor",
  modeId: "TE0",
  modeDescription: "Fundamental TE whispering-gallery mode",
  materialClass: "Dielectric",
  baseMaterials: "Si;SiO2",
  layerStructure: "Si + SiO2",
  origin: "EXP",
  resonanceWavelengthNm: 1550,
  spectralRange: "1500-1600 nm",
  fomRiuInv: 1757,
  sensitivityNmPerRiu: 65,
  fwhmNm: 0.037,
  qFactor: 42000,
  evidence:
    "The device achieves a sensitivity of 65 nm/RIU with a loaded Q-factor of 4.2 x 10^4 at 1550 nm.",
  location: "Page 5, Results",
});

// R2/EXP -- same design as Mode 1's sampleRows[2], clean AI approval.
const recordR2 = record({
  fileId: "file-2",
  filename: "gmr_biosensor_2022.pdf",
  index: 0,
  ref: "R2",
  title: "Silicon-nitride ring resonator for biosensing",
  shortTitle: "Si3N4 ring biosensor",
  modeId: "TE0",
  modeDescription: "Fundamental TE mode",
  materialClass: "Dielectric",
  baseMaterials: "Si3N4;SiO2",
  layerStructure: "Si3N4 + SiO2",
  origin: "EXP",
  resonanceWavelengthNm: 1310,
  spectralRange: "1290-1330 nm",
  fomRiuInv: 2667,
  sensitivityNmPerRiu: 40,
  fwhmNm: 0.015,
  qFactor: 88000,
  evidence:
    "A quality factor of 8.8 x 10^4 was measured, with a bulk sensitivity of 40 nm/RIU.",
  location: "Page 4, Table 1",
});

// R3/EXP -- same design AND the same flagged status/note as Mode 1's
// sampleRows[4]. Two evidence fragments (see utils/parseLocation.ts's
// "[...]"-joined format) -- the resonance/sensitivity claim and the
// digitized-FWHM claim come from two different pages/figures, exactly
// what the flagged note below says happened.
const recordR3 = record({
  fileId: "file-2",
  filename: "gmr_biosensor_2022.pdf",
  index: 1,
  ref: "R3",
  title: "All-dielectric guided-mode resonance biosensor",
  shortTitle: "GMR biosensor",
  modeId: "TM0",
  modeDescription: "Guided-mode resonance, TM-polarized",
  materialClass: "Dielectric",
  baseMaterials: "Si3N4;SiO2;Ta2O5",
  layerStructure: "Si3N4(200nm) + SiO2(400nm) + Ta2O5(120nm)",
  origin: "EXP",
  resonanceWavelengthNm: 850,
  spectralRange: "820-880 nm",
  fomRiuInv: 3158,
  sensitivityNmPerRiu: 180,
  fwhmNm: 0.057,
  qFactor: 15000,
  evidence:
    "The guided-mode resonance appears at 850 nm with a sensitivity of 180 nm/RIU. [...] The linewidth, as estimated from the transmission spectrum in Fig. S2, is approximately 0.057 nm.",
  location: "Page 4, Fig. 3; Page 7, Fig. S2",
  reviewStatus: "Edit",
  notes: "The paper only reports FWHM as a figure-estimated approximation, not a precise number. Flagged for review.",
  reconciliationLog:
    "Gemini 3.5 Flash flagged this row: the paper's own text states FWHM only as an approximate, figure-derived value.",
});

// R7 -- a plasmonic (gold-coated) design the model still extracted since
// it IS a real RI sensor, but out of scope for an all-dielectric-only
// literature review -- the kind of judgment call only a human reviewer
// makes, distinct from the AI's own file-level domain check.
const recordR7 = record({
  fileId: "file-3",
  filename: "spr_sensor_2020.pdf",
  index: 0,
  ref: "R7",
  title: "Gold-coated SPR fiber-optic RI sensor",
  shortTitle: "Au SPR fiber sensor",
  modeDescription: "Surface plasmon resonance",
  materialClass: "Metal;Dielectric",
  baseMaterials: "Au;SiO2",
  layerStructure: "Au(50nm) + SiO2",
  origin: "EXP",
  resonanceWavelengthNm: 633,
  fomRiuInv: 210,
  sensitivityNmPerRiu: 900,
  fwhmNm: 4.3,
  qFactor: 150,
  evidence: "A 50 nm gold film supports the plasmonic resonance used for sensing.",
  location: "Page 3, Methods",
  reviewStatus: "Exclude",
  notes: "Plasmonic (metal-coated) design, out of scope for this all-dielectric review.",
  reviewedAt: new Date(now - 90_000).toISOString(),
});

export const extractionRecords: ExtractionRecord[] = [
  recordR1,
  recordR2,
  recordR3,
  recordR7,
];
export const flaggedRecord = recordR3;
export const reviewCounts = {
  all: extractionRecords.length,
  toConfirm: extractionRecords.filter((r) => r.reviewStatus === "Edit").length,
  excluded: extractionRecords.filter((r) => r.reviewStatus === "Exclude").length,
};

// Page 23's export preview name -- same normalizeFilename-friendly shape
// buildDefaultExportName produces from a real batch's filenames.
export const exportDefaultName = "microring_2023_and_2_more";
