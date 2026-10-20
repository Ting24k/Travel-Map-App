# Geographic catalog and attribution

Made with Natural Earth: <https://www.naturalearthdata.com/>. All source boundaries are **public domain** under Natural Earth's terms: <https://www.naturalearthdata.com/about/terms-of-use/>. No paid service, API key, or runtime map request is required.

The exact upstream revision, source URLs, SHA-256 hashes, and normalization policy are bundled in `public/maps/provenance.json`. `npm run prepare:geo` downloads from that pinned revision, normalizes identifiers and bilingual names, explodes multipolygons into components, simplifies with mapshaper's weighted algorithm at 8% retention with `keep-shapes` per component, dissolves components back by stable ID, rounds coordinates to 0.00001°, and rewinds polygons for D3's spherical winding convention. All features and multipolygon components are retained, although simplification may alter small details. The map is for travel visualization, not navigation.

## World

Natural Earth's `ne_10m_admin_0_countries` has **258 features**. We deliberately keep every one, including dependencies, leased/disputed areas, islands, and Antarctica. IDs use unique Natural Earth `ADM0_A3` codes (`country:CHN`, `country:FRA`, etc.). ISO alpha-2 codes are additional searchable metadata, not primary keys: they are missing or duplicated for several map units. English and Chinese names come from `NAME_EN` and `NAME_ZH`; China's display name is shortened to China / 中国 for discoverability.

The app calls this statistic **countries & territories**. Its denominator is the complete 258-unit catalog, **not a count of sovereign countries**, UN members, or unique ISO codes. This includes uninhabited areas and disputed units. The UI and backup preserve this explicit classification. Tiny countries such as Vatican City, Monaco, and island nations remain accessible through search and the places list even when too small to tap. Selection automatically zooms the region into view. D3 renders all components of multipolygon countries.

## China view

Natural Earth's `ne_10m_admin_1_states_provinces` contains 32 CHN-classified features: 31 mainland provincial-level divisions and a separate Paracel Islands feature. We retain the latter's geometry within Hainan, rather than silently omitting it or counting it as an extra province. Add Hong Kong, Macau, and Taiwan as three travel units using their Natural Earth admin-0 geometries: **34 supported units** in total. IDs use ISO 3166-2-style codes, prefixed by `province:`. Hong Kong and Macau are special administrative regions. Taiwan is displayed as one travel unit; its inclusion is an organizational choice, not an assertion about sovereignty. Country and region records remain independent.

A visit to any of these 34 units derives the visited status of `country:CHN` for the world view. Hong Kong, Macau, and Taiwan also have separate world-map features in the source; their world records are not automatically marked. This is deliberate: geographic views have distinct place IDs and a single documented derivation rule. The app distinguishes derived status from a manual country visit. A direct China country visit never marks all provinces.

## Disputed boundaries

Natural Earth generally represents **de facto** boundaries and has its own classifications and limitations: <https://www.naturalearthdata.com/about/disputed-boundaries-policy/>. This app does not redraw or adjudicate them, and does not imply a political position. Border details may be incomplete, generalized, or outdated. In particular, administrative extents and disputed islands reflect the pinned source release rather than any government's official map. This is not a legally authoritative map.

Labels are prioritized by projected polygon area, checked for bounding-box collisions, and hidden beyond 3× zoom to avoid overlap. All bilingual place names remain available through selection and search.
