# Model Comparison: `gemini-3.1-flash-lite` vs `gemini-3.5-flash`

Extraction accuracy comparison for the FOM/Sensitivity/Q-factor dataset pipeline, verified against the source PDFs in `backend/tests-pdfs/`.

- **Lite** = `Gold_Standard_Data_From_Lite.xlsx` (model: `gemini-3.1-flash-lite`)
- **Flash** = `Gold_Standard_Data_From_Flash.xlsx` (model: `gemini-3.5-flash`)
- Both runs used the same extraction prompt (`backend/prompt.txt`).

## Per-paper results

| Paper                      | Winner               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **13** (Fano resonances)   | Flash (slight)       | All shared numbers/quotes/pages correct in both. Flash correctly identifies the physical resonance modes R1=TD, R2=MQ, R3=MD (verified against the paper's Table 1); Lite only labels them "1st/2nd/3rd peak". Flash drops SiO2 from `Base Materials` while still listing it in `Layer Structure` — inconsistent, and likely wrong since the substrate probably has an optical role in this SOI structure.                                                                                                                                |
| **22** (Graphene absorber) | Lite (2/3)           | Lite correctly keeps Si in `Base Materials` (paper explicitly lists it as one of the four resonator materials); Flash drops it while keeping it in `Layer Structure`. Lite correctly classifies Mode B as MIR; Flash wrongly calls it THz (the paper only mentions THz for an unrelated tuning technology). Flash wins only on page-citation precision (page 1 vs Lite's page 2 — both quote real text, but Flash's page matches its own quote better).                                                                                   |
| **47** (Metacavity)        | Flash                | Flash cites the correct page (6) for the precise experimental values with error bars, and correctly uses the representative Q-factor (3706, the reported average) instead of conflating it with the maximum (4140, which Lite used as its headline value). Flash's material class (`Dielectric`) is correct; Lite's (`Dielectric;Semiconductor`) is not — none of Si3N4/SiO2/Ta2O5 are semiconductors. Flash's one flaw: it invents a `Cavity(3000nm)` layer, but `Lcav` is a resonator length parameter, not a physical deposited layer. |
| **53** (SPR graphene/GST)  | Flash                | Flash's layer order (Au(500) → Graphene → GST(400) → Au(300)) matches the paper's fabrication description (resonator on top, ground plane at the bottom); Lite's order is inverted. Material classification of GST (`Dielectric` vs `Semiconductor`) is unverifiable either way — the paper never labels it explicitly, just "phase-change material".                                                                                                                                                                                     |
| **65** (EIT)               | Lite                 | Lite captured a 3rd, genuinely distinct result (Δl=12nm, Q=54, dimensionless FOM=22.4) that **Flash missed entirely** — a real completeness gap for Flash (2 rows vs Lite's 3). Flash is right to include the "glass" substrate that Lite omitted from `Layer Structure`/`Base Materials`, but this is a smaller issue than a whole missing data row.                                                                                                                                                                                     |
| **75** (EIT low-loss)      | Lite                 | The paper explicitly and repeatedly (3x) describes a quartz/SiO2 substrate under the silicon bars. Lite captures it correctly; Flash leaves `Layer Structure` null and hedges in `Notes`, which isn't supported by the text — the ambiguity Flash cites doesn't actually exist in the paper.                                                                                                                                                                                                                                              |
| **77** (Fano THz)          | Mixed, edge to Flash | Spectral range: the paper self-labels its own results as "near-infrared" in-text and in a table, but the stated wavelength (2–5 µm) is physically MIR by standard band conventions. Lite follows the paper's own label (NIR); Flash follows physical convention (MIR) — neither is simply "wrong". Flash found a genuine second result (n=0.3 case, FOM=116.6, S=700 nm/RIU, page 7) that **Lite missed entirely**.                                                                                                                       |

## Score: 3 – 3 – 1 (Flash – Lite – mixed)

No model is a strict winner. They fail in different, fairly consistent ways:

**Flash (`gemini-3.5-flash`)**

- Stronger on multi-step physical/scientific reasoning: identifying named resonance modes, choosing the statistically correct representative value over a superlative ("maximum") headline number, getting physical layer stacking order right.
- Weaker on completeness: on 1 of 7 papers it silently skipped an entire distinct result row that Lite found.
- Recurring bug: drops a material from `Base Materials` while still listing it in `Layer Structure` (papers 13, 22) — an internal inconsistency, not just a borderline judgment call.
- Occasionally invents a pseudo-layer from a geometric parameter that isn't a physical material layer (paper 47's "Cavity").

**Lite (`gemini-3.1-flash-lite`)**

- More exhaustive at sweeping a paper for every distinct mode/case (won the completeness question on 65; lost it on 77 — so completeness isn't uniformly better, just less bad on balance here).
- Weaker on judgment calls requiring real physical reasoning: got a layer order backwards (53), conflated "maximum" with the reported average (47), mis-tagged non-semiconductor dielectrics as `Semiconductor` (47), missed an explicit substrate the paper stated 3 times (75).
- No internal `Base Materials`/`Layer Structure` inconsistency was observed for Lite.

## Which model should you use?

**Recommend `gemini-3.5-flash` as the primary model**, for one main reason: the errors Flash makes are largely _fixable by tightening the prompt_ (see below), while Lite's errors are more often outright physical-reasoning mistakes (wrong layer order, wrong statistic, wrong material classification) that a smaller/older model is inherently more prone to and less likely to self-correct even with a better prompt. Flash's biggest weakness — occasionally skipping an entire result row — is also the single most addressable issue via an explicit "completeness sweep" instruction (below), whereas asking a weaker model to reliably reason about "is this the average or the maximum value?" is a harder ask.

If the pipeline is cost/latency-sensitive and can tolerate a second-pass human review specifically focused on material-layer structure and statistics, Lite remains a viable cheaper option — its failure modes are also fairly easy for a human reviewer to spot (a reversed layer list, a "maximum" value used as if it were typical) once you know to look for them.

**Best option if feasible: run both and reconcile.** Given the two models rarely fail on the _same_ paper, a simple diff-and-flag step (rows where Lite and Flash disagree get a human look) would catch nearly all of the errors found in this comparison at the cost of 2x the extraction calls.

## Can prompt refinement fix these issues?

Partially — some issues are prompt-fixable, others are closer to inherent model reasoning limits.

**Likely fixable by refining `backend/prompt.txt`:**

1. **Substrate inclusion ambiguity** (papers 13, 22, 65, 75). The prompt already has a rule (line 25) to exclude "mechanical support with no optical role" substrates from `Base Materials` while still listing them in `Layer Structure` (line 30) — but it gives the model no concrete criterion for _when_ a substrate counts as "optical" vs "mechanical only", so both models guess inconsistently. Fix: add a default-to-include rule, e.g. _"If a substrate material (glass, quartz, SiO2, Si, etc.) is explicitly named in the text, default to including it in Base Materials unless the text explicitly states it plays no role in the resonance. When excluding a named substrate, you must state the specific justification in Notes."_ Forcing an explicit justification when excluding is the key change — it turns a silent guess into an auditable claim.

2. **Statistic selection: representative vs maximum value** (paper 47's Q-factor). Rule 38.3 already says to prefer the "headline" abstract/conclusion result, but doesn't anticipate that an abstract's superlative ("maximum X") can be less representative than a mean value reported later with error bars. Fix: add _"If the abstract reports a 'maximum' value but the results section reports a mean/typical value (e.g., with ± error bars) for the same case, prefer the mean/typical value as the primary number and note the maximum in Notes."_

3. **Fabricated pseudo-layers** (paper 47's invented "Cavity(3000nm)"). Fix: add an explicit exclusion — _"Do not include resonator geometry parameters (cavity length, gap size, period, pitch) as if they were physical material layers in Layer Structure — only include layers that are actually deposited/stacked materials with a thickness."_

4. **Missed result rows / completeness** (papers 65 and 77, one miss each way). Fix: add a final self-check instruction — _"Before finalizing your answer, re-scan the full document specifically for additional numeric FOM/Sensitivity/Q-factor combinations you have not yet captured as a record — parametric sweeps, secondary cases, alternate configurations — and add a separate record for each one found."_ This kind of explicit "reflection pass" instruction is a well-established way to improve recall in LLM extraction tasks.

5. **Spectral Range classification ambiguity** (paper 77's NIR/MIR conflict). The prompt currently doesn't define numeric band boundaries, so the model has to choose between the authors' self-label and the physical value when they disagree. Fix: define explicit boundaries and a tie-break rule, e.g. _"Classify Spectral Range using standard boundaries (Visible: 380–780nm, NIR: 780nm–2.5µm, MIR: 2.5–25µm, THz: >25µm/<10THz) applied to the actual reported wavelength value, not the authors' own label, if the two conflict."_ This makes the classification deterministic and removes the ambiguity entirely — a clear, fixable rule bug rather than a reasoning limitation.

6. **Layer order convention** (paper 53's inverted stack). The prompt says "in physical order" (line 30) but never states which end goes first. Fix: _"List layers from the side where light is incident (top, e.g. resonating/patterned layer) down to the substrate, matching the paper's schematic figure orientation."_

**Less likely to be fully fixed by prompting alone:**

- Correctly inferring _which_ material in a stack is "resonant" vs "mechanical support only" when the paper is genuinely ambiguous about it — this needs real domain reasoning about each specific structure, which is exactly where model capability (Flash > Lite in this comparison) matters more than instruction wording.
- Catching every distinct result buried in a long paper — better recall on long documents is partly a raw-capability issue (attention/context handling), though the completeness-sweep instruction above should meaningfully reduce it, not eliminate it.

**Bottom line:** most of the concrete errors found here trace back to prompt underspecification (no numeric spectral-range boundaries, no rule for maximum-vs-mean, no rule against fabricating pseudo-layers, no forced justification for excluding a substrate) rather than a hard capability ceiling. Tightening the prompt along the lines above, combined with using `gemini-3.5-flash`, should close most of the gap seen in this test. A lightweight two-model diff-and-review step would still be the most reliable way to catch what's left.
