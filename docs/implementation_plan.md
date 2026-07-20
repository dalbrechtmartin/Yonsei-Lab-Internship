# Data Dictionary & Implementation Plan

**Project: λLens — Automated Extraction and Interactive Visualization of Wavelength-Domain FOM Data**

---

## 1. Context and Scope

The project targets **Figure of Merit (FOM)** data in the **wavelength domain only**:

```
FOM = Sensitivity (S) / Full Width at Half Maximum (FWHM)     [unit: RIU⁻¹]
```

Two data sources coexist:

- A **gold-standard** Excel file (ground truth reference, intentionally minimal, focused on FOM)
- **Scientific PDF papers**, from which data is automatically extracted via an LLM

---

## 2. Data Dictionary

### 2.1 Gold-standard Excel (reference file, 7 rows)

| Column                        | Type   | Description                                           | Rule                                                                                       |
| ----------------------------- | ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `ref`                         | string | Citation identifier, e.g. `[47]`                      | Must match the associated PDF filename                                                     |
| `title`                       | string | Full paper title                                      | Copied as-is                                                                               |
| Layer structure               | string | Material stack with thicknesses (nm) + material class | Free-form in this file, but standardized in my extended schema (see 2.2 `Layer Structure`) |
| `wavelength based FOM (/RIU)` | number | FOM value in the wavelength domain                    | Only numeric value kept as ground truth                                                    |

### 2.2 Extended schema (my PDF extraction → harmonized Excel)

| Column                                               | Type           | Values / Format                                                                                 | Inclusion / exclusion rule                                                                                                              |
| ---------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Ref`                                                | string         | PDF filename                                                                                    | Repeated identically for all rows of the same paper                                                                                     |
| `Title`                                              | string         | free text                                                                                       | —                                                                                                                                       |
| `Mode/Case`                                          | string         | e.g. `"2nd mode"`, `"main"`, `"Δl=12nm"`                                                        | **One row per mode/case** — never merge metrics across different modes                                                                  |
| `Material Class`                                     | string         | `Metal` / `Dielectric` / `Semiconductor` / `Polymer` / `Phase-change` (sorted, joined with `;`) | Closed vocabulary, alphabetical sort required                                                                                           |
| `Base Materials`                                     | string         | standard chemical formulas (`Au`, `Si3N4`...), sorted, joined with `;`                          | Excludes fabrication/packaging materials with no optical role                                                                           |
| `Layer Structure`                                    | string         | full stack with thicknesses, `+` between layers, `(xN)` for repeats                             | Includes the substrate even if excluded from `Base Materials`                                                                           |
| `Spectral Range`                                     | string         | `Visible` / `NIR` / `MIR` / `THz`                                                               | —                                                                                                                                       |
| `Origin`                                             | string         | `EXP` / `SIM` / `UNCLEAR`                                                                       | Never silently inferred — `UNCLEAR` if ambiguous                                                                                        |
| `FOM Reported`                                       | string         | `Yes` / `No` / `Unclear`                                                                        | Never infer a value without explicit textual evidence                                                                                   |
| `FOM Domain`                                         | string         | `Wavelength` / `Other` / `Unclear`                                                              | `Wavelength` **only** if FOM = S/FWHM in RIU⁻¹. An alternative FOM (e.g. Q×Amplitude) = `Other`, never mapped onto the wavelength value |
| `FOM Definition`                                     | string / null  | author's own definition, verbatim or paraphrased                                                | `null` if not explicit                                                                                                                  |
| `Wavelength-based FOM (/RIU)`                        | number / null  | numeric value                                                                                   | `null` if `FOM Domain ≠ Wavelength` or not reported                                                                                     |
| `FOM Quote` / `Sensitivity Quote` / `Q-factor Quote` | string / null  | short exact quote from source text                                                              | Required for any accepted numeric value — otherwise the value AND the quote are `null`                                                  |
| `FOM Page` / `Sensitivity Page` / `Q-factor Page`    | integer / null | page number                                                                                     | Evidence traceability                                                                                                                   |
| `Sensitivity (nm/RIU)`                               | number / null  | auto-converted from µm/RIU (×1000)                                                              | —                                                                                                                                       |
| `Q-factor`                                           | number / null  | —                                                                                               | —                                                                                                                                       |
| `Notes`                                              | string / null  | conversions, ambiguities, exclusion reasons                                                     | Any commentary goes here, **never** into the "Quote" fields (reserved for original text)                                                |
| `Model Used`                                         | string         | resolved LLM model name (e.g. Gemini flash)                                                     | Technical traceability, not scientific                                                                                                  |

### 2.3 Cross-cutting rules for missing / ambiguous values

- No numeric value is accepted without an associated quote and page → otherwise the triplet `(value, quote, page)` = `null, null, null`.
- **"Respectively" rule**: when a sentence gives several values paired positionally (e.g. _"FOM of X and Y, sensitivities of A and B, respectively"_), the pairing `(X,A)` / `(Y,B)` is strictly respected — values from different positions are never mixed.
- Priority is given to the **authors' own headline result** (abstract/conclusion) over an isolated higher value found in a secondary parametric study.
- `Review status` (`Approve/Edit/Exclude`) is **not** generated by the LLM — it is a human decision reserved for the review workflow (Weeks 6-8), intentionally absent from the current extraction pipeline so as not to lock in a decision that must remain manual.

---

## 3. Implementation Plan

### 3.1 Stack

| Component      | Choice                                                       | Justification                                                      |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Frontend       | Vue (fr/en/ko/zh i18n built in)                              | Reactivity for dropzone + interactive charts                       |
| Backend        | FastAPI (Python)                                             | Simple REST API + easy integration with PyMuPDF and the Gemini SDK |
| PDF extraction | PyMuPDF (text) + LLM Gemini (JSON structuring)               | Raw text is structured via a strict prompt enforcing a JSON schema |
| Visualization  | Dot/scatter charts with median, log/linear scale, CSV export | Directly meets Phase 1 requirements                                |

### 3.2 Planned schedule

| Week | Objective                               | Planned deliverable                                                                                    |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | Understand the dataset, define the spec | This data dictionary and implementation plan                                                           |
| 2    | Excel ingestion                         | Drag-and-drop upload, sheet/column detection, missing-value handling, data preview                     |
| 3    | Interactive visualization               | Scatter plot with hover, zoom, grouping, median, sample count, log scale                               |
| 4    | Complete Phase 1                        | Filters, export functions, error handling, tests across multiple spreadsheet layouts, short user guide |
| 5    | Start PDF extraction                    | Single-PDF extraction prototype (schema, evidence, page/figure location)                               |
| 6    | Apply scientific validation rules       | Domain/origin classification, mode/case preservation, canonical FOM check                              |
| 7    | Process and evaluate ten PDFs           | Batch extraction + precision/recall/classification accuracy vs. gold standard                          |
| 8    | Integrate and finalize                  | End-to-end prototype, final report and demonstration                                                   |

## 4. Stretch Goals (if time allows)

The following extensions are **not part of the core eight-week scope** and will only be considered once the required deliverables for each phase are complete:

- **Prompt maker for other domains**: a configurable prompt-generation tool allowing the extraction schema to be adapted to scientific domains beyond wavelength-domain FOM
- **Multi-language support**: extending translation beyond the current fr/en/ko/zh set
- **Additional chart types**: complementing the dot/scatter plot with other visualization forms (e.g. box plots, bar charts) for comparing FOM data
- **Colorblind-accessible charts**: using the **Okabe-Ito** color palette for all chart series and groupings, to ensure readability across common forms of color vision deficiency

---
