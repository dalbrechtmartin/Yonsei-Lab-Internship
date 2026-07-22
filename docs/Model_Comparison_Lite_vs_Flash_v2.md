# Model Comparison v2: `gemini-3.1-flash-lite` vs `gemini-3.5-flash`, with the refined prompt

Re-run of the extraction accuracy comparison using `backend/prompt-enhance-test.txt` (the
rule-tightened prompt proposed in [Model_Comparison_Lite_vs_Flash.md](Model_Comparison_Lite_vs_Flash.md)),
against the same source PDFs in `backend/tests-pdfs/`. Goal: check whether the prompt fixes
proposed in v1 actually closed the gaps they targeted.

- **Lite** = `Gold_Standard_Data_From_Lite_v2.xlsx` (model: `gemini-3.1-flash-lite`)
- **Flash** = `Gold_Standard_Data_From_Flash_v2.xlsx` (model: `gemini-3.5-flash`)
- Both runs used `backend/prompt-enhance-test.txt`, forced to a single model each (no fallback), against all 10 test PDFs (7 distinct papers + 3 duplicates: `13`/`13_Copie`, `47`/`47_Copie`, `77`/`77_Copie`).
- Row counts grew substantially over v1: **Lite 20 rows**, **Flash 23 rows** (multiple records per paper are now the norm, not the exception — see "Completeness" below).

## Infra note found while re-running this test

`main.py`'s `MODEL_FALLBACK_CHAIN` currently lists `'gemini-flash-latest'` as the fallback model.
That alias now resolves to a model that **rejects `thinking_budget: 0`** — every call fails with
`400 INVALID_ARGUMENT`. The explicit id `gemini-3.5-flash` (what "Flash" actually means throughout
both comparison docs) does not have this problem. **The fallback tier in production is currently
silently broken** — if `gemini-3.1-flash-lite` ever exhausts its quota mid-run, every remaining
paper in that batch will fail instead of falling over to Flash. Worth a one-line fix
(`'gemini-flash-latest'` → `'gemini-3.5-flash'`) independent of anything else in this doc.

## Per-paper results

| Paper | Winner | Notes |
| --- | --- | --- |
| **13** (Fano resonances) | Flash (slight) | Both models now correctly include SiO2 in `Base Materials` (v1's inconsistency bug is fixed for this paper). Flash still uniquely identifies the physical modes (TD/MQ/MD, verified against the paper's own resonance analysis on p.4); Lite still only labels "R1/R2/R3". New shared bug: both classify Si as `Dielectric` only, omitting `Semiconductor` — elemental Si is a genuine semiconductor by the prompt's own "material's own physical/chemical nature" rule, not merely a compound containing one. |
| **22** (Graphene absorber) | Flash (slight) | Lite now drops Graphene from `Base Materials` while keeping it in `Layer Structure` — the inconsistency bug from v1 has moved from Flash to Lite. Flash fixed it (all 4 materials present in both fields). Spectral range is a wash: the paper gives exact wavelengths (22.5µm and 74.5µm); per the new MIR/THz boundary (25µm), Mode A is MIR and Mode B is THz. Lite calls both MIR (right for A, wrong for B); Flash calls both THz (wrong for A, right for B) — neither model split the classification per-mode despite having the exact numbers to do so. |
| **47** (Metacavity) | Flash | Flash captures **both** distinct results the paper reports for its benchmark 2nd mode — simulation (FOM=2877, S=483, Q=5320) and experimental (FOM=1669, S=449.43, Q=3706) — and correctly uses the average Q-factor (3706) over the maximum (4140) for the experimental headline, per the new rule. Lite only captured the experimental row, missing the simulation result entirely. No more fabricated `Cavity(3000nm)` pseudo-layer from either model — that v1 bug is fixed. Neither model addresses the sapphire substrate the DBR is explicitly deposited on (p.5) — silently dropped by both, with no justification in `Notes` as the new substrate rule requires. |
| **53** (SPR graphene/GST) | Flash | Flash's layer order (Au(500)→Graphene→GST(400)→Au(300)) still matches the paper's fabrication description. Lite's `Layer Structure` field is backwards (starts with Au(300nm)) — worse than v1: Lite's own `Notes` field *describes* the correct order (500→graphene→400→300) while the structured `Layer Structure` field contradicts it. GST is now consistently tagged `Phase-change` by both models (the v1 ambiguity is resolved); Graphene's class (`Dielectric` vs `Semiconductor`) is a new, genuinely unresolvable ambiguity — the paper never labels it and the prompt's 5-class list has no "semimetal/2D conductor" option. |
| **65** (EIT) | Mixed, edge to Lite | Both models now capture all 3 distinct cases (h=0, h=60nm, and the dimensionless Δl=12nm "Other"-domain case) — the v1 completeness gap is fully fixed for this paper, for both models. Flash makes a new, concrete error: it attributes the Q=23 quote to its "Δl=20nm, h=0nm" row, but that exact quote says "l = l1 − l2 = 25 nm" (p.3) — a different asymmetry value than the row it's attached to. Lite correctly leaves Q-factor blank for that row instead. Flash's layer structure is slightly more accurate for h=0nm (correctly omits the SiO2 layer that doesn't exist at h=0); Lite lists a spurious "SiO2(0nm)". |
| **75** (EIT low-loss) | Lite | Both models now include the substrate (the v1 "Flash leaves Layer Structure null" bug is fixed). But Flash invents an unmentioned `SiO2(10nm)` layer — the paper only describes a Si bar on a quartz substrate with geometric parameters `h1=10nm, h2=110nm`; nothing identifies `h1` as SiO2, and Flash's own `Notes` admit this is inferred ("h1 is the thickness of the SiO2 spacer layer... though here described as part of the substrate/structure"), which is exactly the kind of unsupported guess the prompt prohibits. Lite's error is milder: it uses "Quartz" instead of the required standard chemical formula "SiO2" in `Base Materials`. |
| **77** (Fano THz) | Flash | Flash again finds the second, genuine result the paper reports on p.7 (n=0.3 change → FOM=116.6, S=700 nm/RIU) — verified word-for-word in the text. Lite misses it again, on both `77` and `77_Copie`, despite the new completeness self-check. Spectral range: paper states operating range 2–5µm explicitly (p.3), which is MIR by the new boundary rule for all but the extreme low end. Lite calls it NIR on both copies (wrong both times, and its own `Notes` on `77` explicitly acknowledge the rule and then don't apply it). Flash calls it NIR on `77` but **MIR on `77_Copie`** — same paper, different answers, showing real run-to-run non-determinism even at `temperature=0`. |

## Score: 5 – 1 – 1 (Flash – Lite – mixed)

The gap widened in Flash's favor compared to v1's 3–3–1. The new prompt rules did not land evenly:

**What the new prompt fixed, verified across both models:**

1. **Substrate default-include** (papers 13, 75): both models now include named substrates in `Base Materials` consistently with `Layer Structure`. Still incomplete — paper 47's sapphire substrate is silently dropped by both models with no justification, so the "you must state your reason for excluding" half of the rule isn't being triggered when a substrate is dropped silently rather than deliberately.
2. **Max-vs-mean statistic** (paper 47): both models now correctly report the average Q-factor (3706) as the headline number and note the maximum (4140) separately — this was a clean fix.
3. **No fabricated geometry-as-layer** (paper 47's old `Cavity(3000nm)`): gone from both models' output. However, a related-but-different failure mode appeared: Flash now fabricates an entire *material* not named in the source text (paper 75's `SiO2(10nm)`) rather than mislabeling a geometry parameter. The rule targeted the specific failure it was written for, not the general pattern.
4. **Completeness self-check**: dramatically increased row counts and fixed real gaps — paper 65's dimensionless FOM case is now caught by both models (previously only Lite found it in v1), and Flash now finds paper 47's second (simulation) result. But it did not fix Lite's completeness gaps on papers 47 and 77 — Lite still returns one row where two distinct results exist, despite the explicit re-scan instruction.

**What's still broken, or newly broken:**

- **Spectral range numeric boundaries**: both models now visibly *reason* about the label-vs-number conflict in `Notes` (an improvement in transparency over v1), but final classification is still wrong about half the time, on both models, including one case (paper 77) where the same model gave different answers for byte-identical duplicate PDFs.
- **Non-determinism at temperature=0**: paper 77's two identical copies got different `Material Class`, different `Spectral Range`, and a different row count from Flash. This means any single run of this comparison carries real sampling noise — a cleaner methodology would run each paper 3× per model and look at the modal answer rather than trusting one pass.
- **Elemental semiconductor materials mis-tagged as `Dielectric` only** (Si in papers 13, 75, both models): the prompt's material-class rule gives negative examples (don't call SiO2/Si3N4/Ta2O5 "Semiconductor" just because they contain Si/N/Ta) but no positive example confirming that elemental Si itself should get the `Semiconductor` tag — both models under-generalized from the negative examples.
- **New self-contradiction bug in Lite** (paper 53): its `Notes` field states the physically correct layer order while its structured `Layer Structure` field states the opposite. This is worse than v1's plain "wrong order" bug because it's a within-row inconsistency, not just an error.

## Addendum: `gemini-3.6-flash` (partial run — quota-capped at 6/10 papers)

Gemini released 3.6 recently, and `gemini-flash-latest` (the alias already hardcoded as the fallback
in `main.py`) now resolves to it — confirmed via `response.model_version`. It rejects
`thinking_budget: 0` (the cause of the earlier 400 errors), so this run used the prompt with
`thinking_config` removed entirely, letting the model use its own default dynamic thinking.

**This run did not finish.** It processed `13`, `13_Copie`, `22`, `47`, `47_Copie`, `53` and then hit
`429 RESOURCE_EXHAUSTED` on `65` — a **daily** quota, not a per-minute one: a direct test call made
right after the run still returned the same 429. `65`, `75`, `77`, and `77_Copie` were never
attempted. Output saved as `docs/Gold_Standard_Data_From_Flash36_v2.xlsx` (17 rows, 6 papers).

Because coverage isn't equal, this isn't folded into the 5–1–1 score above — but on the 6 papers it
did reach, `gemini-3.6-flash` was the strongest of the three models on every one of them:

- **Paper 13**: the only one of the three models that classifies Si as `Dielectric;Semiconductor`
  (both Lite and Flash 3.5 call it `Dielectric` only — see the shared-bug note above). Also
  correctly labels the TD/MQ/MD modes, matching Flash 3.5.
- **Paper 22**: the only one of the three to get **both** modes' spectral range right (Mode A at
  22.5µm → MIR, Mode B at 74.5µm → THz). Lite and Flash 3.5 each got one of the two backwards.
- **Paper 47**: matches Flash 3.5's fixes (sim+exp split captured, average Q=3706 used over the
  max, no fabricated `Cavity` pseudo-layer) and additionally surfaces the sapphire/Al2O3 DBR
  substrate that both other models silently dropped. That said, it's not clean: the two duplicate
  runs (`47` vs `47_Copie`) name the same substrate differently ("Sapphire" in one, "Al2O3" in the
  other — non-determinism again), and the `Base Materials` list pulls in Al2O3 without clearly
  distinguishing it from the *different* Al2O3 adsorbate film the paper uses elsewhere for an
  unrelated surface-sensing calibration — worth a human check before trusting that field as-is. It
  also found a genuinely new record neither other model reported: the paper's "bare microcavity"
  baseline comparison (Q = 2638 ± 290, no metasurface).
- **Paper 53**: same correct Au(500)→Graphene→GST(400)→Au(300) layer order as Flash 3.5; Lite is
  still backwards here.

**Practical verdict**: `gemini-3.6-flash` looks like a real accuracy upgrade, but as tested it isn't
viable as a drop-in replacement for this pipeline's free-tier batch workflow — thinking-enabled
calls are much slower, and the daily quota is tight enough that it couldn't complete a 10-paper
batch in one run. Using it for real would mean a paid tier, spreading the batch across multiple
days, or a code change to checkpoint/resume partial batches — none of which `main.py` currently
does.

I can re-run the missing 4 papers (`65`, `75`, `77`, `77_Copie`) once the daily quota resets if you
want full coverage for this model.

## Which model should you use? (updated)

The v1 recommendation (**default to `gemini-3.5-flash`**) holds and strengthens: Flash benefited far
more from the prompt refinement than Lite did, particularly on completeness (it now reliably finds every
distinct result per paper, which Lite still doesn't) and on the fixes that required real reasoning
(max-vs-mean, pseudo-layer avoidance). Lite's remaining errors are still the "hard to fix by prompting"
kind flagged in v1 — wrong layer order, missed secondary results — plus one new self-contradiction bug.

The **diff-and-reconcile** approach from v1 remains the most reliable option if both calls are
affordable: the two models still rarely fail on the same paper in the same way, and the newly observed
non-determinism (same PDF, different answer) is itself an argument for running each paper more than
once regardless of which single model you pick.

**Before trusting the fallback chain in `main.py` for a production run**, fix the `gemini-flash-latest`
→ `gemini-3.5-flash` issue noted above — it's currently a silent dead end, not a working fallback.
