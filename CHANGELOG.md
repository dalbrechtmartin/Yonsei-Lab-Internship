# Changelog

## [1.3.0](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/compare/v1.2.0...v1.3.0) (2026-09-01)


### Features

* add Photon chat feature with components for message list, panel, and chips ([0eb8819](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/0eb88198e8278ff898b4f63ec67b41e94839f453))
* **backend:** sensing-medium and FOM-relation recompute, per-field evidence sourcing ([0f39018](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/0f390180db74a873bf7615e9784db7ebddbc6ddb))
* **extraction:** comprehensive traceable review card with recompute panels and per-field sources ([eb1d977](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/eb1d97746eddc3fe39f11e4bcda2bd82966db305))
* **extraction:** per-field confirm workflow and assisted editing ([87c72c2](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/87c72c2c7bc230707468d7757bd8d6e838c5cdf6))


### Bug Fixes

* **backend:** clean floating-point noise in recomputed FOM/FWHM/Sensitivity ([d4f40b3](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/d4f40b3176e50cc307ee03914102e53d08ef271f))
* **backend:** reduce near-empty extraction rows, clarify unfillable gaps ([2dc83b1](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/2dc83b1dfefad2f080a7aa9975388fa7a708aeb1))
* **ci:** add GEMINI_API_KEY placeholder for backend job ([bf613ec](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/bf613ecac412b2e54ba295763598d69d90892729))
* **extraction:** batch per-page evidence lookups, pinpoint per-field sources ([7ea112c](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/7ea112c9dbf706da545a1ccb9a1617e85b2141bd))
* update for loop to use strict mode in evidence matches function ([70290e4](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/70290e41d796e70fa6667762d7afee9f3050b935))

## [1.2.0](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/compare/v1.1.0...v1.2.0) (2026-08-25)


### Features

* **backend:** support multi-source citations and per-record review edits ([c4f93b1](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/c4f93b17b027fcbd55272f4d5347271f02cfd60e))
* **extraction:** rewrite extraction as a 4-step review wizard ([ba16170](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/ba16170cf78c79b5444b510e22051a23c2ec40f4))
* **guide:** document Mode 2 end to end with genuine-render pages ([9cf04cf](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/9cf04cf233386de6ebfbec94ab58ee540da5abd2))
* update Chinese localization and add new guide pages ([56d256d](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/56d256d35968875cdc2c784e2e0c4bdb1552a676))


### Bug Fixes

* **backend:** remove unnecessary quotes from fitz type hints ([8c30f13](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/8c30f133af6ff3d1f717873f96e29c9aa7edc804))


### Performance Improvements

* Refactor code structure for improved readability and maintainability ([8486f0c](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/8486f0cde9961d1d1b7f39daf852829c20d4cfb1))

## [1.1.0](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/compare/v1.0.0...v1.1.0) (2026-08-11)


### Features

* **extraction:** add cheap domain-relevance triage before consensus extraction ([05bce37](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/05bce37b544918d8e476527ae4079a5622934f2d))


### Bug Fixes

* **docker:** install ca-certificates in the Dockerfile ([b0710c5](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/b0710c5933a83177cb673c28bf3942f85b3e2377))
* **docker:** make pip/setuptools/wheel cleanup version-agnostic ([91f70df](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/91f70dfdb95c575106c28cadf84a5dc1dd17a362))
* **frontend:** correct lab name from MPBEL to BPEL in guide and locales ([292fcfa](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/292fcfa3019c6ee22214f29ffe528364ed6bdc25))


### Performance Improvements

* improve PageSpeed score (caching, SEO, a11y, code splitting) ([4f702da](https://github.com/dalbrechtmartin/Yonsei-Lab-Internship/commit/4f702dae1824fd8524dd03b438c1c7a97a35d836))
