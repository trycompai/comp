# [1.71.0](https://github.com/trycompai/comp/compare/v1.70.0...v1.71.0) (2025-12-16)


### Features

* Added logout function to onboarding/setup ([#1914](https://github.com/trycompai/comp/issues/1914)) ([d58341b](https://github.com/trycompai/comp/commit/d58341b6f84dbce8309f9059bc845a1846021fa6))
* **integrations:** update sanitized inputs for github to read monorepo apps ([#1929](https://github.com/trycompai/comp/issues/1929)) ([5912194](https://github.com/trycompai/comp/commit/5912194a1bcd728a09c98d5f15264de00252dc72))
* **onboarding:** add skip functionality to onboarding steps ([#1925](https://github.com/trycompai/comp/issues/1925)) ([b522c10](https://github.com/trycompai/comp/commit/b522c10231ad82a8391881d66230c3df7c050c58))


### Reverts

* Revert "[dev] [Itsnotaka] daniel/ui ([#1915](https://github.com/trycompai/comp/issues/1915))" ([#1928](https://github.com/trycompai/comp/issues/1928)) ([ec93c2e](https://github.com/trycompai/comp/commit/ec93c2ee8add06e598213a17a0eb29eca073d56c))

# [1.70.0](https://github.com/trycompai/comp/compare/v1.69.0...v1.70.0) (2025-12-12)


### Bug Fixes

* **auditor:** increase max poll duration to 30 minutes and add limit to scrape ([#1897](https://github.com/trycompai/comp/issues/1897)) ([764d605](https://github.com/trycompai/comp/commit/764d6055fb8a1c7d4fa90d8d41c8234fc55c3de9))


### Features

* **api:** add access request notification email functionality ([#1910](https://github.com/trycompai/comp/issues/1910)) ([8d2a811](https://github.com/trycompai/comp/commit/8d2a81127c523e92decc56e29a7ef4f53e28986d))

# [1.69.0](https://github.com/trycompai/comp/compare/v1.68.1...v1.69.0) (2025-12-08)


### Features

* **trust:** auto-enable frameworks in trust record for backward compatibility for old organizations ([#1873](https://github.com/trycompai/comp/issues/1873)) ([a289b57](https://github.com/trycompai/comp/commit/a289b573624adf4328dc54044899521b02628251))

## [1.68.1](https://github.com/trycompai/comp/compare/v1.68.0...v1.68.1) (2025-12-08)


### Bug Fixes

* **trust:** old org upload certificate problems ([#1871](https://github.com/trycompai/comp/issues/1871)) ([c92a416](https://github.com/trycompai/comp/commit/c92a416161cdd2fe66a885f60a0de96f6a57c132))

# [1.68.0](https://github.com/trycompai/comp/compare/v1.67.1...v1.68.0) (2025-12-05)


### Bug Fixes

* **home:** improve error handling in organization page ([#1869](https://github.com/trycompai/comp/issues/1869)) ([e86a2c2](https://github.com/trycompai/comp/commit/e86a2c2bff3f43d6fa52ad3a2d7519d7ce9f3290))


### Features

* **auth:** update better-auth to version 1.4.5 and improve login handling ([#1870](https://github.com/trycompai/comp/issues/1870)) ([64c12a7](https://github.com/trycompai/comp/commit/64c12a703386f620b3a509691fafa7383da75388))

## [1.67.1](https://github.com/trycompai/comp/compare/v1.67.0...v1.67.1) (2025-12-05)


### Bug Fixes

* **db:** add createdAt column to invitation model ([#1866](https://github.com/trycompai/comp/issues/1866)) ([44a18a2](https://github.com/trycompai/comp/commit/44a18a25facb8a07cd81da2d1f7023f9b7a419cf))

# [1.67.0](https://github.com/trycompai/comp/compare/v1.66.0...v1.67.0) (2025-12-05)


### Features

* **api:** add AI-powered question extraction and update dependencies ([#1858](https://github.com/trycompai/comp/issues/1858)) ([33600d0](https://github.com/trycompai/comp/commit/33600d08a7d1229efce5c9b468aa0661ab4d60eb))

# [1.66.0](https://github.com/trycompai/comp/compare/v1.65.0...v1.66.0) (2025-11-26)


### Bug Fixes

* **app:** invite the deactivated user again as admin ([#1844](https://github.com/trycompai/comp/issues/1844)) ([3ea5c1f](https://github.com/trycompai/comp/commit/3ea5c1f3b41f09104cfcefc2eecc6f762154cfb2))


### Features

* **tasks:** add tab view preference and improve task list UI. ([bdbb14c](https://github.com/trycompai/comp/commit/bdbb14cb783bb24c58d1fe5e098bc638c4f12c5f))

# [1.65.0](https://github.com/trycompai/comp/compare/v1.64.1...v1.65.0) (2025-11-26)


### Bug Fixes

* **soa:** enhance EditableSOAFields with justification dialog and save logic, change colors ([#1840](https://github.com/trycompai/comp/issues/1840)) ([8bdd1ad](https://github.com/trycompai/comp/commit/8bdd1adca77bb695f94c5f453de5853d3eb01fa1))
* **soa:** remove unrelevant text ([#1841](https://github.com/trycompai/comp/issues/1841)) ([02d1919](https://github.com/trycompai/comp/commit/02d191938347d457c6d441b66b08f29f3df9715b))


### Features

* **frameworks:** add people score calculation and visualization ([#1842](https://github.com/trycompai/comp/issues/1842)) ([fbbe666](https://github.com/trycompai/comp/commit/fbbe6661f30815c880541167b23d9000ef55d3bf))
* **SOA:** implement SOA logic and do refactor ([#1836](https://github.com/trycompai/comp/issues/1836)) ([96e115e](https://github.com/trycompai/comp/commit/96e115ed86a3a7c9bb34c9ba24cfbc46e9190445))

## [1.64.1](https://github.com/trycompai/comp/compare/v1.64.0...v1.64.1) (2025-11-25)


### Bug Fixes

* **vendors:** update model version from gpt-5.1-mini to gpt-5-mini ([#1833](https://github.com/trycompai/comp/issues/1833)) ([df6e1ad](https://github.com/trycompai/comp/commit/df6e1ad62ae3221f44f3d87042953e5252901a3e))

# [1.64.0](https://github.com/trycompai/comp/compare/v1.63.0...v1.64.0) (2025-11-24)


### Bug Fixes

* **app:** remove Demo button on booking-step page ([#1822](https://github.com/trycompai/comp/issues/1822)) ([9e0506e](https://github.com/trycompai/comp/commit/9e0506edd19eef9d0c177097e3d1aae9a2f97391))


### Features

* **security-questionnaire:** add action to answer a single question ([#1826](https://github.com/trycompai/comp/issues/1826)) ([d122112](https://github.com/trycompai/comp/commit/d12211254301370a2b79514fb3a35aeae03788a6))

# [1.63.0](https://github.com/trycompai/comp/compare/v1.62.0...v1.63.0) (2025-11-24)


### Features

* **tasks:** add localStorage support for task view preference ([#1817](https://github.com/trycompai/comp/issues/1817)) ([4caed2a](https://github.com/trycompai/comp/commit/4caed2aa9eb76267fb77dbea560216beee269b57))

# [1.62.0](https://github.com/trycompai/comp/compare/v1.61.0...v1.62.0) (2025-11-21)


### Features

* **trust:** add friendlyUrl parameter for access request methods ([#1813](https://github.com/trycompai/comp/issues/1813)) ([fa97962](https://github.com/trycompai/comp/commit/fa9796212905aa60b533d63f0fe82f6b5a9dc4de))

# [1.61.0](https://github.com/trycompai/comp/compare/v1.60.1...v1.61.0) (2025-11-20)


### Features

* **attachments:** add drag and drop for task attachments ([#1805](https://github.com/trycompai/comp/issues/1805)) ([6c2844b](https://github.com/trycompai/comp/commit/6c2844bebd38a86afa183f33ac7056b7b801c090))

## [1.60.1](https://github.com/trycompai/comp/compare/v1.60.0...v1.60.1) (2025-11-20)


### Bug Fixes

* **api-env:** added env prevention ([#1793](https://github.com/trycompai/comp/issues/1793)) ([047a448](https://github.com/trycompai/comp/commit/047a448e7ffc4651cdd60d9afe0dab1745fc4d78))
* **portal:** fix downloading device agent on safari ([#1791](https://github.com/trycompai/comp/issues/1791)) ([699073f](https://github.com/trycompai/comp/commit/699073f945816d7062d32c07f29fcdc942d40aff))

# [1.60.0](https://github.com/trycompai/comp/compare/v1.59.3...v1.60.0) (2025-11-19)


### Features

* **api:** update dependencies and refactor email service imports ([#1782](https://github.com/trycompai/comp/issues/1782)) ([5afd2dc](https://github.com/trycompai/comp/commit/5afd2dc234b0378d009209e4465f714788c3ec26))
* **trust:** add loading skeletons for grants and requests tabs ([#1768](https://github.com/trycompai/comp/issues/1768)) ([fed0f41](https://github.com/trycompai/comp/commit/fed0f41b7f60459142f6e8fdbabc995ebcc5975b))

## [1.59.3](https://github.com/trycompai/comp/compare/v1.59.2...v1.59.3) (2025-11-18)


### Bug Fixes

* **api:** update buildspec and Dockerfile to prepare workspace packag… ([#1775](https://github.com/trycompai/comp/issues/1775)) ([22fb0eb](https://github.com/trycompai/comp/commit/22fb0eb434250333ff7758d393f8d24bf13a0168))
* **portal:** update module to download executable device agent file for windows ([#1766](https://github.com/trycompai/comp/issues/1766)) ([70ff9c7](https://github.com/trycompai/comp/commit/70ff9c7a6951c9558bc91a2ab25de886ec0c3fae))

## [1.59.2](https://github.com/trycompai/comp/compare/v1.59.1...v1.59.2) (2025-11-18)


### Bug Fixes

* **tasks:** include 'not_relevant' status in task completion checks ([#1770](https://github.com/trycompai/comp/issues/1770)) ([b5dd9c8](https://github.com/trycompai/comp/commit/b5dd9c8d4976facff39badf5dab19139b581ffde))

## [1.59.1](https://github.com/trycompai/comp/compare/v1.59.0...v1.59.1) (2025-11-17)


### Bug Fixes

* **tasks:** increase maxAttempts for answer-question and vendor orchestrator tasks ([#1763](https://github.com/trycompai/comp/issues/1763)) ([ecaadd5](https://github.com/trycompai/comp/commit/ecaadd55ae01cf1c94aa33540aeab7686fff995b))

# [1.59.0](https://github.com/trycompai/comp/compare/v1.58.0...v1.59.0) (2025-11-17)


### Features

* **questionnaire:** add security questionnaire feature with AI parsing and auto-answering ([#1755](https://github.com/trycompai/comp/issues/1755)) ([dd4f86c](https://github.com/trycompai/comp/commit/dd4f86c512f40a03b175434877ba6f48059b1bc5))
* **questionnaire:** enhance S3 client creation on parse action ([#1760](https://github.com/trycompai/comp/issues/1760)) ([4079b73](https://github.com/trycompai/comp/commit/4079b7315af6651c353d5f1d9dff9924a36269a6))
* **security-questionnaire:** add AI-powered questionnaire parsing an… ([#1751](https://github.com/trycompai/comp/issues/1751)) ([e06bb15](https://github.com/trycompai/comp/commit/e06bb1522a0251b10bfdb00f6b7580c8dc46c6a0))
* **security-questionnaire:** add support for questionnaire file uploads to S3 ([#1758](https://github.com/trycompai/comp/issues/1758)) ([1ba8866](https://github.com/trycompai/comp/commit/1ba886635839b3e3e9a60cdc34648bee2f60ec13))
* **security-questionnaire:** add tooltip and disable CTA for unpublished policies ([#1761](https://github.com/trycompai/comp/issues/1761)) ([849966e](https://github.com/trycompai/comp/commit/849966eb4329a17771148add8e970f55c8a2ec95))
* **tasks:** enhance task management with automation features and UI improvements ([#1752](https://github.com/trycompai/comp/issues/1752)) ([60dfb28](https://github.com/trycompai/comp/commit/60dfb28e6c1727c677571bc3736333fce57b7944))
* **trust-access:** implement trust access request management system ([#1739](https://github.com/trycompai/comp/issues/1739)) ([2ba3d5d](https://github.com/trycompai/comp/commit/2ba3d5d64591a566c24cc443540bc4e853d9a350))

# [1.58.0](https://github.com/trycompai/comp/compare/v1.57.1...v1.58.0) (2025-11-13)


### Features

* **onboarding:** add individual tracking for vendors and risks with auto-expand ([#1748](https://github.com/trycompai/comp/issues/1748)) ([7a85be8](https://github.com/trycompai/comp/commit/7a85be80f4c27da0cef485ad09e7152222dc8c48))

## [1.57.1](https://github.com/trycompai/comp/compare/v1.57.0...v1.57.1) (2025-11-13)


### Bug Fixes

* **tasks:** show all task statuses and sort alphabetically ([#1743](https://github.com/trycompai/comp/issues/1743)) ([413b14c](https://github.com/trycompai/comp/commit/413b14ca95d5490a086aecb418a3305c2099534a))

# [1.57.0](https://github.com/trycompai/comp/compare/v1.56.7...v1.57.0) (2025-11-11)


### Features

* add contractor role ([#1735](https://github.com/trycompai/comp/issues/1735)) ([2d87914](https://github.com/trycompai/comp/commit/2d87914a25ef5edad2cee3f033e9583dc30b04d2))

## [1.56.7](https://github.com/trycompai/comp/compare/v1.56.6...v1.56.7) (2025-11-07)


### Bug Fixes

* **portal:** remove Ubuntu support help ([#1715](https://github.com/trycompai/comp/issues/1715)) ([b604b18](https://github.com/trycompai/comp/commit/b604b18a5c16db2f9b58be64f2262d70fca66d34))
* **portal:** update macOS version requirements ([#1716](https://github.com/trycompai/comp/issues/1716)) ([21c259b](https://github.com/trycompai/comp/commit/21c259bb5c20fd3798df9c2bca3ef0883863b901))

## [1.56.6](https://github.com/trycompai/comp/compare/v1.56.5...v1.56.6) (2025-10-31)


### Bug Fixes

* **app:** send emails to employees when all policies are published ([#1707](https://github.com/trycompai/comp/issues/1707)) ([df7a461](https://github.com/trycompai/comp/commit/df7a4617e008174624c02bc89905af389f7c478d))

## [1.56.5](https://github.com/trycompai/comp/compare/v1.56.4...v1.56.5) (2025-10-30)


### Bug Fixes

* **cloud-tests:** improve error messages and user feedback ([#1703](https://github.com/trycompai/comp/issues/1703)) ([9abfc4a](https://github.com/trycompai/comp/commit/9abfc4a2bd0b320d1e804f9b3cf4a714f52d1002))

## [1.56.4](https://github.com/trycompai/comp/compare/v1.56.3...v1.56.4) (2025-10-29)


### Bug Fixes

* **cloud-tests:** display integration scan errors in UI ([#1698](https://github.com/trycompai/comp/issues/1698)) ([a27b3ba](https://github.com/trycompai/comp/commit/a27b3bab8cb4d01c3516db583f9963955cb57164)), closes [#1695](https://github.com/trycompai/comp/issues/1695)

## [1.56.3](https://github.com/trycompai/comp/compare/v1.56.2...v1.56.3) (2025-10-23)


### Bug Fixes

* **api:** allow uploading excel documents for task ([#1677](https://github.com/trycompai/comp/issues/1677)) ([8c7f955](https://github.com/trycompai/comp/commit/8c7f9550755090d8aa780fc8fbcd2ebadf1e7fb8))

## [1.56.2](https://github.com/trycompai/comp/compare/v1.56.1...v1.56.2) (2025-10-21)


### Bug Fixes

* **app:** auto-approve the org creation on staging ([#1676](https://github.com/trycompai/comp/issues/1676)) ([dbb149e](https://github.com/trycompai/comp/commit/dbb149ea2eecc32b9d470112fd293f72b91e6eaa))

## [1.56.1](https://github.com/trycompai/comp/compare/v1.56.0...v1.56.1) (2025-10-17)


### Bug Fixes

* **app:** show device list of only employees ([#1646](https://github.com/trycompai/comp/issues/1646)) ([f5fc56e](https://github.com/trycompai/comp/commit/f5fc56e696968110bfe66e5c533cbc7f3790f847))
* **portal:** fixed the issue that the Posthog didn't identify people on the portal ([#1668](https://github.com/trycompai/comp/issues/1668)) ([5614d62](https://github.com/trycompai/comp/commit/5614d620135e86fa2c40862d439a67ebd856d747))

# [1.56.0](https://github.com/trycompai/comp/compare/v1.55.2...v1.56.0) (2025-10-08)


### Bug Fixes

* **app:** add ConditionalOnboardingTracker component and update layout ([#1618](https://github.com/trycompai/comp/issues/1618)) ([af4977c](https://github.com/trycompai/comp/commit/af4977c439794bb79f8f86f41c129c7599cd4284))
* **app:** show the image on onboarding section by setting unoptimized ([#1619](https://github.com/trycompai/comp/issues/1619)) ([1f4639f](https://github.com/trycompai/comp/commit/1f4639ff0a3149e5ba446083c58391e616913789))
* **app:** task dates should be creation date instead of defaults ([#1620](https://github.com/trycompai/comp/issues/1620)) ([12e5e15](https://github.com/trycompai/comp/commit/12e5e15b52cc85dfb007b026d762231c603a1a16))


### Features

* **db:** add Fraud to RiskCategory ([#1615](https://github.com/trycompai/comp/issues/1615)) ([cc265e6](https://github.com/trycompai/comp/commit/cc265e65ddc171cbd5b09d125ae6a6933528896c))

## [1.55.2](https://github.com/trycompai/comp/compare/v1.55.1...v1.55.2) (2025-10-07)


### Bug Fixes

* **app:** handle potential null for integrationsUsed in UnifiedWorkflowCard ([#1612](https://github.com/trycompai/comp/issues/1612)) ([561d9b1](https://github.com/trycompai/comp/commit/561d9b18f60d280d8a6627d6ebbdc552ecc8efff))
* **app:** set portal url to new-policy-email sent to employees ([#1614](https://github.com/trycompai/comp/issues/1614)) ([5264c76](https://github.com/trycompai/comp/commit/5264c76690ae3ec27bb7d66b13c497fda8dc6d5e))

## [1.55.1](https://github.com/trycompai/comp/compare/v1.55.0...v1.55.1) (2025-10-06)


### Bug Fixes

* **app:** fix AWS cloud test error caused by improper usage of batchTriggerAndWait ([#1608](https://github.com/trycompai/comp/issues/1608)) ([0cddf49](https://github.com/trycompai/comp/commit/0cddf49a7373a538c25eae13239b2eff5bbbdf55))
* **app:** make reviewDate readonly and update it once policy is published ([#1603](https://github.com/trycompai/comp/issues/1603)) ([c966652](https://github.com/trycompai/comp/commit/c966652189c15506fc01caea1bdfdf3b175ce20d))
* **app:** onboarding flow being overriden ([#1595](https://github.com/trycompai/comp/issues/1595)) ([572003f](https://github.com/trycompai/comp/commit/572003fba63662f7c92ef9efb69afbbda527f1d3))
* **auth:** improve OTP error handling with specific user messages ([#1596](https://github.com/trycompai/comp/issues/1596)) ([0bb7b2b](https://github.com/trycompai/comp/commit/0bb7b2b8c5e6cb0f3809ffcd9574b121707ec5ae))
* **portal:** fix build error to add AUTH_SECRET env to portal ([#1590](https://github.com/trycompai/comp/issues/1590)) ([3596376](https://github.com/trycompai/comp/commit/3596376014660ce688d5ee13efed9bae880a18ee))

# [1.55.0](https://github.com/trycompai/comp/compare/v1.54.0...v1.55.0) (2025-09-30)


### Features

* **app:** implement automated tasks ([#1550](https://github.com/trycompai/comp/issues/1550)) ([56f019d](https://github.com/trycompai/comp/commit/56f019d7508c19f24fc3fd31113d9c0fa788fb81))
* **portal:** add gmail signin ([#1587](https://github.com/trycompai/comp/issues/1587)) ([f8d6af4](https://github.com/trycompai/comp/commit/f8d6af4e8723b4c79a7ae7c508ad8ac34892db84))
* **portal:** display policies with PDF format ([#1559](https://github.com/trycompai/comp/issues/1559)) ([3d7ee5f](https://github.com/trycompai/comp/commit/3d7ee5fd37f40258b11615a48d57e330567ae7fc))
* **secrets:** fix secrets ([b3af710](https://github.com/trycompai/comp/commit/b3af710412ff76200eefb87ac8fc6ccd6774b455))

# [1.54.0](https://github.com/trycompai/comp/compare/v1.53.0...v1.54.0) (2025-09-19)


### Bug Fixes

* **app:** show only published policies on Employee Tasks ([#1547](https://github.com/trycompai/comp/issues/1547)) ([92b2dc9](https://github.com/trycompai/comp/commit/92b2dc9312c183e54c09e86e85706dbe01942196))


### Features

* **app:** Add support for ISO 42001 ([#1549](https://github.com/trycompai/comp/issues/1549)) ([1a9d57b](https://github.com/trycompai/comp/commit/1a9d57b8dc748016ab1a5389041017984455de5b))
* **app:** Auto mark tasks as todo when review period starts ([#1546](https://github.com/trycompai/comp/issues/1546)) ([777c0db](https://github.com/trycompai/comp/commit/777c0db8473c464d909ebce5ea6e0c2c3f72e31f))

# [1.53.0](https://github.com/trycompai/comp/compare/v1.52.1...v1.53.0) (2025-09-18)


### Features

* **app:** Add reviewDate column to Task table ([#1541](https://github.com/trycompai/comp/issues/1541)) ([68e0e42](https://github.com/trycompai/comp/commit/68e0e42fe26ac5391afa696a1cd15ae3148aadd3))
* **app:** Create a scheduled task for Recurring policy ([#1540](https://github.com/trycompai/comp/issues/1540)) ([1eb9623](https://github.com/trycompai/comp/commit/1eb9623c05a88b8c04b303ac505d32ae0c13baeb))

## [1.52.1](https://github.com/trycompai/comp/compare/v1.52.0...v1.52.1) (2025-09-17)


### Bug Fixes

* force version bump past v1.52.0 ([d7c58c0](https://github.com/trycompai/comp/commit/d7c58c0411d0d467cdc99a4211d197c86cae1f06))

# [1.52.0](https://github.com/trycompai/comp/compare/v1.51.0...v1.52.0) (2025-09-17)


### Bug Fixes

* **app:** only show owner/admin users on Task UI ([#1524](https://github.com/trycompai/comp/issues/1524)) ([151ccc6](https://github.com/trycompai/comp/commit/151ccc6acc914ff86c304e14abc50b19c96d13af))
* **portal:** show only published policies on portal ([#1520](https://github.com/trycompai/comp/issues/1520)) ([ceb99d7](https://github.com/trycompai/comp/commit/ceb99d786644bc86ed8968a71502e25a35ffca1f))


### Features

* **portal:** Whenever the policy is published, signedBy field should be cleared and send email to only previous singers to let them accept it again. ([#1532](https://github.com/trycompai/comp/issues/1532)) ([8c1b525](https://github.com/trycompai/comp/commit/8c1b525ead980181cd3e8f57e72961c1b82b7e4f))

# [1.52.0](https://github.com/trycompai/comp/compare/v1.51.0...v1.52.0) (2025-09-17)


### Bug Fixes

* **app:** only show owner/admin users on Task UI ([#1524](https://github.com/trycompai/comp/issues/1524)) ([151ccc6](https://github.com/trycompai/comp/commit/151ccc6acc914ff86c304e14abc50b19c96d13af))
* **portal:** show only published policies on portal ([#1520](https://github.com/trycompai/comp/issues/1520)) ([ceb99d7](https://github.com/trycompai/comp/commit/ceb99d786644bc86ed8968a71502e25a35ffca1f))


### Features

* **portal:** Whenever the policy is published, signedBy field should be cleared and send email to only previous singers to let them accept it again. ([#1532](https://github.com/trycompai/comp/issues/1532)) ([8c1b525](https://github.com/trycompai/comp/commit/8c1b525ead980181cd3e8f57e72961c1b82b7e4f))

## [1.51.1](https://github.com/trycompai/comp/compare/v1.51.0...v1.51.1) (2025-09-16)


### Bug Fixes

* **portal:** show only published policies on portal ([#1520](https://github.com/trycompai/comp/issues/1520)) ([ceb99d7](https://github.com/trycompai/comp/commit/ceb99d786644bc86ed8968a71502e25a35ffca1f))

# [1.51.0](https://github.com/trycompai/comp/compare/v1.50.0...v1.51.0) (2025-09-16)


### Bug Fixes

* add DEQUEUED state handling in OnboardingTracker component ([74d7151](https://github.com/trycompai/comp/commit/74d71518a53e7de404eb321dd9c778d7ab1ce57a))
* add missing newlines in package.json and index.ts files for consistency ([f33bb34](https://github.com/trycompai/comp/commit/f33bb348cfb5d8919468f397965417489824a6e1))
* add missing port number to database connection string ([bafbb27](https://github.com/trycompai/comp/commit/bafbb27affac170251a68f0a79038bc9c97851a1))
* add newline at end of package.json for proper formatting ([fb91918](https://github.com/trycompai/comp/commit/fb91918aac91b456b8b61eac01e542b95a5542e3))
* add persistent cmd session support in Windows script ([bfad924](https://github.com/trycompai/comp/commit/bfad924a7ecf8149f978c4545524c98a93a77573))
* add robust database connectivity rules for CodeBuild ([50c9a7e](https://github.com/trycompai/comp/commit/50c9a7eac5ea4994eb94d5cbd82b002bdb059246))
* add verification for public directory in buildspec.yml ([b8e2064](https://github.com/trycompai/comp/commit/b8e20645333547842e7731deef05c0fc53c7732c))
* Added Control property to task sidebar ([8cc503b](https://github.com/trycompai/comp/commit/8cc503b70f02e3a0bb448fa0b4179f8601811017))
* Allow access to auditor role ([1553400](https://github.com/trycompai/comp/commit/155340017c62a09dcfd03709011e25df89a85863))
* **auth:** rename email parameter for invite function to improve clarity ([95bb6c9](https://github.com/trycompai/comp/commit/95bb6c9c8c12f6543cfa4e4a3e4862c8471845e6))
* **buildspec, Dockerfile:** update Node.js version and adjust Prisma client generation path ([2d677d0](https://github.com/trycompai/comp/commit/2d677d05f54d9cc84c0def4369c1e07ed46bd511))
* **buildspec:** adjust working directory for dependency installation ([0774214](https://github.com/trycompai/comp/commit/0774214ef2aba48215acb24d4739884f578ff753))
* **buildspec:** enhance type checking step with optional script handling ([f151692](https://github.com/trycompai/comp/commit/f151692672559c3ee2d9b00586befb0a3964b375))
* comprehensive Prisma deployment fix for Vercel monorepo ([6ef5033](https://github.com/trycompai/comp/commit/6ef50339a5ef29931cc1991241e0ca777db21f7b))
* **config:** update Vercel environment check for standalone output ([39f3710](https://github.com/trycompai/comp/commit/39f3710cda9cf6ba57f3aa0308ee5f19868acff9))
* copy Prisma binary to locations where runtime is searching ([7c3af89](https://github.com/trycompai/comp/commit/7c3af894a75439a2df512e79d834e83cd7ca7a9f))
* correct Docker entry point for monorepo structure ([bb3aecb](https://github.com/trycompai/comp/commit/bb3aecb58c407592a76afa6ca3c197ccd538d56b))
* correct environment variable assignment for Prisma query engine in Next.js config ([1ccaae1](https://github.com/trycompai/comp/commit/1ccaae1279b80e9410283f52fb6d183c2121d92f))
* correct indentation in package.json scripts section ([f3ed25a](https://github.com/trycompai/comp/commit/f3ed25a85ae44a585633f309ada466b896df1ae8))
* correct static file paths for next.js standalone monorepo structure ([55442ab](https://github.com/trycompai/comp/commit/55442ab2f4f96b25be5d919be43580cd32bdb733))
* correct static file paths for next.js standalone monorepo structure ([12adfa6](https://github.com/trycompai/comp/commit/12adfa621f5ed8b6ebae8227fb07fc4055a63ee5))
* correct Windows path formatting in fleet label creation script ([f34610f](https://github.com/trycompai/comp/commit/f34610fcfcc46a157d80c36204be40147679da7f))
* **deploy:** ensure pulumi update completes before starting build ([d47e9b5](https://github.com/trycompai/comp/commit/d47e9b5b5b3eff8e36c1006f12f4a108506575bb))
* **docs:** Broken contributing guide link in PR template ([7c8f509](https://github.com/trycompai/comp/commit/7c8f509a594183c1bd41a187271f4aeba7065573))
* Enforce role-based access control in app ([8a81f42](https://github.com/trycompai/comp/commit/8a81f42b22da29a7a39e2b4698e94421a6a329fd))
* enhance directory and marker file handling in Windows script ([49e3ec4](https://github.com/trycompai/comp/commit/49e3ec4f51bdee8647aa3c1684abcef041d376df))
* enhance elevation and error handling in Windows script ([1a67177](https://github.com/trycompai/comp/commit/1a67177a638a87576c662dafefaad39158ef0884))
* enhance elevation process in Windows script for better user experience ([9b4aeee](https://github.com/trycompai/comp/commit/9b4aeee2cfca20766bc6d457ef83f465dc52f700))
* enhance logging and error handling in Windows script ([9c54eb0](https://github.com/trycompai/comp/commit/9c54eb09fba40a63b4d5a641526f7cd4292f61e3))
* enhance session token retrieval in middleware ([27a7254](https://github.com/trycompai/comp/commit/27a72549959ea8f367bf0cff86ae6faf75a5ed01))
* enhance structure and logging in Windows script ([e27a003](https://github.com/trycompai/comp/commit/e27a0038e1bcb63cca12411cd3cfac0b6867a05b))
* ensure consistent newline handling in Prisma client and exports ([b5ce5f1](https://github.com/trycompai/comp/commit/b5ce5f11d108cf41259c5125b5768e974daf551e))
* ensure Prisma binaries are included in Vercel deployment ([fa43f5e](https://github.com/trycompai/comp/commit/fa43f5eb9c75aba50fa232bbc8db8fe84f823a82))
* ensure Prisma binaries are included in Vercel deployment with custom output path ([e877714](https://github.com/trycompai/comp/commit/e877714c77c2cb3ce6a238518cfc4e0de162cd25))
* ensure Prisma client is generated during Next.js build for deployment ([a9ee09a](https://github.com/trycompai/comp/commit/a9ee09aebc52ed2f8766e90c526a81909495228c))
* ensure Prisma query engine binary is properly copied in Trigger.dev deployment ([8d2fe33](https://github.com/trycompai/comp/commit/8d2fe332c99b5b65505c728ea9ac5e307fa87bd3))
* fixed search ([36e12f1](https://github.com/trycompai/comp/commit/36e12f12cf3aae097ded63c33dc803b9596bcddd))
* improve directory creation logic in Windows script ([71858ec](https://github.com/trycompai/comp/commit/71858ec19bcbce3b8e624e84d71a9420e62b668c))
* improve directory selection logic in Windows script ([b2da074](https://github.com/trycompai/comp/commit/b2da0741cf3148966bc5800f335023f8af43a3b9))
* improve Docker entry point detection for Next.js standalone build ([4e11649](https://github.com/trycompai/comp/commit/4e11649476f44cbe425c6a5446557083d83d2f9c))
* improve error handling in file upload processes ([af52289](https://github.com/trycompai/comp/commit/af52289e4bb71752f915d96f74f542ada14ea293))
* improve error handling in ToDoOverview component ([d4dd686](https://github.com/trycompai/comp/commit/d4dd686f8997002d569cde201ca65f2f1a134ee1))
* improve PowerShell command in Windows script for better execution ([a313739](https://github.com/trycompai/comp/commit/a313739b3ff8c6481342ef4872fec4b2698886c8))
* improve variable handling and logging in Windows script ([042db43](https://github.com/trycompai/comp/commit/042db43cd4e45087aaa1e881c4ca59d88947050f))
* **infra:** correct echo command syntax in buildspec for database URL check ([1140eba](https://github.com/trycompai/comp/commit/1140ebae1b1230eca4b6b3554f7a37cc388c92c1))
* **infra:** correct secrets manager syntax for codebuild and container ([7ada508](https://github.com/trycompai/comp/commit/7ada5083c13a632a3ade97f3c7d453271adfa191))
* **infra:** correctly resolve database connection string for codebuild ([093bcb3](https://github.com/trycompai/comp/commit/093bcb3f5ba310ac4fc17be6d1c751fe71c56827))
* **infra:** update health check configuration in container module ([c9b41a6](https://github.com/trycompai/comp/commit/c9b41a6acf20a8caa94a2b01c4c0271acb638013))
* **infra:** update health check endpoint in container configuration ([5f3f4a2](https://github.com/trycompai/comp/commit/5f3f4a23a3386374b7a8a389f3eb3da4a5af2757))
* Keep the `getRowId` and `rowClickBasePath` optional ([544afdc](https://github.com/trycompai/comp/commit/544afdcbd4885c501d2a2d9985e409f053020c53))
* Member edit only for owner/admin ([1a2b9d2](https://github.com/trycompai/comp/commit/1a2b9d28d476f030a55761e30f2b9143df70ca87))
* Move role checks on org level ([a4056bf](https://github.com/trycompai/comp/commit/a4056bf4d904baf450fd07c4e7ce0f83100e3504))
* prevent build failure when metadata service is inaccessible ([951f462](https://github.com/trycompai/comp/commit/951f4622985044669503ca60a21388cc5f9207f5))
* prevent infinite loop in TrustPortalSwitch by updating useEffect dependencies ([5f28201](https://github.com/trycompai/comp/commit/5f282018f3c9bee323a92503ff6a20406306a5ec))
* Prisma seed command in `packages/db` ([a9957cd](https://github.com/trycompai/comp/commit/a9957cd3daf9d15430d1c47c45ae4e6139e47b92))
* properly separate app env vars from infra env vars ([55aa5d6](https://github.com/trycompai/comp/commit/55aa5d607a1f33acec59bf1008e8b7a2604e6957))
* refine directory creation logic in Windows script ([bfbfca0](https://github.com/trycompai/comp/commit/bfbfca0466d37452bc3aa70116d4eb96adeaa03c))
* refine directory existence checks and logging in Windows script ([37ea28b](https://github.com/trycompai/comp/commit/37ea28b5a3362a1e678e9d23105cb16a00e715c3))
* refine directory handling and logging in Windows script ([3982150](https://github.com/trycompai/comp/commit/3982150f3ea620097a535d80c7c315b3d7df76c3))
* remove duplicate dependsOn key ([#1426](https://github.com/trycompai/comp/issues/1426)) ([9035238](https://github.com/trycompai/comp/commit/90352385bf358b6e4d30f0345ab715652b3dc3f7))
* remove duplicate import of HealthModule in app.module.ts ([e02a51c](https://github.com/trycompai/comp/commit/e02a51c6c6330fe3bbb4b0097bf20492c47787a0))
* resolve CodeBuild database connectivity issues ([04b1555](https://github.com/trycompai/comp/commit/04b155568619dfcbdce12bf6aa234df1c77229a2))
* resolve YAML syntax error in buildspec.yml ([a458015](https://github.com/trycompai/comp/commit/a458015cf0bb5656f383c6371987b0c88474027f))
* restore import of environment variables in Next.js config ([1e01ae4](https://github.com/trycompai/comp/commit/1e01ae418cdca30e722b35e8c0a32791379aef04))
* restore prebuild script in package.json for Prisma client generation ([4850e68](https://github.com/trycompai/comp/commit/4850e6863a31cda497de1ef01cb96c47c9e1a475))
* Restrict member management actions to Owner/Admin roles ([260131d](https://github.com/trycompai/comp/commit/260131d8fd8fc51c9564ce78b92381218740b0a9))
* set controller versioning to VERSION_NEUTRAL for API consistency ([9ede4e8](https://github.com/trycompai/comp/commit/9ede4e824bf28bb4332bcb38d9cbdf47e73f6433))
* simplify Prisma extension to copy generated client to correct location ([556bd17](https://github.com/trycompai/comp/commit/556bd1721eada7513e50e46d6acd72e60b61b610))
* streamline elevation process in Windows script for clarity ([2705540](https://github.com/trycompai/comp/commit/2705540a6c21cffc581c546ee1d4f7eab7e9e1ce))
* streamline script structure and enhance logging in Windows script ([e9a5afd](https://github.com/trycompai/comp/commit/e9a5afd978b4c0473bfb5ad803aba61f0eba019f))
* Type errors ([ec77b2f](https://github.com/trycompai/comp/commit/ec77b2fb4b605386001af047dc16404f8b3cbad3))
* **ui:** Align Employee breadcrumb and highlight People tab ([97c353b](https://github.com/trycompai/comp/commit/97c353b0e9dd3849bf5b63a6f4a0054159adf450))
* update assetPrefix configuration to ensure proper URL handling in production ([3487041](https://github.com/trycompai/comp/commit/348704157cda7822eb867811d885275806f43ae5))
* update BINARY_TARGET for Prisma extension ([639ac5e](https://github.com/trycompai/comp/commit/639ac5e658383550e2a217733d97141b09a4435f))
* update Dockerfile to remove unnecessary bunfig.toml copy ([05193c1](https://github.com/trycompai/comp/commit/05193c1409d7cead8e71f378844a29dbb277eca9))
* update invitation email domain configuration ([04579b0](https://github.com/trycompai/comp/commit/04579b075ad2976a7a91f3de9891f9170c58a131))
* update marker file handling in Windows script ([fe37a73](https://github.com/trycompai/comp/commit/fe37a738822d0ec16437652724e76280224e13ca))
* Update member role check ([3848a65](https://github.com/trycompai/comp/commit/3848a656a2b9da5c990b37f3bc214e8524f687e8))
* update OpenAI model in onboarding and policy helpers for consistency ([fcb070f](https://github.com/trycompai/comp/commit/fcb070f69e54d33d507d6019563f7f2d1a5cda2c))
* update Prisma extension to properly handle generated client location in Trigger.dev deployment ([a53cb42](https://github.com/trycompai/comp/commit/a53cb42d5c6212df3931bd04f76afd9061f0a3eb))
* update registry path formatting in Windows script ([d48ea60](https://github.com/trycompai/comp/commit/d48ea605084f4a4de1d45c59fb9e384167dda0d3))
* update role query in onboard-organization to use 'contains' for owner ([af9f1c3](https://github.com/trycompai/comp/commit/af9f1c35303664bca65f0ecf5b84fec14e9b5c6d))
* update role validation in InviteMembersModal to prevent admin and employee overlap ([#1485](https://github.com/trycompai/comp/issues/1485)) ([18f3440](https://github.com/trycompai/comp/commit/18f34409af196add1b501a0d1eb6e85f6be34d5c))
* update S3 bucket name environment variable ([1cc4fb2](https://github.com/trycompai/comp/commit/1cc4fb283735f12b091f62938b36af07629535f6))
* update S3 bucket name environment variable ([74b98bc](https://github.com/trycompai/comp/commit/74b98bc267fd2709f7132c59d2a51fe4292bcb4c))
* update typecheck:ci filters to correct package names ([dc8f93b](https://github.com/trycompai/comp/commit/dc8f93b90bddff281bbdfc916910243560d8139c))
* use dynamic port variable for database connection strings ([f1f6030](https://github.com/trycompai/comp/commit/f1f60304efe352a8865f762415544592a970dd5e))
* Validate user role for adding employee ([194b462](https://github.com/trycompai/comp/commit/194b462fe1b46233206a52062187fa6ce5f5614a))
* Validate user role when revoking invitation ([7263791](https://github.com/trycompai/comp/commit/7263791df25c020cd6e0c34c809c92e19bcf0d58))


### Features

* add @ai-sdk/rsc package and update imports ([15d7d66](https://github.com/trycompai/comp/commit/15d7d667556a71a2f8702c0ff88a5c331b0224ff))
* add advanced mode functionality for organizations ([#1503](https://github.com/trycompai/comp/issues/1503)) ([04a9e26](https://github.com/trycompai/comp/commit/04a9e26ad0693bae058175c04f37fcb77b145b32))
* add API endpoint to approve organizations for QA team ([3b526b4](https://github.com/trycompai/comp/commit/3b526b4bd8e47817981f7ea8f8734a19b75e8f24))
* add API endpoint to delete users for QA team ([89a6d16](https://github.com/trycompai/comp/commit/89a6d16daef5e7b67dcc9496c1d2d0e70f865661))
* add BETTER_AUTH_URL to environment variables and buildspec validation ([a767884](https://github.com/trycompai/comp/commit/a76788479d7bb08504a95bae30edebec7595130a))
* add buildspec and deployment scripts for application ([1722e2e](https://github.com/trycompai/comp/commit/1722e2eb260dc4eabf3917abc32bf4851d9dc64b))
* add debug scripts for ECS and CodeBuild log retrieval ([02b7df5](https://github.com/trycompai/comp/commit/02b7df520866a210f4bbb612f3d9f003c1d2f6c3))
* add delete confirmation dialog to CommentItem component ([a94ecd7](https://github.com/trycompai/comp/commit/a94ecd7abd8c3c046ea9840c94b433305d2b0684))
* add department column to policies table ([#1499](https://github.com/trycompai/comp/issues/1499)) ([cff6bc9](https://github.com/trycompai/comp/commit/cff6bc96437c638adf0a7e4d07675a9f881252a6))
* add deployment verification script for ECS ([eee55f6](https://github.com/trycompai/comp/commit/eee55f6e1fbfdf4c1afbf09b9c947ee8bd9dcd62))
* add Dockerfiles for app and portal services ([98efb51](https://github.com/trycompai/comp/commit/98efb51dd67b26b77c32b1797600c3725347ede2))
* add E2E and unit testing workflows ([e1f0f7b](https://github.com/trycompai/comp/commit/e1f0f7ba037909e7282b562f8a9fac8dec7e9387))
* add Font components to email templates for improved typography ([e2059a6](https://github.com/trycompai/comp/commit/e2059a67bdb39459debc1e235874fef104ed67c5))
* add geo field to onboarding process ([fd74000](https://github.com/trycompai/comp/commit/fd740003667abb4bcc4385f44045c3c140b750e2))
* add header value sanitization for S3 metadata ([d582d40](https://github.com/trycompai/comp/commit/d582d40ab80d1af5063fd51401fcdb359ea34c92))
* add Husky hooks for commit message validation and pre-push checks ([99fffad](https://github.com/trycompai/comp/commit/99fffad46c012b6967c12df6c0ddf35faefc7059))
* add migration for JWKS table to support JWT authentication ([9cc1f88](https://github.com/trycompai/comp/commit/9cc1f8895bf096f3461d6665cafb8b95cbddd662))
* add NEXT_PUBLIC_API_URL environment variable ([f31ee34](https://github.com/trycompai/comp/commit/f31ee344dd02061f30952915928c3af70b0f5125))
* Add PDF view for policies ([#1451](https://github.com/trycompai/comp/issues/1451)) ([c4e52fc](https://github.com/trycompai/comp/commit/c4e52fc25642145142ef3d45f716e4fb3be468cf))
* add Prisma client generation task and update build dependencies ([e0061c0](https://github.com/trycompai/comp/commit/e0061c02384a2a344e91ac09baec6f719d8d410e))
* add progress bars to ComplianceOverview for improved visibility ([d84daeb](https://github.com/trycompai/comp/commit/d84daeba7cfedf50ba6f912f5b669282fd869607))
* add required Next.js environment variables with proper validation ([3d10913](https://github.com/trycompai/comp/commit/3d10913a1469af86df9b633d11596bd06462fb2d))
* add risk and vendor action components and regeneration functionality ([6b7d3a4](https://github.com/trycompai/comp/commit/6b7d3a4a2e3663c8e3a1bb0fb7655a7ee98cd2cb))
* add shouldGenerateTypes option to PrismaExtensionOptions ([cbc1d36](https://github.com/trycompai/comp/commit/cbc1d3680b438f07de3b9725bb96456b35833a96))
* Add sorting options for organization list ([bcf4434](https://github.com/trycompai/comp/commit/bcf4434ff0513e40554e7d548d68ccfded55826f))
* add TCP connectivity debugging to buildspec ([804bcb3](https://github.com/trycompai/comp/commit/804bcb3e0f6b6a5d85c7dbd613caf7c65d4bc3a3))
* add TipTap content validation utilities for AI-generated content ([9d0437e](https://github.com/trycompai/comp/commit/9d0437e073c85d830af0f43e45233a28d7354429))
* enable cross-subdomain cookies for authentication ([e7d8521](https://github.com/trycompai/comp/commit/e7d8521e565a2a1104d0eec1dac737d6eb4c7357))
* enable dynamic rendering and set revalidation for layout component ([27f2555](https://github.com/trycompai/comp/commit/27f255523d6ee0f5ccf4ff71f71e7570c7d3b2d7))
* enhance content validation by removing empty text nodes ([ba735e4](https://github.com/trycompai/comp/commit/ba735e4dce27cf8a0fc5db4ba6e611b9c95085b2))
* enhance control status logic and onboarding process ([4e00985](https://github.com/trycompai/comp/commit/4e00985999991de4a6354722b088598c722ed150))
* enhance delete user API to require email for user deletion ([4548a0c](https://github.com/trycompai/comp/commit/4548a0c6694f6ab6f7ad0332a13da36de9797ba0))
* enhance DeviceAgentAccordionItem for macOS support and update download handling ([ebff53e](https://github.com/trycompai/comp/commit/ebff53ec48ad07f7bc21ec220ee7c4bdfbf0b148))
* enhance download agent with improved error handling and configuration ([900d99a](https://github.com/trycompai/comp/commit/900d99a7be390e19036c82a7ccd27ef71f5228bf))
* enhance editor functionality with linkification and configurable extensions ([5bb1f94](https://github.com/trycompai/comp/commit/5bb1f94d3d8d6762d625eead0e423fe7bfb85807))
* enhance Fleet label creation and error handling ([8f84460](https://github.com/trycompai/comp/commit/8f84460d8ea49e4b747523ccdacde175870e0908))
* enhance framework compliance tracking and UI ([c566a01](https://github.com/trycompai/comp/commit/c566a01a86beb32b91e4ae3fd87dca57860d90a0))
* enhance GitHub OIDC module to support existing provider usage ([9212589](https://github.com/trycompai/comp/commit/92125894b5ad1637ac2a137690382fe99f0175b2))
* enhance HybridAuthGuard and update authentication interfaces ([3868a3e](https://github.com/trycompai/comp/commit/3868a3e7b287150068ef3500d62b5a0b03941a56))
* enhance invitation handling and user redirection ([e3fb7d3](https://github.com/trycompai/comp/commit/e3fb7d3686b5338680995fc05afbb0dd7e5b25b9))
* enhance MemberRow component and onboarding task updates ([41f8006](https://github.com/trycompai/comp/commit/41f80062b3f6be20d4fa85802852966ce56bd13f))
* enhance onboarding process with local development support ([a7fab14](https://github.com/trycompai/comp/commit/a7fab14af21cb534778eed5f686e543e04633062))
* enhance onboarding tasks with increased concurrency and retry logic ([362cef8](https://github.com/trycompai/comp/commit/362cef81c3757858e1ea989d092c7549195019cd))
* Enhance PDF handling in policy viewer ([#1476](https://github.com/trycompai/comp/issues/1476)) ([c005b3e](https://github.com/trycompai/comp/commit/c005b3e54ce0381c7c9886e7683ea7460644407f))
* enhance policy management with regeneration and UI improvements ([c4b4c0d](https://github.com/trycompai/comp/commit/c4b4c0dfe957116776a1e04b394540578d5df014))
* enhance Prisma client generation and application secrets management ([d44cfa3](https://github.com/trycompai/comp/commit/d44cfa364b214fa1457a428123fa3a776526b3ca))
* enhance Prisma client generation process with detailed logging ([a9210a8](https://github.com/trycompai/comp/commit/a9210a80a02826dbc8d08566a30567d0a3298a83))
* enhance Prisma exports and update db:generate script ([2d6195d](https://github.com/trycompai/comp/commit/2d6195d8f776096e518f3982732e47d8685dcd18))
* enhance PrismaExtension to resolve and copy schema from @trycompai/db package ([8bd0263](https://github.com/trycompai/comp/commit/8bd02634731ba32f1f933a84dfd204e85a73bdab))
* enhance schema resolution in PrismaExtension for monorepo support ([c413f6f](https://github.com/trycompai/comp/commit/c413f6fc51332f9057653c1929034ac5823fc52d))
* enhance ToDoOverview component with dynamic tab selection ([e03f402](https://github.com/trycompai/comp/commit/e03f4024753fe6e193f27e3f72200e4f838fd00d))
* implement attachment download functionality and metadata retrieval ([dde6d48](https://github.com/trycompai/comp/commit/dde6d486cde5d91163d948f127200238e5e33f93))
* implement auto-resizing for TaskBody textarea ([758cbb2](https://github.com/trycompai/comp/commit/758cbb2624aa6609586f747c1cf471e6b7f1d0db))
* implement comments and attachments functionality in API ([51162ac](https://github.com/trycompai/comp/commit/51162ac03463ea66415e7a7c33e2e1421f04d64a))
* implement control creation functionality with UI integration ([#1497](https://github.com/trycompai/comp/issues/1497)) ([943a7d3](https://github.com/trycompai/comp/commit/943a7d3a1e808ed8a5ec6e518c888a387b2cab8d))
* implement CORS and security headers for API routes ([35aaeb1](https://github.com/trycompai/comp/commit/35aaeb1bd725c3af74444ea8651bd60402bbe2ee))
* implement DynamicMinHeight component for responsive layout ([09f52cf](https://github.com/trycompai/comp/commit/09f52cffd704e0c1bbe26c9a2885f9e19e521154))
* implement JWT authentication and update related components ([2786ef6](https://github.com/trycompai/comp/commit/2786ef6f6d6f677ea017dac812c9268bbdd986ce))
* implement optimistic updates for comments and task attachments ([7fe5669](https://github.com/trycompai/comp/commit/7fe5669da23f5733a0de23889e9ac389eb5763b2))
* implement publish all policies action and UI components ([52afe86](https://github.com/trycompai/comp/commit/52afe8665dd8a87e24cb9c7d1abfe52087c0ef3d))
* implement risk and vendor mitigation tasks ([da94ecc](https://github.com/trycompai/comp/commit/da94ecccd22650a166f1353d90ef4a798e0ceb6d))
* implement session-based JWT retrieval in ApiClient ([33af882](https://github.com/trycompai/comp/commit/33af8822c6251b789f0d0d8ec03ec6ec13662550))
* implement TriggerTokenProvider for access token management ([6812f39](https://github.com/trycompai/comp/commit/6812f39f425023b07df19bb59919546b360dfc51))
* improve invite page handling and user feedback ([eb9bcab](https://github.com/trycompai/comp/commit/eb9bcab5bdf84e670103544297438e1619b3b7f8))
* **infra:** add NEXT_PUBLIC_PORTAL_URL to applications configuration ([bdd5f5f](https://github.com/trycompai/comp/commit/bdd5f5fdd5380a77d4b2e77932a38c73a8f2378e))
* **infra:** add source version to build system configuration ([424f6ad](https://github.com/trycompai/comp/commit/424f6ad684cd41f5ce9a343c96b234ef6db0d79f))
* **infra:** add STS VPC endpoint for IAM role assumption ([b5a70c4](https://github.com/trycompai/comp/commit/b5a70c4895a2d0a13e50899e13cfe5cd42b0f6b9))
* **infra:** enhance application container to support dynamic secret management ([b5a7ee7](https://github.com/trycompai/comp/commit/b5a7ee714ae6d5fb4850d282a9c7656f56e705ab))
* **infra:** enhance build and deployment configurations for applications ([67fc172](https://github.com/trycompai/comp/commit/67fc172794f65552ed3bde57c633e4a51e2520e7))
* **infra:** enhance build system to include required secrets from AWS Secrets Manager ([7de1d6c](https://github.com/trycompai/comp/commit/7de1d6ca8000e020e44994317871ba8d1d06d9df))
* **infra:** implement SSL certificate management and DNS validation ([da41e90](https://github.com/trycompai/comp/commit/da41e909d4beae6ce462dc63a6e3c3edb7058d79))
* **infra:** refactor application secrets management to support individual secrets ([72b00d4](https://github.com/trycompai/comp/commit/72b00d4da3a9a10c3e9ac469fd1aaa923a8a89db))
* **infra:** refactor build system to improve environment variable handling ([cc53704](https://github.com/trycompai/comp/commit/cc53704188f96af17076b0353b23d75564746a93))
* initialize API module with NestJS structure and essential configurations ([2ea50d2](https://github.com/trycompai/comp/commit/2ea50d28525396a8aba2b3f50d6fd4f484241f74))
* initialize Pulumi infrastructure for Pathfinder app ([3cc14fa](https://github.com/trycompai/comp/commit/3cc14fa681a8c1c4bc5d97dbe5ad73e59cf98a1c))
* integrate Prisma client and update database schema handling ([81c4c3a](https://github.com/trycompai/comp/commit/81c4c3a68334200a31826735e4ed07d4665f2712))
* integrate Prisma client generation and update imports for local usage ([e7cbc8f](https://github.com/trycompai/comp/commit/e7cbc8f7e71caf188a55e9437bf977ca7371ec90))
* introduce custom PrismaExtension for enhanced schema handling ([856f869](https://github.com/trycompai/comp/commit/856f869804913ae0a6b6b72cda4d50feb04671e8))
* New & improved dashboard ([38ce071](https://github.com/trycompai/comp/commit/38ce071d7cf5da9eb5bf94d5061fa6ed55608a1b))
* optimize build process with parallel processing and enhanced caching ([7276586](https://github.com/trycompai/comp/commit/7276586d25dda1ed91e2d665213e921b2ea348b8))
* optimize width calculation in ToDoOverview component ([6e55979](https://github.com/trycompai/comp/commit/6e55979c4c20980ee47516f8500b9ebde63743db))
* read app environment variables from apps/app/.env ([b49fb1c](https://github.com/trycompai/comp/commit/b49fb1c352f20ad62dece108ad79308fbac6020e))
* simplify Prisma exports and update db:generate script ([b6f9757](https://github.com/trycompai/comp/commit/b6f97571f437ba3c49d32ccbc00a2dd38381e299))
* streamline policy generation by directly producing TipTap JSON ([1c799e2](https://github.com/trycompai/comp/commit/1c799e2a687c759aa23a2e6d6eda13c5d6a8cbb3))
* Support opening policy in new tab for easier navigation ([42c2626](https://github.com/trycompai/comp/commit/42c2626b61d5e81d92fe032236b87da29f3a2475))
* support protocol-less links in comments ([a5f124b](https://github.com/trycompai/comp/commit/a5f124b5b29032e371e86ed1b653d882fe4dcdc3))
* update AddFrameworkModal to make organizationId optional ([d742463](https://github.com/trycompai/comp/commit/d742463c715548da5f8fad16198a3fc173967110))
* update API client and auth utility to use Bearer token authentication ([1d95394](https://github.com/trycompai/comp/commit/1d95394c95078708b786a28b4d2e603f29c79cb2))
* update auto-pr-to-main workflow to include new chas/* path ([861eb35](https://github.com/trycompai/comp/commit/861eb35f1243f01e49f3aa7dfad36f1561b15e50))
* update dependencies and enhance onboarding process ([59db96d](https://github.com/trycompai/comp/commit/59db96df9c744b43c45558a7c6ae95acbc8aa05e))
* update DeviceAgentAccordionItem to enhance user guidance for macOS and Windows ([ec1876c](https://github.com/trycompai/comp/commit/ec1876c9157f465bcba741f0e797aaffe1f1f4db))
* update OpenAI model and enhance TipTap JSON schema for policy updates ([79c5f2a](https://github.com/trycompai/comp/commit/79c5f2a56985a9505bf0029862ed555f4d5d797a))
* update policy signature requirement and dependencies ([bfdbb15](https://github.com/trycompai/comp/commit/bfdbb15a70d8f41ae1352733eb5fe214ca27c7e9))
* update publishAllPoliciesAction to use parsedInput for organizationId ([67741b4](https://github.com/trycompai/comp/commit/67741b4bf9c5065e0d4c98efaa368eebf081fc6f))
* update S3 key handling for fleet agent downloads ([9a5ab4f](https://github.com/trycompai/comp/commit/9a5ab4f62f263de183e0cdde3d6d7bb7aed08072))
* update SingleControl component and enhance control status logic ([4287fec](https://github.com/trycompai/comp/commit/4287fecd47cbe4f2c232dc2cf9635ba6e13fc34e))
* Update tasks on top level ([3cb06d6](https://github.com/trycompai/comp/commit/3cb06d670fb288300b18214737f39c412966fd19))
* update Trust Portal to include HIPAA compliance framework ([bde32c4](https://github.com/trycompai/comp/commit/bde32c4ef4c39e0325b5bfa32d1d65ffacc3a1e2))
* use PULUMI_PROJECT_NAME as environment identifier ([29fed1e](https://github.com/trycompai/comp/commit/29fed1eca43895f2bf85144df1ec98be531de4cd))
* Vendor delete button ([e98926a](https://github.com/trycompai/comp/commit/e98926afd4dee2dd13e7f111b08e4bcd0288670a))

# [1.50.0](https://github.com/trycompai/comp/compare/v1.49.0...v1.50.0) (2025-07-11)


### Bug Fixes

* standardize plan type casing in PricingCard component ([6a2b48f](https://github.com/trycompai/comp/commit/6a2b48f275a03203394d3cc68e7f206876f8c0b8))
* update subscription handling in checkout hook ([3175ddd](https://github.com/trycompai/comp/commit/3175ddd52fb43f2dfec9f073da43ad86cdf212fe))


### Features

* enhance upgrade flow with subscription type handling ([5650623](https://github.com/trycompai/comp/commit/56506235a37d9b795207f001766e14a859d390db))
* integrate HubSpot API for user and company management ([0ab2560](https://github.com/trycompai/comp/commit/0ab2560c124e2b77c5b1bcc2d4969f7bce7079b8))

# [1.49.0](https://github.com/trycompai/comp/compare/v1.48.1...v1.49.0) (2025-07-03)

### Bug Fixes

- **onboarding:** update step index and progress calculation in PostPaymentOnboarding component ([a7b3a13](https://github.com/trycompai/comp/commit/a7b3a1378ab45c361769a7c1dfdb3a2edc9180fc))

### Features

- **e2e:** add tests for middleware onboarding behavior and split onboarding flow ([cb31f22](https://github.com/trycompai/comp/commit/cb31f2234ea84701b6f4a670d735ecc6a0bddc03))

## [1.48.1](https://github.com/trycompai/comp/compare/v1.48.0...v1.48.1) (2025-06-30)

### Bug Fixes

- fixed an issue with uploading files to comments in a policy ([8a3903c](https://github.com/trycompai/comp/commit/8a3903c291770e4da8aa5b55ff0b973330781430))

# [1.48.0](https://github.com/trycompai/comp/compare/v1.47.0...v1.48.0) (2025-06-27)

### Bug Fixes

- **middleware:** refine onboarding redirect logic to check for explicit false value ([93dfa37](https://github.com/trycompai/comp/commit/93dfa379be2cce444acdd8db85e2decd28da958b))
- **onboarding:** enhance textarea handling and improve localStorage integration ([64821a3](https://github.com/trycompai/comp/commit/64821a3b4484b613177c7887b0824277270192aa))

### Features

- **onboarding:** enhance post-payment onboarding flow with loading state and step tracking ([6b5f055](https://github.com/trycompai/comp/commit/6b5f055188d729240015e0c7e3e6a40404ec5c8a))
- **onboarding:** implement split onboarding flow and middleware checks ([7346380](https://github.com/trycompai/comp/commit/73463801f7eff32dcf34cf475ac675ea173aedbf))

# [1.47.0](https://github.com/trycompai/comp/compare/v1.46.0...v1.47.0) (2025-06-27)

### Features

- **slack-notifications:** add Slack integration for Stripe webhook events ([76511b7](https://github.com/trycompai/comp/commit/76511b720ebdabc1c0d5b0a40b09ec036e2c2560))
- **tracking:** implement unified tracking for onboarding and purchase events ([29bec28](https://github.com/trycompai/comp/commit/29bec2819f7ea7d5ffb24be5476207ab944ddfc6))

# [1.46.0](https://github.com/trycompai/comp/compare/v1.45.1...v1.46.0) (2025-06-26)

### Features

- add testimonial section and update pricing card layout ([63f3898](https://github.com/trycompai/comp/commit/63f38982bf0b3a2a6e3b3864652b334a1c539c84))
- add trial badge to pricing card component ([0e4d92b](https://github.com/trycompai/comp/commit/0e4d92bd7a8cf251b64968e89ffd35425f3725fd))
- update pricing card component with review link ([2164e5f](https://github.com/trycompai/comp/commit/2164e5f3e432327d41f77d9d80b7d7604969cdd3))

## [1.45.1](https://github.com/trycompai/comp/compare/v1.45.0...v1.45.1) (2025-06-26)

### Bug Fixes

- improve error handling and logging in deploy-test-results workflow ([62f7696](https://github.com/trycompai/comp/commit/62f7696b5108d780f4bfe3dbddc5956d9057f5f4))

# [1.45.0](https://github.com/trycompai/comp/compare/v1.44.0...v1.45.0) (2025-06-26)

### Bug Fixes

- correct team size placeholder ([f84e79f](https://github.com/trycompai/comp/commit/f84e79fc6bb66a5180a88861be13253d3b3b39c9))
- enhance billing page subscription checks and display ([9576af2](https://github.com/trycompai/comp/commit/9576af2099c4d24ac4d6e3250b443f9587dc2c1e))
- update E2E test command in GitHub Actions workflow ([46597c3](https://github.com/trycompai/comp/commit/46597c3873ab32faf6b0200db4759a89977fcf07))

### Features

- add STARTER subscription type to Organization model and migration ([3f9c373](https://github.com/trycompai/comp/commit/3f9c373c5a8dd9d858dc50aa1e5c585b57cbb4ab))
- update subscription handling and pricing structure ([b566650](https://github.com/trycompai/comp/commit/b566650656d19bdd9818e05c3159774371276024))

# [1.44.0](https://github.com/trycompai/comp/compare/v1.43.3...v1.44.0) (2025-06-25)

### Bug Fixes

- clarify subscription type comments in test-login route ([6d0ebf3](https://github.com/trycompai/comp/commit/6d0ebf3b0cf7a27fe8c230c8acbe7cd1bb00af90))
- enhance E2E test for simple authentication flow ([7a00333](https://github.com/trycompai/comp/commit/7a00333dff8098dbd2c2a6f7acab36182c527980))
- improve E2E test for simple authentication flow ([341df0a](https://github.com/trycompai/comp/commit/341df0a3d1ff61676ce2be9c4c743cc9ed8a98eb))

### Features

- add GitHub Actions workflow for deploying test results ([7d5fb40](https://github.com/trycompai/comp/commit/7d5fb40924dd1c7e00f9fe6d02a7e2dc34248a9e))
- add testing framework and middleware tests ([1d022c6](https://github.com/trycompai/comp/commit/1d022c640f92fe45214d92bf073c21d6e4a94259))
- disable Next button on setup form until current step has valid input ([cffae61](https://github.com/trycompai/comp/commit/cffae6140ed0c28ccd360b9199adc7a177bcd40a))
- enhance testing infrastructure and add Playwright support ([12509ff](https://github.com/trycompai/comp/commit/12509ff1a2e09911f3b138c4ec8c4ee47b7e27a4))
- implement E2E test for simple authentication flow ([a68f93f](https://github.com/trycompai/comp/commit/a68f93f1fcaed233b59d737f9331a23a6fe9fcb8))
- implement MockRedis client for E2E testing in CI ([ed3ed8f](https://github.com/trycompai/comp/commit/ed3ed8f0a729c53f105ff0c96bf6e295165439a1))
- integrate DotLottie animations into compliance components ([3f8bbed](https://github.com/trycompai/comp/commit/3f8bbedcef3a513b93d8ea8d45770cbfb0df548d))

## [1.43.3](https://github.com/trycompai/comp/compare/v1.43.2...v1.43.3) (2025-06-25)

### Bug Fixes

- fix issue with not being able to select assignee in policy and fix button text ([2dd6d93](https://github.com/trycompai/comp/commit/2dd6d930695523e65a36cee9bc273ef52c0d08ac))

## [1.43.2](https://github.com/trycompai/comp/compare/v1.43.1...v1.43.2) (2025-06-25)

### Bug Fixes

- fix bug with undefined theme ([901fa0c](https://github.com/trycompai/comp/commit/901fa0cff57dce3cb08924dd4efbe9b5e87831eb))
- fix dark mode rendering for dub referral embed ([f1088d1](https://github.com/trycompai/comp/commit/f1088d1907cca32ececd7e09bb2cbbe52e52945b))
- use email as fallback for name ([7ba3016](https://github.com/trycompai/comp/commit/7ba3016ab4605d5992849567540d62e17b9b50ea))
- use taildwind theme instead of hardcoding system ([97d257e](https://github.com/trycompai/comp/commit/97d257e54bb31b8549a0e34afe9715b395c64b36))

## [1.43.1](https://github.com/trycompai/comp/compare/v1.43.0...v1.43.1) (2025-06-24)

### Bug Fixes

- update formatting and structure in various files ([939bf07](https://github.com/trycompai/comp/commit/939bf07521131891e9acb731a1d5c15aff56fc78))

# [1.43.0](https://github.com/trycompai/comp/compare/v1.42.0...v1.43.0) (2025-06-24)

### Bug Fixes

- correct URL formatting for logo retrieval in getCachedSites function ([87bd99f](https://github.com/trycompai/comp/commit/87bd99fe0426233ff2b8356b05a44e80c4becd79))

### Features

- add logo existence check to API endpoint for cached websites ([60d8c95](https://github.com/trycompai/comp/commit/60d8c95318197f17996fca6cf2d1a470373f275f))

# [1.42.0](https://github.com/trycompai/comp/compare/v1.41.1...v1.42.0) (2025-06-24)

### Bug Fixes

- add back create fleet lable to create org function ([2f1ca1f](https://github.com/trycompai/comp/commit/2f1ca1f7a6685d56afd72e664cf89e9512eb5aa9))
- add error handling for null hosts ([c76c0bb](https://github.com/trycompai/comp/commit/c76c0bb3591395def2b05689216e080eb1ef5998))
- add mdm step to agent instructions ([24b0e83](https://github.com/trycompai/comp/commit/24b0e83b4b577b1025247be94c44c7aa9a20ca21))
- adjust scale of AnimatedGradientBackground in upgrade page for improved visual consistency ([6f8821e](https://github.com/trycompai/comp/commit/6f8821e7442147722a732bd545d3c290c61c3d35))
- **booking:** remove unnecessary margin from Phone icon in BookingDialog component ([b39c654](https://github.com/trycompai/comp/commit/b39c6543e283ca9d0b9974ad17c90551bc9f9500))
- cast stripeCustomerId to string before syncing data ([3887f71](https://github.com/trycompai/comp/commit/3887f71a0cb6c2e1b213b1cc88fb70b32656ebc3))
- **checkout:** refactor CheckoutCompleteDialog to improve plan type handling ([e91f1f0](https://github.com/trycompai/comp/commit/e91f1f045d8e02fdc6f02b7cf95441b4753e3867))
- fix issue with s3 url sanitization ([9ab26a0](https://github.com/trycompai/comp/commit/9ab26a0022f213fbd1e796c66ed511d4c3ed75b0))
- fix issue with sanitizing html ([1acccc6](https://github.com/trycompai/comp/commit/1acccc6ad771c5c067e7449a4efa1023e50e6d00))
- fix issues with roles while inviting users ([a1e7a7d](https://github.com/trycompai/comp/commit/a1e7a7dba83a0cf513391867549b4ebd2b4ae809))
- **layout:** adjust navbar height for improved layout consistency ([a61b794](https://github.com/trycompai/comp/commit/a61b794a961425ba1ca9cc557275d4e9357aa7a0))
- move agent logic to client side instead of server side ([3ac4874](https://github.com/trycompai/comp/commit/3ac48744657717f4b5a9f3b3b395090f1b00d9e9))
- **RecentAuditLogs:** adjust padding for no activity message display ([98c278a](https://github.com/trycompai/comp/commit/98c278acaf7355dacc8262576de66f71bafb57d4))
- roadmap link on readme ([66afcbd](https://github.com/trycompai/comp/commit/66afcbde132ddadfdf3e6710463c168912877e6a))
- start download of installer from the browser ([dde4546](https://github.com/trycompai/comp/commit/dde45460db81e02fe6f610fc93858d7ba6adea6e))
- try catch fetching the device so there's no error ([20b7f14](https://github.com/trycompai/comp/commit/20b7f14720f2039d9ce8981086b216fe0e16e2df))
- update Stripe customer ID retrieval to use organization ID instead of user ID ([ce4ef80](https://github.com/trycompai/comp/commit/ce4ef80a0503c55877f3d7374d690ef4a9317bec))
- update subscription data handling and remove unused checkout components ([3a50c55](https://github.com/trycompai/comp/commit/3a50c559b65bdbfed90294233ca711081dae7e58))
- validate S3 URL host ([d744f74](https://github.com/trycompai/comp/commit/d744f742d4679c7ea5c8e8649c9ec2d0354cb4b6))

### Features

- add animated pricing banner to upgrade page ([0599fcc](https://github.com/trycompai/comp/commit/0599fccc1668feb8407c435da01f6b2bbb0531d8))
- add API endpoint to fetch cached published websites from the database ([4792901](https://github.com/trycompai/comp/commit/479290160e1ed059afb696d1f3194d496cce472d))
- add dub referral tab and embed ([7a5e166](https://github.com/trycompai/comp/commit/7a5e166d31d96de227b2300a1c068ba35c0a174d))
- add rage mode and scroll rotation effects to AnimatedGradientBackground ([bd516f7](https://github.com/trycompai/comp/commit/bd516f7975ae5db7915dc75ea0ff26e13360c247))
- add SelectionIndicator component and enhance pricing card interactions ([04835c6](https://github.com/trycompai/comp/commit/04835c69ed99b1e9cf112ac886585a5afe0c2058))
- add support for windows agent ([f18e8a2](https://github.com/trycompai/comp/commit/f18e8a263bf213f23d12eaa324e03d407b7bf5d7))
- add tables support in policy editor ([9afd1ed](https://github.com/trycompai/comp/commit/9afd1edde0c803d0247ee43250e42f9d35e165c5))
- add tables support in policy editor ([9822d95](https://github.com/trycompai/comp/commit/9822d952b7164cecc3d0065dbdd6691ae26b4b58))
- **api:** add server directive to stripe session generation ([1c9f957](https://github.com/trycompai/comp/commit/1c9f957c9245ee2a3f06788d2d5fd1e22f5a4f28))
- **api:** enhance Stripe checkout session handling and logging ([3eff9b4](https://github.com/trycompai/comp/commit/3eff9b480a0ae150758adff131b177a0b43de940))
- **auth:** add session hook to set active organization ([6de3ded](https://github.com/trycompai/comp/commit/6de3ded2322efa912b2972003b5dbe5c14887e95))
- **auth:** implement organization access checks in layout components ([a1d3ad7](https://github.com/trycompai/comp/commit/a1d3ad7f787ff9165d948f9cc4e36ed99e012cc9))
- **auth:** refactor authentication page and components for improved user experience ([fb4fa7d](https://github.com/trycompai/comp/commit/fb4fa7d2e9c1b6dd96862eeb724a297a8a9d713c))
- **billing:** enhance subscription management and UI components ([1cf32c2](https://github.com/trycompai/comp/commit/1cf32c29f9105fa1eb51f3288f680629468f4bab))
- **checkout:** add CheckoutCompleteDialog component and integrate confetti animation ([4bd6018](https://github.com/trycompai/comp/commit/4bd6018e3e5b18ecd4fa2aac32775f5cf04c0a6a))
- **checkout:** enhance CheckoutCompleteDialog with updated features and descriptions ([2182c9e](https://github.com/trycompai/comp/commit/2182c9e1e44df54fbf951fb00d7db546aa0f7ebf))
- **database:** add nanoid function for generating URL-safe unique IDs ([c3608e1](https://github.com/trycompai/comp/commit/c3608e184c15ccf2222d6ab1557b26de589749fa))
- enhance AnimatedGradientBackground with pulse and glow effects ([7bd80c0](https://github.com/trycompai/comp/commit/7bd80c06406bed1d58ae8121c3c67a7340da9855))
- enhance onboarding step input with website field ([7062eb3](https://github.com/trycompai/comp/commit/7062eb3c35a7cf5b28afcc9784d60183fa7e9b08))
- enhance OnboardingStepInput and SelectPills components ([0079556](https://github.com/trycompai/comp/commit/0079556862b948c364e379381c3b61bee735e1b1))
- enhance Stripe checkout session handling by validating organization membership and managing customer records ([3901d8d](https://github.com/trycompai/comp/commit/3901d8d59b78c57d0ccedde74ad8ceebb2edd5dd))
- enhance upgrade page with logo marquee and review widget ([a8c6ff1](https://github.com/trycompai/comp/commit/a8c6ff1702bf86f63e18167bc1bf9efee69ad447))
- **env:** add new Fleet-related environment variables to configuration ([99eb8b1](https://github.com/trycompai/comp/commit/99eb8b1c6be16607872184320ec61cd7e7c1d565))
- **env:** add optional Stripe subscription price ID to environment variables ([27a2d3d](https://github.com/trycompai/comp/commit/27a2d3d6a75dfffd2c870887d16159ea35acca61))
- **env:** add Stripe subscription price ID to environment configuration ([f3da9b6](https://github.com/trycompai/comp/commit/f3da9b69a38207ecf314bdd44531b6714119f929))
- implement middleware for domain-based routing and organization handling ([7be7b9f](https://github.com/trycompai/comp/commit/7be7b9f395c89a7a680ded944373f5157bbb7cf0))
- implement self-serve subscription option and update pricing details ([69bd082](https://github.com/trycompai/comp/commit/69bd0820204b0c68a2adf0ddbec5c858f5954cb0))
- improve scroll handling in AnimatedGradientBackground ([cf98196](https://github.com/trycompai/comp/commit/cf98196b57a1c1c88bf2e1b8aeee187e26a7e9eb))
- integrate Senja Review Widget into pricing cards ([24ecd81](https://github.com/trycompai/comp/commit/24ecd8188bca7c3d509de12dcb29c7662dff63c1))
- **invite:** implement invitation handling and redirection ([4dccbbc](https://github.com/trycompai/comp/commit/4dccbbcef21eabde1183917d25ab9d40f442c92f))
- **layout:** wrap main content in Suspense for improved loading handling ([29c7cf2](https://github.com/trycompai/comp/commit/29c7cf27c5dc29c50541efeba40dc67a70993a89))
- **login:** add option to use another sign-in method after sending magic link ([957c25f](https://github.com/trycompai/comp/commit/957c25f5244bc1bb9d44ea3581b57496b06431cb))
- **metadata:** add generateMetadata function for Controls, Tasks, and Cloud Tests pages ([221106c](https://github.com/trycompai/comp/commit/221106c388dfad98bf16f79ed339f14fd6640c1f))
- **middleware:** allow unauthenticated access to invite routes ([04c64d8](https://github.com/trycompai/comp/commit/04c64d86e2d14e60d1e03f6ffbe413f3d88ebc9d))
- **middleware:** handle old invite route format for direct visits ([8a47db0](https://github.com/trycompai/comp/commit/8a47db04fcdd628cffc856167df1fdff40ac62dd))
- **middleware:** implement authentication middleware for route protection ([514e007](https://github.com/trycompai/comp/commit/514e00700d674fdc0b0be2300c7c156cd824392e))
- **middleware:** implement organization session handling in middleware ([5bd53b9](https://github.com/trycompai/comp/commit/5bd53b9d4732ef4171b9baf244655df7fccb8c4e))
- **policy:** implement content sanitization to remove unsupported marks ([61bdce4](https://github.com/trycompai/comp/commit/61bdce476a69e9fdbc78d3ed33a5ffc0554a2907))
- **pricing:** add '12-month minimum term' to paid features list in PricingCards component ([1a45ac4](https://github.com/trycompai/comp/commit/1a45ac46c2c48bed96a3571a41cb68f738c0c728))
- **pricing:** add BookingDialog component to PricingCards for scheduling calls ([63a68b3](https://github.com/trycompai/comp/commit/63a68b35ef4fac2d4db71be7260633f7f521efef))
- redo portal tasks to be cleaner ([806f07f](https://github.com/trycompai/comp/commit/806f07fe1c5a01b4aa33addc07e03e3ed5a04ad4))
- refactor subscription handling and introduce self-serve plan ([9b6adfc](https://github.com/trycompai/comp/commit/9b6adfc0cc525d4b642df3dbc6808d8463ce33f9))
- **setup:** add SetupHeader component to enhance user experience ([3cadc5b](https://github.com/trycompai/comp/commit/3cadc5ba5fa02648cd5122e4e3a64fd341b29ff2))
- **setup:** enhance framework selection loading state management ([6106974](https://github.com/trycompai/comp/commit/6106974c259150055bcee7f855cd84f56dae3b42))
- **setup:** enhance onboarding process and organization setup ([b1fdabf](https://github.com/trycompai/comp/commit/b1fdabfe02fda140455b275d3e3afca9b538754f))
- **setup:** enhance organization setup and upgrade flow ([e1d57d4](https://github.com/trycompai/comp/commit/e1d57d42dfa7e66e439328f5c26bacd26d1968bb))
- **setup:** implement organization creation and onboarding enhancements ([229744b](https://github.com/trycompai/comp/commit/229744bbaa9c1757102ea48882c5cba51e7aa7c2))
- **setup:** implement organization setup flow and subscription checks ([b94e7f3](https://github.com/trycompai/comp/commit/b94e7f348035aacdc6a1df613fb31d018ab474f6))
- **stripe:** add new Stripe integration features ([3749e78](https://github.com/trycompai/comp/commit/3749e7872c6b455d617b7a3c9c80760fce953823))
- **stripe:** define subscription data type for Stripe synchronization ([5da6c67](https://github.com/trycompai/comp/commit/5da6c670492de5145957fb08d2f932096c6701df))
- **stripe:** implement subscription data retrieval and cache management ([47815bc](https://github.com/trycompai/comp/commit/47815bc598eeed24bf68e7cf8b16227b5c76a080))
- **tests:** add layout, loading, and page components for cloud compliance tests ([9c14c28](https://github.com/trycompai/comp/commit/9c14c28ffa1eef9b27fa99f9c381112f1f08600c))
- update environment variables for Stripe pricing plans ([c61922f](https://github.com/trycompai/comp/commit/c61922fd1d5393116a7ffef4507809accde07e7f))
- update OrganizationSetupForm and routing logic ([f0c14b9](https://github.com/trycompai/comp/commit/f0c14b9e11a1d55dc949f4ec2932f0de0cce2ff0))
- update pricing cards with new features and subscription handling ([3753cc5](https://github.com/trycompai/comp/commit/3753cc5510938558b7177cb05c729f2a1195fd45))

## [1.41.1](https://github.com/trycompai/comp/compare/v1.41.0...v1.41.1) (2025-06-12)

### Bug Fixes

- **layout:** center content in RootLayout by adding mx-auto class to the container div ([eece9f6](https://github.com/trycompai/comp/commit/eece9f61d26b34a6e8c51ac88a70e78786847433))

# [1.41.0](https://github.com/trycompai/comp/compare/v1.40.0...v1.41.0) (2025-06-11)

### Features

- **api:** add organization initialization after reset ([89b2d2e](https://github.com/trycompai/comp/commit/89b2d2e97bc9b3f8394e940f5d1ef09552048b90))

# [1.40.0](https://github.com/trycompai/comp/compare/v1.39.0...v1.40.0) (2025-06-11)

### Bug Fixes

- **SidebarCollapseButton:** handle optimistic update rollback on error ([bf6298d](https://github.com/trycompai/comp/commit/bf6298d581c1926f12458ddc815307b874d1712a))

### Features

- add Fleet integration for endpoint monitoring and management ([748af0e](https://github.com/trycompai/comp/commit/748af0e191f4ad934fd86f3c373c7f48e5854a64))
- add support for fleet in db ([44f6ee2](https://github.com/trycompai/comp/commit/44f6ee2ad8e82337ed5b9a8734a2d720d7cef2fe))
- **components:** introduce CardLiquidGlass component and update PageCore layout ([4345ff1](https://github.com/trycompai/comp/commit/4345ff16c6151e575ea7ddfa03447d1a0ed4896d))
- **design-system:** add new design system rules ([966d8d8](https://github.com/trycompai/comp/commit/966d8d8cd1515219d97ff62d673ba7954182c3d6))
- employee devices showing in app and portal ([5a71b5b](https://github.com/trycompai/comp/commit/5a71b5bed2f2f19a2f8dbbc05fbecb52a1fa24bc))
- **header:** add inbox icon to feedback link ([ed32c23](https://github.com/trycompai/comp/commit/ed32c23a80d5a388f58ce5003706ebab5c0bcd57))
- list out employee devices and overview chart ([7c2f8bb](https://github.com/trycompai/comp/commit/7c2f8bb7f1a616d3aa0af32df9ac8ee1b647700e))
- **policies:** introduce new layout component for policies overview ([87d25a0](https://github.com/trycompai/comp/commit/87d25a05376c628555d75bd52002d44ddc1d921d))
- **ui:** add search icon to input components ([44ea88c](https://github.com/trycompai/comp/commit/44ea88c41c1c06216788680f68fd6a30dd4ab7cf))

# [1.39.0](https://github.com/trycompai/comp/compare/v1.38.0...v1.39.0) (2025-06-09)

### Features

- **api:** reset onboarding status during org reset ([5b7e531](https://github.com/trycompai/comp/commit/5b7e531e6115eb4c9ef02e70e9e2044c28ad7a41))

# [1.38.0](https://github.com/trycompai/comp/compare/v1.37.0...v1.38.0) (2025-06-09)

### Features

- **api:** add reset organization endpoint ([9a118d1](https://github.com/trycompai/comp/commit/9a118d1d1985c6e4b1055af97412f597eb365dfe))

# [1.37.0](https://github.com/trycompai/comp/compare/v1.36.3...v1.37.0) (2025-06-09)

### Features

- **status:** add 'not_relevant' status and update related components ([e1b6597](https://github.com/trycompai/comp/commit/e1b6597d9f2e3566ccd61bbe0391397f7960b2e5))
- **TaskStatusIndicator:** add 'not_relevant' status indicator ([ca2d9e0](https://github.com/trycompai/comp/commit/ca2d9e0cb2c2d80ab2b089ae5e7ce6fae3d9c187))

## [1.36.3](https://github.com/trycompai/comp/compare/v1.36.2...v1.36.3) (2025-06-08)

### Bug Fixes

- fix length of onboarding popover options ([8441015](https://github.com/trycompai/comp/commit/8441015439f2a1c8a442661927ff41321b2b8e77))
- fix updating title and description of a policy ([44c2fe8](https://github.com/trycompai/comp/commit/44c2fe8075f602617868ef749335efbdcf37e12f))
- make whole row clickable for select-pills ([7bb85f4](https://github.com/trycompai/comp/commit/7bb85f4d213184697bfbf0f5f592fd450ff0ab04))
- **tasks:** ensure grid row selection stable ([b10e8b8](https://github.com/trycompai/comp/commit/b10e8b8ad773bfd183f7b005fe3473618d16e147))

## [1.36.2](https://github.com/trycompai/comp/compare/v1.36.1...v1.36.2) (2025-06-07)

### Bug Fixes

- fix layout issue with risk matrix chart layout ([55e2985](https://github.com/trycompai/comp/commit/55e298503fd1eb3e2d07c792b7292052985a4c8e))

## [1.36.1](https://github.com/trycompai/comp/compare/v1.36.0...v1.36.1) (2025-06-07)

### Bug Fixes

- fix both edit role and cancel invitation issues with dialog ([37f783b](https://github.com/trycompai/comp/commit/37f783baa04ee4395d19ebaee026988e5833bc24))

# [1.36.0](https://github.com/trycompai/comp/compare/v1.35.1...v1.36.0) (2025-06-06)

### Features

- add materialized view for organization statistics ([f44f375](https://github.com/trycompai/comp/commit/f44f375b38853137ed1bdbe0bd07a5e9f3873d10))
- add scheduled task to refresh OrganizationStats materialized view ([b04baf4](https://github.com/trycompai/comp/commit/b04baf497bc79ea1520f6ada8a11a1f8132d81fe))

## [1.35.1](https://github.com/trycompai/comp/compare/v1.35.0...v1.35.1) (2025-06-06)

### Bug Fixes

- fix issue with redirect to onboarding ([f9d3e4d](https://github.com/trycompai/comp/commit/f9d3e4de5576812b45c1da5df8f03b12f086ad6f))

# [1.35.0](https://github.com/trycompai/comp/compare/v1.34.0...v1.35.0) (2025-06-06)

### Features

- add readonly role with SELECT permissions for all non-system schemas ([b7ba0f9](https://github.com/trycompai/comp/commit/b7ba0f940d7edaaf9e12d66f11f160b29fd067f6))

# [1.34.0](https://github.com/trycompai/comp/compare/v1.33.1...v1.34.0) (2025-06-05)

### Bug Fixes

- update organization ID reference in OrganizationSwitcher component ([a930de6](https://github.com/trycompai/comp/commit/a930de64f48e12e03ed361f51597b16b3a979fe3))

### Features

- add cascading delete constraints for organization relationships ([1b7fbb6](https://github.com/trycompai/comp/commit/1b7fbb6694e0104eebaa35226be0cdcd5ed3213a))
- add script to remove localization from the codebase ([54e36c4](https://github.com/trycompai/comp/commit/54e36c43d2ae3e6c1808a644ad62bf29c953aaab))
- implement localization removal script and TypeScript configuration ([90d944b](https://github.com/trycompai/comp/commit/90d944bfb85d8a7d8b53ab8789c6eeff290e6431))

## [1.33.1](https://github.com/trycompai/comp/compare/v1.33.0...v1.33.1) (2025-06-05)

### Bug Fixes

- enable organization search ([88a8b71](https://github.com/trycompai/comp/commit/88a8b71dd2d84bf49175f6ecbcc3454d7271f2e4))

# [1.33.0](https://github.com/trycompai/comp/compare/v1.32.3...v1.33.0) (2025-06-05)

### Bug Fixes

- enable nodeMiddleware in Next.js configuration for app and trust ([f4ab998](https://github.com/trycompai/comp/commit/f4ab9982c570bc17bf0361d6d52753e8c15bc01e))
- enhance hydration handling in OnboardingForm component ([94aabef](https://github.com/trycompai/comp/commit/94aabef6e939689f62613ac7f1eae8c07bdface5))
- **middleware:** remove unnecessary URL encoding for redirect in authentication check ([33edd96](https://github.com/trycompai/comp/commit/33edd965774b7574d831477a13e3b15dbf8dffc6))
- **migration:** correct foreign key constraint addition in Context table ([552dc2c](https://github.com/trycompai/comp/commit/552dc2cd6c13fc461b1b8b64e96b79dcc4e48c33))
- **onboarding:** add conditional check for policies before batch processing ([a7d53ad](https://github.com/trycompai/comp/commit/a7d53ade77260989a4241aa2e9ea166162216bfd))
- **onboarding:** simplify onboarding path checks in middleware ([864de65](https://github.com/trycompai/comp/commit/864de65a2c1951caae1acbd06ce047392ab02985))
- **onboarding:** update onboarding completion logic ([1a9c875](https://github.com/trycompai/comp/commit/1a9c87580ae591e7df37ee2cbcd386fcad9d7588))
- remove minWidth style from OnboardingForm component ([a784166](https://github.com/trycompai/comp/commit/a784166016354f33e9cdcf0f7047806c88ac8acf))
- update placeholder text in OnboardingForm for clarity ([760f7b5](https://github.com/trycompai/comp/commit/760f7b53b07d6434b645870e09946657d8ee936c))
- **vendor:** map vendor categories to user-friendly labels in VendorColumns component ([8b6600a](https://github.com/trycompai/comp/commit/8b6600a60177f95639787c413fdba62c4a345f60))

### Features

- add company description field to onboarding form ([92a0535](https://github.com/trycompai/comp/commit/92a05356358b095811fbc709230c7af49c4144d2))
- add conditional migration for onboarding data transfer ([06e6ef5](https://github.com/trycompai/comp/commit/06e6ef593423b4f0e691a6c7266fecdfb0fa990f))
- add context hub settings and onboarding components ([cf97f8d](https://github.com/trycompai/comp/commit/cf97f8d0d1bdd7e398397831fbac2cc9e1dcd7fa))
- add isCollapsed prop to SidebarLogo component ([90d1ceb](https://github.com/trycompai/comp/commit/90d1ceb07cff15b17ef45df869e2b5109eb65fcd))
- add migration to transfer onboarding data to context table ([7a441ad](https://github.com/trycompai/comp/commit/7a441adb4c3342366b24537bfaaa00c2899dbf02))
- add software selection to onboarding form ([9298666](https://github.com/trycompai/comp/commit/9298666b97225fcfb0f98d98df0d15f9d5bcf28f))
- check for existing vendor before research task execution ([81c174e](https://github.com/trycompai/comp/commit/81c174e847b69043d91781412dc38471d82fd207))
- enhance context entry forms with placeholders and descriptions ([6bc4ac1](https://github.com/trycompai/comp/commit/6bc4ac1ee162f1e9a0505ce94a7d44bd4a406d22))
- enhance framework templates and relationships ([05f671b](https://github.com/trycompai/comp/commit/05f671bbf3abb68056320114d7829bb7d8aeec6a))
- enhance onboarding form with additional software options ([e9727d9](https://github.com/trycompai/comp/commit/e9727d992331c8150075e33592f637904dd150ae))
- enhance settings layout and API key management ([570837b](https://github.com/trycompai/comp/commit/570837b5044c16ba42075d6c3065aa9d929a2fe6))
- implement policy update functionality with AI-generated prompts ([c70db73](https://github.com/trycompai/comp/commit/c70db73e3003d3615ebef5b09865dca3fc69a9fe))
- move onboarding loading to layout ([bd8f0e3](https://github.com/trycompai/comp/commit/bd8f0e3f0a9115fb80d6e71714c479bcba798f5d))
- **new:** trigger.dev job to onboard new users, added trigger.dev loading screen for onboarding ([1684fa6](https://github.com/trycompai/comp/commit/1684fa6a249ed53983a4dce8529c083ecc5f479c))
- **tasks:** enhance task management with control linking functionality ([44678bf](https://github.com/trycompai/comp/commit/44678bf2ac004bb2bd1394df4420e1674ecaccdc))
- **tasks:** implement task management actions and UI enhancements ([be12434](https://github.com/trycompai/comp/commit/be124345da0595440ae57fc7258807d62dfe9911))
- update dependencies and enhance task management features ([61b48e9](https://github.com/trycompai/comp/commit/61b48e95482310085f3251704ff54ee5b8727d84))
- update onboarding process to set default completion status ([a231c23](https://github.com/trycompai/comp/commit/a231c23f92ee1003b1171d1889a799fe3fe6a2ae))

## [1.32.3](https://github.com/trycompai/comp/compare/v1.32.2...v1.32.3) (2025-05-30)

### Bug Fixes

- fix issue with scrollbar showing up when not needed ([8a2a3e7](https://github.com/trycompai/comp/commit/8a2a3e7e621ae36ce3e5e90729ef9540794d68b4))

## [1.32.2](https://github.com/trycompai/comp/compare/v1.32.1...v1.32.2) (2025-05-30)

### Bug Fixes

- issue with selecting role for inviting members on firefox ([2bd3895](https://github.com/trycompai/comp/commit/2bd3895f945ccf66672fa63c8494b80fe81b9ee9))

## [1.32.1](https://github.com/trycompai/comp/compare/v1.32.0...v1.32.1) (2025-05-30)

### Bug Fixes

- **invite:** allow role selection in modal ([2898ffd](https://github.com/trycompai/comp/commit/2898ffde8e8d0f00bf481f20028c3a3c1279f30a))

# [1.32.0](https://github.com/trycompai/comp/compare/v1.31.0...v1.32.0) (2025-05-26)

### Features

- implement client-side filtering in controls and frameworks tables for enhanced search functionality ([010dfe0](https://github.com/trycompai/comp/commit/010dfe022fb7693c3d87ea5cd7c8682b1f7b7ab3))

# [1.31.0](https://github.com/trycompai/comp/compare/v1.30.3...v1.31.0) (2025-05-26)

### Features

- add ability to delete tasks ([948c78d](https://github.com/trycompai/comp/commit/948c78d9e67bdb66803bbcf621ef25543ebd09e9))

## [1.30.3](https://github.com/trycompai/comp/compare/v1.30.2...v1.30.3) (2025-05-25)

### Bug Fixes

- **policy:** align creation schema ([256f111](https://github.com/trycompai/comp/commit/256f1117e003ccb45b7bb7575685b0fce0b7c8f4))

## [1.30.2](https://github.com/trycompai/comp/compare/v1.30.1...v1.30.2) (2025-05-23)

### Bug Fixes

- add ability to delete controls ([ca6c95c](https://github.com/trycompai/comp/commit/ca6c95ce9debdbd9a26651393360f1235dd3ce55))
- added ability to delete a policy ([aaf6f53](https://github.com/trycompai/comp/commit/aaf6f53dd5156fd5223561fcf7c582612a139921))
- allow deleting entire framework ([bc32f8d](https://github.com/trycompai/comp/commit/bc32f8d84dc7d59d03e7a4f9792d8daaaf2874e1))

## [1.30.1](https://github.com/trycompai/comp/compare/v1.30.0...v1.30.1) (2025-05-22)

### Bug Fixes

- **policy:** improve pending changes alert dark mode ([7f9ac23](https://github.com/trycompai/comp/commit/7f9ac238b315c24fc72db19dc75007185a9581f3))

# [1.30.0](https://github.com/trycompai/comp/compare/v1.29.0...v1.30.0) (2025-05-22)

### Features

- add approval / denial of policy changes with audit logs and comments ([c512e1f](https://github.com/trycompai/comp/commit/c512e1f82b0e261702158672d6907f47ccaed341))

# [1.29.0](https://github.com/trycompai/comp/compare/v1.28.0...v1.29.0) (2025-05-22)

### Features

- add framework editor schemas and seeding functionality ([c2343fd](https://github.com/trycompai/comp/commit/c2343fda9e63a1c015c500355635428dbbb8cadc))

# [1.28.0](https://github.com/trycompai/comp/compare/v1.27.0...v1.28.0) (2025-05-19)

### Features

- implement framework addition functionality in the dashboard ([073a2d4](https://github.com/trycompai/comp/commit/073a2d4146d8cc398b8a99d625809af346beeaf4))

# [1.27.0](https://github.com/trycompai/comp/compare/v1.26.0...v1.27.0) (2025-05-19)

### Bug Fixes

- add comment to seed script for clarity ([03d3bc0](https://github.com/trycompai/comp/commit/03d3bc02258f0d6adc06e8b97dabbcbb85eb3852))
- ensure foreign key constraints are correctly defined for framework and requirement mappings ([e3c3cc2](https://github.com/trycompai/comp/commit/e3c3cc2ba59801abd97cb41bbfb9fe5f0aef7051))

### Features

- add 'visible' property to frameworks across components ([912e87d](https://github.com/trycompai/comp/commit/912e87d0727cf37d8e3af3b41631e91cc9002901))
- add getRequirementDetails utility function for requirement retrieval ([69fac45](https://github.com/trycompai/comp/commit/69fac45bc13f184b3b0fc8707163eaef4518c484))
- add migrations to update framework and requirement relationships ([9b97975](https://github.com/trycompai/comp/commit/9b9797507aef6998aa0e42686b321e374e4d1c3e))
- add template references to database models and update organization initialization ([09a90cd](https://github.com/trycompai/comp/commit/09a90cde3977b1070d5d02bd0c7b6a99fdd680a8))
- add visibility toggle to FrameworkEditorFramework model ([1a0176f](https://github.com/trycompai/comp/commit/1a0176fb5676312132f9bd13eec4e022e3128fdc))
- drop Artifact and \_ArtifactToControl tables, migrate relationships to new \_ControlToPolicy table ([419fc3f](https://github.com/trycompai/comp/commit/419fc3f63fdd28d320d5b7872f3f9855951bfe1a))
- enhance ControlsClientPage with framework filtering and control creation ([9949666](https://github.com/trycompai/comp/commit/99496667b5433228731821b21220a204b5b2b4f7))
- enhance CreateOrgModal layout and add database seeding functionality ([0a79414](https://github.com/trycompai/comp/commit/0a794142123c3282542051973a33af4959b42252))
- enhance FrameworkEditorFramework with visibility feature ([e8b7a8a](https://github.com/trycompai/comp/commit/e8b7a8a680ad57835e250dcb030e67ce841e88c9))
- enhance getControl function to include nested framework details ([8c8561c](https://github.com/trycompai/comp/commit/8c8561c62eca8df052704231e8410a698b315a61))
- **framework:** refactor framework handling and enhance organization creation ([5f53dc2](https://github.com/trycompai/comp/commit/5f53dc2327ef78626462ba02ae84963d25b3b433))
- refactor framework requirements handling and integrate database fetching ([89b1c2c](https://github.com/trycompai/comp/commit/89b1c2c06d053216e3c053fe67c9a9572feb89cf))
- **schema:** add TODOs for framework and requirement relations ([3982373](https://github.com/trycompai/comp/commit/398237366e23541530b140be5ba189b9531177b9))
- **schema:** update organization schema and control types for improved validation and type safety ([f19fe92](https://github.com/trycompai/comp/commit/f19fe92c3c368a317283b84ce0b39751880227af))
- update RequirementsTable to utilize nested requirement structure ([b0f2525](https://github.com/trycompai/comp/commit/b0f252566cdc1ea099d7b52f5bedce683f545c5f))
- update SingleControl component to support nested framework structure ([e544f4e](https://github.com/trycompai/comp/commit/e544f4e110a2706c4c497b501beeebd179939e13))

# [1.26.0](https://github.com/trycompai/comp/compare/v1.25.0...v1.26.0) (2025-05-19)

### Bug Fixes

- **analytics:** keep client active ([42ec348](https://github.com/trycompai/comp/commit/42ec348ad52d76c521d9f91607958d311b2f5bf7))
- **layout:** make sidebar scrollable ([82eb566](https://github.com/trycompai/comp/commit/82eb56613c6c7ba28011d816018b997d4080a619))
- use custom IDs wording ([54dcc86](https://github.com/trycompai/comp/commit/54dcc86ac2e49a6fe104b39cec73893dbb86c21c))

### Features

- integrate Calcom components and enhance onboarding checklist ([42fe663](https://github.com/trycompai/comp/commit/42fe66323a114dff3bbcf1c8bd026a83d1cd66f9))

# [1.25.0](https://github.com/trycompai/comp/compare/v1.24.0...v1.25.0) (2025-05-17)

### Features

- **migrations:** add foreign key constraints and update frameworkId for SOC2 requirements ([f42ac96](https://github.com/trycompai/comp/commit/f42ac96d12a8e364804e94f7fa2542411acdd17a))

# [1.24.0](https://github.com/trycompai/comp/compare/v1.23.0...v1.24.0) (2025-05-16)

### Features

- add auth wall on frameworks tool ([1e0667d](https://github.com/trycompai/comp/commit/1e0667d09f645465f445c18db33bf36619074380))

# [1.23.0](https://github.com/trycompai/comp/compare/v1.22.0...v1.23.0) (2025-05-16)

### Features

- **frameworks:** include controls in task retrieval across various components ([bfbad29](https://github.com/trycompai/comp/commit/bfbad293ade92a8e165c390759f7ab0eab4dfae0))

# [1.22.0](https://github.com/trycompai/comp/compare/v1.21.0...v1.22.0) (2025-05-16)

### Bug Fixes

- **control-progress:** streamline task retrieval in getOrganizationControlProgress function ([c71aa91](https://github.com/trycompai/comp/commit/c71aa915796ca4249e52942fe723cd7f754aa14c))

### Features

- **migration:** add many-to-many support for tasks ([cebda99](https://github.com/trycompai/comp/commit/cebda99b6f95c000a951acfc392e5b4741b9b1d3))
- **organization-tasks:** implement task creation with error handling ([ba19e6d](https://github.com/trycompai/comp/commit/ba19e6dae8de772fcbacd654e2a65f89bd340587))
- **task:** make entityId and entityType optional in Task model ([ad5ecce](https://github.com/trycompai/comp/commit/ad5ecce08941563805fe55a3620e7a34a9cc794c))

# [1.21.0](https://github.com/trycompai/comp/compare/v1.20.0...v1.21.0) (2025-05-15)

### Features

- added ability to link and unlink policies to controls from the UI ([1d9ace1](https://github.com/trycompai/comp/commit/1d9ace198edd9b4786d69378ac4af56b02782e22))

# [1.20.0](https://github.com/trycompai/comp/compare/v1.19.0...v1.20.0) (2025-05-15)

### Features

- **trust-portal:** implement friendly URL functionality ([7e43c73](https://github.com/trycompai/comp/commit/7e43c73e000a3a4dd43885c8999bb95f49a75991))

# [1.19.0](https://github.com/trycompai/comp/compare/v1.18.0...v1.19.0) (2025-05-14)

### Features

- added attachments to vendors and risks, also updated the comments component to a better one ([584f01c](https://github.com/trycompai/comp/commit/584f01c09ce9da5a26fa84d400d509fecc995afa))

# [1.18.0](https://github.com/trycompai/comp/compare/v1.17.0...v1.18.0) (2025-05-14)

### Features

- **editor:** add custom action cell to ControlsClientPage for navigation ([d8337ff](https://github.com/trycompai/comp/commit/d8337ff7371308e9a4473370a920fe4c8921533b))
- **editor:** enhance ControlsClientPage with createdAt and updatedAt fields ([5f2b4d6](https://github.com/trycompai/comp/commit/5f2b4d69eaa37182e5733ca452320845d8ee8ed7))
- **editor:** enhance ControlsClientPage with friendly date formatting and UI improvements ([960fd3c](https://github.com/trycompai/comp/commit/960fd3cd5fedde952c18e855281acd2ed155ea44))
- **editor:** enhance ControlsClientPage with improved change tracking and UI feedback ([f680dff](https://github.com/trycompai/comp/commit/f680dff7894961c6d02df0071088d4ad02fe2d43))
- **editor:** enhance ControlsClientPage with improved search and sorting UI ([47db2bd](https://github.com/trycompai/comp/commit/47db2bdf9a02dd78c87b788b241f8e73fd99ea61))
- **editor:** enhance ControlsClientPage with new control creation and linking features ([8e23222](https://github.com/trycompai/comp/commit/8e23222c195364499e85dd9e5d9b6489bb47fd26))
- **editor:** enhance ControlsClientPage with relational linking and UI improvements ([275b09e](https://github.com/trycompai/comp/commit/275b09e33d269a22f33e35061e12eaf0b0ace781))
- **editor:** enhance ControlsClientPage with search and sorting functionality ([05efcb0](https://github.com/trycompai/comp/commit/05efcb0a3043b877cee04677261b6b1de105107b))
- **editor:** implement change tracking and row styling in ControlsClientPage ([3908e32](https://github.com/trycompai/comp/commit/3908e32075b6eda57bafe5406880dc603b7a5fc1))
- **editor:** integrate react-datasheet-grid for enhanced controls management ([084e861](https://github.com/trycompai/comp/commit/084e861b0b0efc06c2e34fec3ffc66ccd4eee337))

# [1.17.0](https://github.com/trycompai/comp/compare/v1.16.0...v1.17.0) (2025-05-14)

### Features

- **trust-portal:** add Vercel domain verification and enhance trust portal settings ([0f41e99](https://github.com/trycompai/comp/commit/0f41e997bcbee0ae5d9379a3d2b7f75b061766a4))

# [1.16.0](https://github.com/trycompai/comp/compare/v1.15.0...v1.16.0) (2025-05-14)

### Bug Fixes

- add empty states & guides ([ba7d11d](https://github.com/trycompai/comp/commit/ba7d11d938821e7d0f9d385b9a0bdeaa8578bec5))
- fix issues with deleting integrations ([df22563](https://github.com/trycompai/comp/commit/df22563ea69e27b75af032ec1bf438dcd279d3ba))
- ui improvements for cloud tests ([1db40d3](https://github.com/trycompai/comp/commit/1db40d30ccd4706d6ae200e3d529a0840f777284))

### Features

- implement ui for cloud tests ([5a92613](https://github.com/trycompai/comp/commit/5a926132a0620fb558fe8400a72b4a874de21213))

# [1.15.0](https://github.com/trycompai/comp/compare/v1.14.2...v1.15.0) (2025-05-14)

### Features

- **trust-portal:** enhance trust portal settings and compliance frameworks ([5ba7ba4](https://github.com/trycompai/comp/commit/5ba7ba4cd550b3c84f2b6dfca5258071a2c3016d))

## [1.14.2](https://github.com/trycompai/comp/compare/v1.14.1...v1.14.2) (2025-05-13)

### Bug Fixes

- fix the vendors table search and pagination ([6808ae1](https://github.com/trycompai/comp/commit/6808ae1ef2689ac6434703e83ca80fe82fa4706b))

## [1.14.1](https://github.com/trycompai/comp/compare/v1.14.0...v1.14.1) (2025-05-13)

### Bug Fixes

- fixed sorting and filtering on risks table ([985b4b7](https://github.com/trycompai/comp/commit/985b4b7d85a2f4090299be66bc8a4ee676f64594))

# [1.14.0](https://github.com/trycompai/comp/compare/v1.13.2...v1.14.0) (2025-05-12)

### Bug Fixes

- **editor:** adjust padding in AdvancedEditor component for improved layout ([bb27fba](https://github.com/trycompai/comp/commit/bb27fba9505b0ac0819fb57e1053f169c63909f9))

### Features

- **policies:** enhance policy management with update and delete functionalities ([954ec4d](https://github.com/trycompai/comp/commit/954ec4d03789225a6d8c115704551895d331c1dc))
- **policies:** implement policy management features with CRUD functionality ([7b2d2d1](https://github.com/trycompai/comp/commit/7b2d2d1957788794b35ed565b247e9a3d81992da))

## [1.13.2](https://github.com/trycompai/comp/compare/v1.13.1...v1.13.2) (2025-05-12)

### Bug Fixes

- fix sign in with magic link sign in when invited to an org ([c634d61](https://github.com/trycompai/comp/commit/c634d615e7b7d53376bd764dbd75cd28e1b85ed3))

## [1.13.1](https://github.com/trycompai/comp/compare/v1.13.0...v1.13.1) (2025-05-12)

### Bug Fixes

- fix popover by adding pointer events in content ([6e7bce5](https://github.com/trycompai/comp/commit/6e7bce5392951cf1cb48ac665bafc486b577d70e))

# [1.13.0](https://github.com/trycompai/comp/compare/v1.12.0...v1.13.0) (2025-05-12)

### Features

- **tasks:** implement task management UI with CRUD functionality ([f71cee1](https://github.com/trycompai/comp/commit/f71cee17d76536a373c12262ed926517075c2919))

# [1.12.0](https://github.com/trycompai/comp/compare/v1.11.0...v1.12.0) (2025-05-12)

### Features

- **database:** add identifier column to FrameworkEditorRequirement and update migration ([c4dee39](https://github.com/trycompai/comp/commit/c4dee398a08a7c4a9d40582b71d9368d14e1a4f7))
- **requirements:** add optional identifier field to requirement forms and schemas ([1540457](https://github.com/trycompai/comp/commit/1540457d620c1e202afcc51018aae0c017713e3b))

# [1.11.0](https://github.com/trycompai/comp/compare/v1.10.0...v1.11.0) (2025-05-11)

### Bug Fixes

- **trust:** update DNS record slug to use TRUST_PORTAL_PROJECT_ID ([366f9e5](https://github.com/trycompai/comp/commit/366f9e51d7709964ea606b7dca305a7a0e91337b))

### Features

- **trust:** add TRUST_PORTAL_PROJECT_ID to environment and update DNS record actions ([a99c7bb](https://github.com/trycompai/comp/commit/a99c7bbb2fc360d16e9426f084c098a779d5d224))

# [1.10.0](https://github.com/trycompai/comp/compare/v1.9.0...v1.10.0) (2025-05-11)

### Features

- **trust:** enhance DNS verification and state management in TrustPortalDomain ([27369ea](https://github.com/trycompai/comp/commit/27369ea8f0d36c378e7ae89a14433a90dc723b93))

# [1.9.0](https://github.com/trycompai/comp/compare/v1.8.3...v1.9.0) (2025-05-11)

### Features

- **trust:** implement custom domain management and DNS verification for trust portal ([d34206c](https://github.com/trycompai/comp/commit/d34206cc8e0ca633d071d34e0fc95ad1994a2cf0))

## [1.8.3](https://github.com/trycompai/comp/compare/v1.8.2...v1.8.3) (2025-05-10)

### Bug Fixes

- **trust:** update organization ID mapping for security domain in middleware ([2e690b1](https://github.com/trycompai/comp/commit/2e690b1e56da4e82e615b305927a0df9dd8d4e2c))

## [1.8.2](https://github.com/trycompai/comp/compare/v1.8.1...v1.8.2) (2025-05-10)

### Bug Fixes

- **trust:** update domain mapping in middleware to include new ngrok domain ([cb8f296](https://github.com/trycompai/comp/commit/cb8f2960eba1f9800e297734c3f6e33a17d76314))

## [1.8.1](https://github.com/trycompai/comp/compare/v1.8.0...v1.8.1) (2025-05-10)

### Bug Fixes

- **trust:** add new domain mapping to organization ID and refine URL rewriting logic in middleware ([f8b2854](https://github.com/trycompai/comp/commit/f8b28545adcce6bc18fdf3b590d2d31b8f857ce1))

# [1.8.0](https://github.com/trycompai/comp/compare/v1.7.0...v1.8.0) (2025-05-10)

### Bug Fixes

- **trust:** update metadata generation to correctly handle async params and adjust URL format ([52b3d23](https://github.com/trycompai/comp/commit/52b3d2316077abb397bf3c108f4fae620502ceae))

### Features

- **trust:** implement middleware for domain-based organization ID mapping and enhance layout with new font and metadata generation ([6237329](https://github.com/trycompai/comp/commit/62373292c9725eb1bbf05bd81ffc789c30098d41))

# [1.7.0](https://github.com/trycompai/comp/compare/v1.6.0...v1.7.0) (2025-05-10)

### Features

- **trust:** add Trust app configuration and dependencies; refactor Trust Portal settings and remove unused components ([8834b14](https://github.com/trycompai/comp/commit/8834b144046c85670c5beecb6afbd514b7ad4006))
- **turbo:** add data:build configuration to manage DATABASE_URL and build inputs for enhanced build process ([6f4f1c4](https://github.com/trycompai/comp/commit/6f4f1c4e195ceface8c9aac67204c90282cf377e))

# [1.6.0](https://github.com/trycompai/comp/compare/v1.5.0...v1.6.0) (2025-05-10)

### Features

- **turbo:** add trust:build configuration to manage DATABASE_URL and inputs for improved build process ([96435a5](https://github.com/trycompai/comp/commit/96435a53558b7d1dcf8faeaa79514ef1037e70f5))

# [1.5.0](https://github.com/trycompai/comp/compare/v1.4.0...v1.5.0) (2025-05-10)

### Bug Fixes

- **package:** add missing newline at end of file in package.json ([75c0e49](https://github.com/trycompai/comp/commit/75c0e4951c79d9a7a0cfe7c30c075082da1a915d))
- **trust-portal:** optimize getTrustPortal function by caching session retrieval for improved performance ([4a7cbc5](https://github.com/trycompai/comp/commit/4a7cbc52fbbe593fa1d9d68c897242def373b2f3))

### Features

- **trust-portal:** add Trust Portal settings page and components, including loading state and switch functionality; update layout to include Trust Portal link ([3fc5fba](https://github.com/trycompai/comp/commit/3fc5fba9fcf21f55591624858268102698d75b05))
- **trust-portal:** enhance Next.js configuration and add new components for improved error handling and compliance reporting; update package dependencies ([1e899a4](https://github.com/trycompai/comp/commit/1e899a442174ec78015cef5929446ea6ebcc994e))
- **trust-portal:** implement TrustPortalSettings component with dynamic trust portal state retrieval and rendering ([4facc5c](https://github.com/trycompai/comp/commit/4facc5c6c2e30ab4afe0333a76382d3136b9c321))
- **turbo:** add build:trust configuration to manage environment variables and dependencies for improved build process ([c7475e2](https://github.com/trycompai/comp/commit/c7475e26c41f12fab9677e3dda2765feb7881010))
- **turbo:** rename build:trust to trust:build and add it to the build pipeline for better organization ([95569ae](https://github.com/trycompai/comp/commit/95569ae853fddbfc5f776006fe093c4b672e5c24))

# [1.4.0](https://github.com/trycompai/comp/compare/v1.3.0...v1.4.0) (2025-05-10)

### Features

- **controls:** add Edit and Delete Control dialogs for enhanced control management; implement update and delete functionalities in actions ([c05ab4d](https://github.com/trycompai/comp/commit/c05ab4d9faf3654b1c22b479a101f2aac721df22))
- **controls:** implement control template management features including creation, linking, and unlinking of requirements, policies, and tasks; enhance UI components for better user experience ([779e579](https://github.com/trycompai/comp/commit/779e579ddf5dd3ad86c20e97ecde735a6f7cdccb))
- **controls:** implement linking and unlinking of policy and task templates to control templates; enhance ManageLinksDialog for improved user interaction ([05da639](https://github.com/trycompai/comp/commit/05da639ccf1cce77b79837ccea4c73bba523ed6e))
- **loading:** add Loading component with skeleton placeholders for improved user experience; enhance PageLayout to support loading state ([166fa59](https://github.com/trycompai/comp/commit/166fa59d8f8f7ef535d86efeeb340a9aca4243fc))

# [1.3.0](https://github.com/trycompai/comp/compare/v1.2.1...v1.3.0) (2025-05-09)

### Features

- **Providers:** introduce Providers component to wrap RootLayout with NuqsAdapter and Suspense for improved rendering ([aa66614](https://github.com/trycompai/comp/commit/aa666142f951fb062403caba75252a26a58e91bd))

## [1.2.1](https://github.com/trycompai/comp/compare/v1.2.0...v1.2.1) (2025-05-09)

### Bug Fixes

- **layout:** correct NuqsAdapter placement in RootLayout component for proper rendering ([4d315a0](https://github.com/trycompai/comp/commit/4d315a0bb74a4e29cabf304649797c6fb8ac52b5))

# [1.2.0](https://github.com/trycompai/comp/compare/v1.1.1...v1.2.0) (2025-05-09)

### Bug Fixes

- **CreateFrameworkDialog:** adjust form layout by reducing gap size and updating version input placeholder for clarity ([ff56470](https://github.com/trycompai/comp/commit/ff5647076d4a79c5564b69cf50bcc331eaf4bc45))

### Features

- add database migrations and update Prisma schema for framework editor ([3287353](https://github.com/trycompai/comp/commit/32873533a38e29fcec7d4102cb6d233fd70e0c56))
- add RequirementBaseSchema for requirement validation; implement EditRequirementDialog for editing requirements with form handling and server action integration ([2e1e91e](https://github.com/trycompai/comp/commit/2e1e91e7679005c9d3719f18e144fa70f59f5b77))
- enhance framework editor layout with Toolbar and MenuTabs components ([21566bb](https://github.com/trycompai/comp/commit/21566bb8adb44d1498c91a185e0084cdc98dfef4))
- enhance framework-editor layout by restructuring RootLayout for full-height body and adding breadcrumbs to PageLayout for controls and policies pages; implement FrameworksClientPage for improved framework management ([2400d35](https://github.com/trycompai/comp/commit/2400d3588eff54a78c369dcddf50cd1037c6cc42))
- enhance FrameworkRequirementsClientPage with requirement editing functionality; refactor columns to use dynamic column generation and improve DataTable integration for better user experience ([1db3b8f](https://github.com/trycompai/comp/commit/1db3b8f9019892b6bf090fa35dc1acb72da14e82))
- fetch and display frameworks in framework-editor page ([b9db4b9](https://github.com/trycompai/comp/commit/b9db4b90b5374acf1e08865eb6b22fad2b8774e2))
- **FrameworkRequirementsClientPage:** add delete functionality with confirmation dialog for framework deletion ([91a9b27](https://github.com/trycompai/comp/commit/91a9b27eaff58bc7be9ec3b8238983d48867fe7f))
- implement add and delete requirement functionality with corresponding dialogs; enhance FrameworkRequirementsClientPage for better user experience and data management ([0efa400](https://github.com/trycompai/comp/commit/0efa400d7b5687e3d7993110a3c686e70dc29a8f))
- implement DataTable component for enhanced data display and search functionality across controls, frameworks, policies, and tasks pages; update layout with NuqsAdapter and Toaster for improved user experience ([a74dfca](https://github.com/trycompai/comp/commit/a74dfca1aa63409ee07b42e45bedc9a10f0590f4))
- implement delete framework functionality with confirmation dialog and server action integration ([5bdbeb1](https://github.com/trycompai/comp/commit/5bdbeb1554512009595e3b92da43dbe19f58b445))
- implement FrameworkRequirementsClientPage and enhance framework data handling; update FrameworksClientPage to include counts for requirements and controls, and improve DataTable with row click functionality ([4151d8f](https://github.com/trycompai/comp/commit/4151d8f4554be8b028957a0679e8b00aef07401b))
- introduce FrameworkBaseSchema for consistent framework validation; refactor framework actions and dialogs to utilize shared schema for improved maintainability ([066efcc](https://github.com/trycompai/comp/commit/066efcc49899d51cd1d1296a12c6f5419a182fec))
- update framework-editor with new columns for DataTable across controls, frameworks, policies, and tasks pages; enhance data fetching and layout for improved user experience ([034f75e](https://github.com/trycompai/comp/commit/034f75e1ac374fd845d78cd9901769bac1f658f4))

## [1.1.1](https://github.com/trycompai/comp/compare/v1.1.0...v1.1.1) (2025-05-09)

### Bug Fixes

- **organization:** enhance user name handling in createOrganizationAction and update newOrgSequence email content ([1f8a68a](https://github.com/trycompai/comp/commit/1f8a68a3d3223b5b8faec9872a1fe52d40b286bf))

# [1.1.0](https://github.com/trycompai/comp/compare/v1.0.1...v1.1.0) (2025-05-09)

### Bug Fixes

- **package:** add missing newline at end of file in package.json ([99ee59c](https://github.com/trycompai/comp/commit/99ee59cfa00bbc08efc14fa06bc5e9f0c3d3a51a))
- **package:** remove trailing newline in package.json ([41d024d](https://github.com/trycompai/comp/commit/41d024d3707e4b5b3f3a0e6cb097cfc722427329))

### Features

- implement new organization welcome email sequence and remove legacy email component ([5173aa0](https://github.com/trycompai/comp/commit/5173aa044af64173308a0ea53c8d654dae0a9f45))

## [1.0.1](https://github.com/trycompai/comp/compare/v1.0.0...v1.0.1) (2025-05-03)

### Bug Fixes

- **docs:** add missing period at the end of README.md tip for clarity ([245bb5f](https://github.com/trycompai/comp/commit/245bb5f18c3849da319b43bd71b4490c166fac33))
- **docs:** remove newline at end of README.md for consistency ([73b81fd](https://github.com/trycompai/comp/commit/73b81fd052bb6a2e88fd021b3fc0d4134330652c))
