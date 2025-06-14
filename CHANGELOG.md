# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.1.3](https://github.com/MapColonies/exporter-trigger/compare/v3.1.2...v3.1.3) (2025-05-25)


### Bug Fixes

* naive-cache returns cache when zoom level changed ([#115](https://github.com/MapColonies/exporter-trigger/issues/115)) ([6893966](https://github.com/MapColonies/exporter-trigger/commit/689396683ba512c923aea8e5b8ab0b5ea0895103))

## [3.1.2](https://github.com/MapColonies/exporter-trigger/compare/v3.1.1...v3.1.2) (2025-03-30)


### Bug Fixes

* rename callbackUrlArray to callbackURLs in exportManager and schemas to match the openapi spec ([#113](https://github.com/MapColonies/exporter-trigger/issues/113)) ([87d32f1](https://github.com/MapColonies/exporter-trigger/commit/87d32f13e51dbefdc2f4c13757fc45321c9cbbc4))

## [3.1.0](https://github.com/MapColonies/exporter-trigger/compare/v3.0.0...v3.1.0) (2025-03-10)


### Features

* add entityName to additional params ([#108](https://github.com/MapColonies/exporter-trigger/issues/108)) ([589b414](https://github.com/MapColonies/exporter-trigger/commit/589b414dffab2df13b3c2336e80ef3ebf27f10f1))

## [3.0.0](https://github.com/MapColonies/exporter-trigger/compare/v2.20.5...v3.0.0) (2025-03-06)


### ⚠ BREAKING CHANGES

* init task creator structure ([#106](https://github.com/MapColonies/exporter-trigger/issues/106))

### Code Refactoring

* init task creator structure ([#106](https://github.com/MapColonies/exporter-trigger/issues/106)) ([0027d87](https://github.com/MapColonies/exporter-trigger/commit/0027d8765e727114932aaef95c44d88f1288e757))

### [2.20.5](https://github.com/MapColonies/exporter-trigger/compare/v2.20.4...v2.20.5) (2025-02-18)


### Bug Fixes

* jobs missing parmas ([#105](https://github.com/MapColonies/exporter-trigger/issues/105)) ([de03d61](https://github.com/MapColonies/exporter-trigger/commit/de03d61a6732625b8a0a82e183aefc9f935b8dd6))

### [2.20.4](https://github.com/MapColonies/exporter-trigger/compare/v2.20.3...v2.20.4) (2024-12-09)


### Bug Fixes

* set percentage to 0 on new job creation ([#102](https://github.com/MapColonies/exporter-trigger/issues/102)) ([40f771a](https://github.com/MapColonies/exporter-trigger/commit/40f771a98cf83c8d594f57f245f7ecc40d119a06))

### [2.20.3](https://github.com/MapColonies/exporter-trigger/compare/v2.20.2...v2.20.3) (2024-12-05)


### Bug Fixes

* return jobStatus and not taskStatus(MAPCO-5662) ([#101](https://github.com/MapColonies/exporter-trigger/issues/101)) ([224d9d4](https://github.com/MapColonies/exporter-trigger/commit/224d9d4e9e6064ee33cce5d070dbba18b5b14545))

### [2.20.2](https://github.com/MapColonies/exporter-trigger/compare/v2.20.1...v2.20.2) (2024-11-18)


### Bug Fixes

* remove layerPolygonParts from response ([#100](https://github.com/MapColonies/exporter-trigger/issues/100)) ([3f325d1](https://github.com/MapColonies/exporter-trigger/commit/3f325d1d0368635e5f7a0e3d81627cda0b81f727))

### [2.20.1](https://github.com/MapColonies/exporter-trigger/compare/v2.20.0...v2.20.1) (2024-11-06)


### Bug Fixes

* add check on boolean contains on both the original and buffered job footprint(MAPCO-5210) ([#99](https://github.com/MapColonies/exporter-trigger/issues/99)) ([55575b7](https://github.com/MapColonies/exporter-trigger/commit/55575b7b6b852e6fb01662ea9580192427dd295a))

## [2.20.0](https://github.com/MapColonies/exporter-trigger/compare/v2.19.2...v2.20.0) (2024-10-30)


### Features

* add roi duplications checks(MAPCO-5064) ([#97](https://github.com/MapColonies/exporter-trigger/issues/97)) ([4460780](https://github.com/MapColonies/exporter-trigger/commit/446078091c6c4e9ad031fc6d713893150eed9d88))

### [2.19.2](https://github.com/MapColonies/exporter-trigger/compare/v2.19.1...v2.19.2) (2024-08-25)


### Bug Fixes

* createSpanMetadata function ([#96](https://github.com/MapColonies/exporter-trigger/issues/96)) ([8e5d345](https://github.com/MapColonies/exporter-trigger/commit/8e5d3451976cd5ce83ec7251a25dee184504feff))

### [2.19.1](https://github.com/MapColonies/exporter-trigger/compare/v2.19.0...v2.19.1) (2024-08-01)


### Bug Fixes

* fix configmap env name ([#95](https://github.com/MapColonies/exporter-trigger/issues/95)) ([76f25de](https://github.com/MapColonies/exporter-trigger/commit/76f25de09b6ea0b1e7e75ad6946d4af5954f8676))

## [2.19.0](https://github.com/MapColonies/exporter-trigger/compare/v2.18.1...v2.19.0) (2024-08-01)


### Features

* Add tracing (MAPCO-3942) ([#89](https://github.com/MapColonies/exporter-trigger/issues/89)) ([54eebfc](https://github.com/MapColonies/exporter-trigger/commit/54eebfcd5331b5a871c829bc96dc7b867e4a10f1)), closes [#90](https://github.com/MapColonies/exporter-trigger/issues/90)

### [2.18.1](https://github.com/MapColonies/exporter-trigger/compare/v2.18.0...v2.18.1) (2024-07-18)

## [2.18.0](https://github.com/MapColonies/exporter-trigger/compare/v2.17.9...v2.18.0) (2024-07-18)


### Features

* add mixed support to task params (MAPCO-4210) ([#92](https://github.com/MapColonies/exporter-trigger/issues/92)) ([f8ae623](https://github.com/MapColonies/exporter-trigger/commit/f8ae623c26704b8d5e4a4e932dedfcc487b70b7f))

### [2.17.9](https://github.com/MapColonies/exporter-trigger/compare/v2.17.8...v2.17.9) (2024-05-06)

### [2.17.8](https://github.com/MapColonies/exporter-trigger/compare/v2.17.7...v2.17.8) (2024-02-20)

### [2.17.7](https://github.com/MapColonies/exporter-trigger/compare/v2.17.6...v2.17.7) (2024-02-20)

### [2.17.6](https://github.com/MapColonies/exporter-trigger/compare/v2.17.5...v2.17.6) (2024-02-20)


### Bug Fixes

* upgrade mc-models-types package (MAPCO-3257) ([#85](https://github.com/MapColonies/exporter-trigger/issues/85)) ([fb52a10](https://github.com/MapColonies/exporter-trigger/commit/fb52a10f08b9d80f5182a9e33011bb2140c4676b))

### [2.17.5](https://github.com/MapColonies/exporter-trigger/compare/v2.17.4...v2.17.5) (2024-02-19)


### Bug Fixes

* update expiration time on callback params while return duplicate success response ([#84](https://github.com/MapColonies/exporter-trigger/issues/84)) ([41a480e](https://github.com/MapColonies/exporter-trigger/commit/41a480e55be6c2b7e50017ec1f214fe5d2ac67ff))

### [2.17.4](https://github.com/MapColonies/exporter-trigger/compare/v2.17.3...v2.17.4) (2024-02-18)

### [2.17.3](https://github.com/MapColonies/exporter-trigger/compare/v2.17.2...v2.17.3) (2024-02-06)


### Bug Fixes

* merge operator values ([#82](https://github.com/MapColonies/exporter-trigger/issues/82)) ([95d121e](https://github.com/MapColonies/exporter-trigger/commit/95d121e0a33302f5c8d14ca68fb3b961368abef5))

### [2.17.2](https://github.com/MapColonies/exporter-trigger/compare/v2.17.1...v2.17.2) (2024-02-06)

### [2.17.1](https://github.com/MapColonies/exporter-trigger/compare/v2.17.0...v2.17.1) (2023-12-04)


### Bug Fixes

* handle files larger than 2G ([#78](https://github.com/MapColonies/exporter-trigger/issues/78)) ([6afc3e8](https://github.com/MapColonies/exporter-trigger/commit/6afc3e887377718a2fb6b27fdab8a1c9f1393371))

## [2.17.0](https://github.com/MapColonies/exporter-trigger/compare/v2.16.7...v2.17.0) (2023-11-13)


### Features

* add sha256 checksum to metadata file ([#77](https://github.com/MapColonies/exporter-trigger/issues/77)) ([2a383d0](https://github.com/MapColonies/exporter-trigger/commit/2a383d0a8260e66ae380138704482c030114a73a))

### [2.16.7](https://github.com/MapColonies/exporter-trigger/compare/v2.16.6...v2.16.7) (2023-09-20)

### [2.16.6](https://github.com/MapColonies/exporter-trigger/compare/v2.16.5...v2.16.6) (2023-09-19)


### Bug Fixes

* add internal-port(80) ([#75](https://github.com/MapColonies/exporter-trigger/issues/75)) ([b6393ac](https://github.com/MapColonies/exporter-trigger/commit/b6393acd572d23cf7be0ccf1db6cb7efc897d24b))
* removed chart name from template names ([#74](https://github.com/MapColonies/exporter-trigger/issues/74)) ([1815cae](https://github.com/MapColonies/exporter-trigger/commit/1815cae03b558a55ed4852807d964579503bbdb2))

### [2.16.5](https://github.com/MapColonies/exporter-trigger/compare/v2.16.4...v2.16.5) (2023-08-28)

### [2.16.4](https://github.com/MapColonies/exporter-trigger/compare/v2.16.3...v2.16.4) (2023-07-16)

### [2.16.3](https://github.com/MapColonies/exporter-trigger/compare/v2.16.2...v2.16.3) (2023-07-05)

### [2.16.2](https://github.com/MapColonies/exporter-trigger/compare/v2.16.1...v2.16.2) (2023-06-11)

### [2.16.1](https://github.com/MapColonies/exporter-trigger/compare/v2.16.0...v2.16.1) (2023-06-11)

## [2.16.0](https://github.com/MapColonies/exporter-trigger/compare/v2.15.1...v2.16.0) (2023-06-11)


### Features

* Semi integration mutual export ([#69](https://github.com/MapColonies/exporter-trigger/issues/69)) ([ec1766d](https://github.com/MapColonies/exporter-trigger/commit/ec1766d55e4f8cbb22c2b80cafc3b1b1a5b6bf3d)), closes [#1](https://github.com/MapColonies/exporter-trigger/issues/1) [#2](https://github.com/MapColonies/exporter-trigger/issues/2)

### [2.15.1](https://github.com/MapColonies/exporter-trigger/compare/v2.15.0...v2.15.1) (2023-04-30)

## [2.15.0](https://github.com/MapColonies/exporter-trigger/compare/v2.11.0...v2.15.0) (2023-04-16)


### Features

* add storage route (MAPCO-2932) ([#60](https://github.com/MapColonies/exporter-trigger/issues/60)) ([921ef84](https://github.com/MapColonies/exporter-trigger/commit/921ef84659f50158dc11e378efae67a9ffe240fb))
* adding feature properties of minResolutionDeg (MAPCO-2995) ([#66](https://github.com/MapColonies/exporter-trigger/issues/66)) ([591f5b5](https://github.com/MapColonies/exporter-trigger/commit/591f5b512a333ae3321461c944f8514141e840a2))
* API changes for integration + helm improvement (MAPCO-2931) ([#62](https://github.com/MapColonies/exporter-trigger/issues/62)) ([bda2343](https://github.com/MapColonies/exporter-trigger/commit/bda2343e136ced4b597aae671615f1072ea9521a)), closes [#2](https://github.com/MapColonies/exporter-trigger/issues/2)
* Finalize-tasks-polling (MAPCO-2888) ([#59](https://github.com/MapColonies/exporter-trigger/issues/59)) ([6e2a861](https://github.com/MapColonies/exporter-trigger/commit/6e2a861200121be6fb23a3ae31047ef6c43cf822))


### Bug Fixes

* adding missing errorReason ([#64](https://github.com/MapColonies/exporter-trigger/issues/64)) ([a75558f](https://github.com/MapColonies/exporter-trigger/commit/a75558f2f041d3a4ef33c33a163682481138cf7b))
* configuration direction on raster common ([#61](https://github.com/MapColonies/exporter-trigger/issues/61)) ([945e343](https://github.com/MapColonies/exporter-trigger/commit/945e3430c5100620f6fb11bd26a67d193d988a71))

## [2.14.0](https://github.com/MapColonies/exporter-trigger/compare/v2.13.2...v2.14.0) (2023-04-03)


### Features

* adding feature properties of minResolutionDeg (MAPCO-2995) ([#66](https://github.com/MapColonies/exporter-trigger/issues/66)) ([591f5b5](https://github.com/MapColonies/exporter-trigger/commit/591f5b512a333ae3321461c944f8514141e840a2))

### [2.13.2](https://github.com/MapColonies/exporter-trigger/compare/v2.13.1...v2.13.2) (2023-03-27)


### Bug Fixes

* adding missing errorReason ([#64](https://github.com/MapColonies/exporter-trigger/issues/64)) ([a75558f](https://github.com/MapColonies/exporter-trigger/commit/a75558f2f041d3a4ef33c33a163682481138cf7b))

### [2.13.1](https://github.com/MapColonies/exporter-trigger/compare/v2.13.0...v2.13.1) (2023-03-27)

## [2.13.0](https://github.com/MapColonies/exporter-trigger/compare/v2.12.0...v2.13.0) (2023-03-26)


### Features

* API changes for integration + helm improvement (MAPCO-2931) ([#62](https://github.com/MapColonies/exporter-trigger/issues/62)) ([bda2343](https://github.com/MapColonies/exporter-trigger/commit/bda2343e136ced4b597aae671615f1072ea9521a)), closes [#2](https://github.com/MapColonies/exporter-trigger/issues/2)


### Bug Fixes

* configuration direction on raster common ([#61](https://github.com/MapColonies/exporter-trigger/issues/61)) ([945e343](https://github.com/MapColonies/exporter-trigger/commit/945e3430c5100620f6fb11bd26a67d193d988a71))

## [2.12.0](https://github.com/MapColonies/exporter-trigger/compare/v2.11.0...v2.12.0) (2023-03-22)


### Features

* add storage route (MAPCO-2932) ([#60](https://github.com/MapColonies/exporter-trigger/issues/60)) ([921ef84](https://github.com/MapColonies/exporter-trigger/commit/921ef84659f50158dc11e378efae67a9ffe240fb))
* Finalize-tasks-polling (MAPCO-2888) ([#59](https://github.com/MapColonies/exporter-trigger/issues/59)) ([6e2a861](https://github.com/MapColonies/exporter-trigger/commit/6e2a861200121be6fb23a3ae31047ef6c43cf822))

## [2.11.0](https://github.com/MapColonies/exporter-trigger/compare/v2.10.0...v2.11.0) (2023-03-12)


### Features

* first commit for new cleanup managment logic (MAPCO-2877) (MAPCO-2878) ([#56](https://github.com/MapColonies/exporter-trigger/issues/56)) ([d3b47b7](https://github.com/MapColonies/exporter-trigger/commit/d3b47b767067c598a746b42f43bd54e92cab0bf7))

## [2.10.0](https://github.com/MapColonies/exporter-trigger/compare/v2.9.1...v2.10.0) (2023-03-08)

### [2.9.1](https://github.com/MapColonies/exporter-trigger/compare/v2.9.0...v2.9.1) (2023-02-14)


### Bug Fixes

* product version in gpkg name ([#54](https://github.com/MapColonies/exporter-trigger/issues/54)) ([79b7107](https://github.com/MapColonies/exporter-trigger/commit/79b7107de724d3632b5eeb1561768bcacd0b0ac1))

## [2.9.0](https://github.com/MapColonies/exporter-trigger/compare/v2.8.0...v2.9.0) (2023-01-17)


### Features

* making dynamic tile size calculation per tile format: jpeg/png (MAPCO-2758) ([#52](https://github.com/MapColonies/exporter-trigger/issues/52)) ([e553d4b](https://github.com/MapColonies/exporter-trigger/commit/e553d4bca4ca95b8d1ec533d9e22537874072cec))

## [2.8.0](https://github.com/MapColonies/exporter-trigger/compare/v2.7.1...v2.8.0) (2023-01-11)


### Features

* added referrer support ([#50](https://github.com/MapColonies/exporter-trigger/issues/50)) ([e59e295](https://github.com/MapColonies/exporter-trigger/commit/e59e2950780b356b48a741a6a2196cf2282d862a))

### [2.7.1](https://github.com/MapColonies/exporter-trigger/compare/v2.7.0...v2.7.1) (2023-01-04)

## [2.7.0](https://github.com/MapColonies/exporter-trigger/compare/v2.6.0...v2.7.0) (2022-12-20)


### Features

* fix order for footprint vs bbox and other cr requests ([#46](https://github.com/MapColonies/exporter-trigger/issues/46)) ([1532109](https://github.com/MapColonies/exporter-trigger/commit/15321097ccf91c51c00909645be322e4bb8323c8))
* support footprint as bbox params ([28c2655](https://github.com/MapColonies/exporter-trigger/commit/28c2655a8a8e27593e50f60e38fc11cb4fae3b6e))
* validate storage as configured param ([#48](https://github.com/MapColonies/exporter-trigger/issues/48)) ([7d8b5ed](https://github.com/MapColonies/exporter-trigger/commit/7d8b5edb9aa699f289e1882c61136e4e253b1c51))


### Bug Fixes

* layer polygon parts on metadata json ([#45](https://github.com/MapColonies/exporter-trigger/issues/45)) ([7a745be](https://github.com/MapColonies/exporter-trigger/commit/7a745be592c9d3a06434df8c83db71358d2c6ea3))

## [2.6.0](https://github.com/MapColonies/exporter-trigger/compare/v2.5.0...v2.6.0) (2022-12-11)


### Features

* add job domain (MAPCO-2709) ([#43](https://github.com/MapColonies/exporter-trigger/issues/43)) ([92f6075](https://github.com/MapColonies/exporter-trigger/commit/92f6075e688127945c31726fe897aada88f29f01))
* adding to helm external cert + api convention ([#42](https://github.com/MapColonies/exporter-trigger/issues/42)) ([669dcdb](https://github.com/MapColonies/exporter-trigger/commit/669dcdbff326acf17dc3b5011db35bc5f22edbb8))

## [2.5.0](https://github.com/MapColonies/exporter-trigger/compare/v2.4.1...v2.5.0) (2022-12-01)


### Features

* added polling jobs status system ([#31](https://github.com/MapColonies/exporter-trigger/issues/31)) ([11960f1](https://github.com/MapColonies/exporter-trigger/commit/11960f14922482650dff9052bc8d4137f56981c8))
* adding expiration date update on existing gpkg request (MAPCO-2311) ([#39](https://github.com/MapColonies/exporter-trigger/issues/39)) ([75fa1fe](https://github.com/MapColonies/exporter-trigger/commit/75fa1fe196f4c70f9ae5d14625bf042927f2599f))
* adding relative path param ([#40](https://github.com/MapColonies/exporter-trigger/issues/40)) ([eb2e8bf](https://github.com/MapColonies/exporter-trigger/commit/eb2e8bf0e1f8a5b8fff4c804af8d31900ddc0dbd))
* envoy jwt validation ([#33](https://github.com/MapColonies/exporter-trigger/issues/33)) ([f05a0e6](https://github.com/MapColonies/exporter-trigger/commit/f05a0e61e06c75082bd05adf7ee44fd056c3c603))
* support no bbox and res ([#38](https://github.com/MapColonies/exporter-trigger/issues/38)) ([a867653](https://github.com/MapColonies/exporter-trigger/commit/a86765319cce54b8a05991e6147938f6aa8fbb2b))


### Bug Fixes

* disabled envoy access logs ([#32](https://github.com/MapColonies/exporter-trigger/issues/32)) ([2cc47d0](https://github.com/MapColonies/exporter-trigger/commit/2cc47d0ec76d25b2b4594d3f666a31967d7d4ea9))
* trigger bug fixes ([#36](https://github.com/MapColonies/exporter-trigger/issues/36)) ([b035fe2](https://github.com/MapColonies/exporter-trigger/commit/b035fe23a38c636944e45cfa02f610adb146b03b))

### [2.4.1](https://github.com/MapColonies/exporter-trigger/compare/v2.4.0...v2.4.1) (2022-08-16)


### Bug Fixes

* new azure token ([#30](https://github.com/MapColonies/exporter-trigger/issues/30)) ([e2986bf](https://github.com/MapColonies/exporter-trigger/commit/e2986bfd3405f45286d08e018ec677cf74ee2f53))

## [2.4.0](https://github.com/MapColonies/exporter-trigger/compare/v2.3.0...v2.4.0) (2022-08-16)


### Features

* added task status api ([#28](https://github.com/MapColonies/exporter-trigger/issues/28)) ([aa0640d](https://github.com/MapColonies/exporter-trigger/commit/aa0640d05160c52cc087440aa90e04e04735d86b))


### Bug Fixes

* find job parameters ([#29](https://github.com/MapColonies/exporter-trigger/issues/29)) ([f1ffc8e](https://github.com/MapColonies/exporter-trigger/commit/f1ffc8edaff10f99d6aff8d4ec40ee2a8a8b6982))

## [2.3.0](https://github.com/MapColonies/exporter-trigger/compare/v2.2.0...v2.3.0) (2022-08-15)


### Features

* auth support ([#26](https://github.com/MapColonies/exporter-trigger/issues/26)) ([a213b07](https://github.com/MapColonies/exporter-trigger/commit/a213b074a6b4be2c16fe67f20062ccde4e1b2bd4))

## [2.2.0](https://github.com/MapColonies/exporter-trigger/compare/v2.1.1...v2.2.0) (2022-04-10)


### Features

* update to new model ([#22](https://github.com/MapColonies/exporter-trigger/issues/22)) ([3672476](https://github.com/MapColonies/exporter-trigger/commit/367247680bbd872b56fffa1c51a3d374d49c1ad0)), closes [#23](https://github.com/MapColonies/exporter-trigger/issues/23)

### [2.1.1](https://github.com/MapColonies/exporter-trigger/compare/v2.1.0...v2.1.1) (2022-01-19)

## [2.1.0](https://github.com/MapColonies/exporter-trigger/compare/v2.0.1...v2.1.0) (2022-01-10)


### Features

* implement naive cache solution ([#17](https://github.com/MapColonies/exporter-trigger/issues/17)) ([8253e9d](https://github.com/MapColonies/exporter-trigger/commit/8253e9d48bde81ec9054182c241cdf1eff8beab0))


### Bug Fixes

* add gpkg ext to file name ([#19](https://github.com/MapColonies/exporter-trigger/issues/19)) ([6c89620](https://github.com/MapColonies/exporter-trigger/commit/6c896206b52c67d8228e85de6f740fa147ba845b))

### [2.0.1](https://github.com/MapColonies/exporter-trigger/compare/v2.0.0...v2.0.1) (2021-12-19)


### Bug Fixes

* build and push ([#16](https://github.com/MapColonies/exporter-trigger/issues/16)) ([205a507](https://github.com/MapColonies/exporter-trigger/commit/205a5075d3896865a6a587829123a31d0cd5b0cc))

## 2.0.0 (2021-12-08)


### Features

* added new fields to job ([#15](https://github.com/MapColonies/exporter-trigger/issues/15)) ([cf19c6a](https://github.com/MapColonies/exporter-trigger/commit/cf19c6a18af286f86c6586a244b85d2d163b9ae6))
* **helm:** add helm chart ([#7](https://github.com/MapColonies/exporter-trigger/issues/7)) ([1651aa1](https://github.com/MapColonies/exporter-trigger/commit/1651aa13deaacef3b0c1b198d05fe57a542d6e7d))


### Bug Fixes

* upgrade @map-colonies/telemetry from 3.0.0 to 3.1.0 ([7c8d4e8](https://github.com/MapColonies/exporter-trigger/commit/7c8d4e8a85a22e687abd2e4cb159314096f7bfe0))
* upgrade @opentelemetry/api from 1.0.1 to 1.0.3 ([#4](https://github.com/MapColonies/exporter-trigger/issues/4)) ([378f3d7](https://github.com/MapColonies/exporter-trigger/commit/378f3d7af750530753d1019e378189ea36598320))
* upgrade @opentelemetry/api-metrics from 0.23.0 to 0.24.0 ([#3](https://github.com/MapColonies/exporter-trigger/issues/3)) ([e7a665d](https://github.com/MapColonies/exporter-trigger/commit/e7a665dc6489723d325e0f9da77b01943e134da2))
* upgrade @opentelemetry/instrumentation-express from 0.23.0 to 0.25.0 ([#5](https://github.com/MapColonies/exporter-trigger/issues/5)) ([56c189b](https://github.com/MapColonies/exporter-trigger/commit/56c189b2d34ad1f812820b708f511b6b2fbcf240))
* upgrade @opentelemetry/instrumentation-http from 0.23.0 to 0.24.0 ([#2](https://github.com/MapColonies/exporter-trigger/issues/2)) ([7fb6bf6](https://github.com/MapColonies/exporter-trigger/commit/7fb6bf60320917b05eb897720314098f19493de0))
