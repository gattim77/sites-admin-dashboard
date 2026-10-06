# Strata — Geological Field Atlas

A working, privately hosted React/TypeScript + MapLibre geological explorer. No synthetic geological records, demo specimens, invented parking, estimated mineral abundance, or simulated routes are included.

## Working features

- Full-screen responsive map with OpenStreetMap tiles, Macrostrat geology, Dutch BRO geomorphology, remembered overlays and opacity.
- Location search through Nominatim (submit only; no forbidden autocomplete), mineral autocomplete through Macrostrat, and exact-name searches against historical ore/gangue identifications.
- 2,541 unmodified European USGS MRDS source records, including 137 in Italy and 14 in the Netherlands. 299 records contain an ore or gangue field. Counts describe the extract, not natural mineral abundance.
- Viewport queries with 400 ms debounce and clustered historical resource points. Up to 500 results with explicit truncation. Global commodity-only fallback queries are bounded to 12-degree spans.
- Point inspection with geological units, source references, conflicting map descriptions and Dutch landform classifications. Original source language is retained.
- Private fieldbook records, specimens, user photos and GPS parking via authenticated server APIs; per-owner filtering on every access.
- English interface with an Italian interface dictionary, automatic detection and remembered choice. Source metadata, some provider messages and a few detailed labels retain their original language.
- A source registry with licensing, coverage, scale, authentication, restrictions, provenance and retrieval dates.

## Important implementation boundaries

This is a functional first implementation, **not completion of every production feature in the brief**.

The hosted Sites runtime uses Cloudflare D1/R2 and platform identity. No Supabase project was supplied or provisioned. `supabase/migrations/001_geological_foundation.sql` is the separate, unapplied PostGIS/Supabase reference schema containing the requested core entities, spatial indexes and owner-only policies. It has not been applied or tested against a PostgreSQL server. It must not be mistaken for the running database.

Outside the Piacenza regional layers described below, the following remain unavailable: current mine/quarry/OSM POI inventory; compliant parking lookup; driving and hiking routing; DEM elevations, contours, hillshade, slope and elevation gain; vegetation/land-cover sampling; satellite/topographic/terrain basemaps; licensed mineral photograph catalogue; public/shared records and coordinate obscuring; community publication/moderation; offline downloads; AI identification. GPS altitude, when available, is explicitly GPS altitude, not DEM terrain elevation.

ISPRA CARG services were verified, but selected-layer reuse terms were not established, so they are not imported. EGDI shared WMS prohibits tiling and is not used as a tile server. Mindat is not scraped or accessed directly; approved commercial API access is not configured. Macrostrat's openly licensed structured mineral definitions retain their original reference links.

## Run and build

Requires Node >=22.13 and npm. Use a writable npm cache if your environment requires one.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sparkling_silk_fever.sql
npm run dev
```

Apply local migrations only once. Production Sites publishing applies its own migrations. `npm start -- --port 5173` previews the built Worker if hot reload is unstable. The bundled SIWC helpers own sign-in. Production must remain behind Sites' trusted identity-header boundary; don't expose this Worker directly with client-controlled identity headers.

## Architecture

`lib/registry.ts` is the machine-readable Data Source Registry. `lib/providers/types.ts` defines provider contracts; `mrds.ts` normalizes and conservatively reconciles source records; `geology.ts` is the geological fallback; `unconfigured.ts` exposes honest unavailable adapters and the future photo-identification contract. `/api/data` centralizes provider requests, input validation and caching. The UI never holds provider credentials.

`lib/providers/reconcile.ts` only merges identical source IDs or matching normalized names within 100 m with overlapping reported minerals/commodities. Every evidence record survives. Different classifications set a disagreement flag. The 100 m threshold is a conservative candidate heuristic, not a statement of positional accuracy. It deliberately leaves ambiguous near-duplicates separate.

`lib/upstream.ts` caches source responses and records successful retrievals. Nominatim is application-wide rate limited through an atomic database reservation. Source failures are displayed as unavailable rather than stale substitutes. Cache TTL refresh happens on demand. There is no unattended synchronization scheduler configured.

## Reproducible MRDS update

The source is the official downloadable dataset, not scraped locality pages. `data/mrds-manifest.json` records the original archive URL, SHA-256, actual retrieval time, member timestamp, licence and geographic extract. All original CSV fields survive in `data/mrds-europe.json`. This server-side extract is queried spatially; the browser never downloads the global dataset.

```sh
curl -L --fail https://mrdata.usgs.gov/mrds/mrds-csv.zip -o /tmp/mrds-csv.zip
python3 scripts/ingest-mrds.py /tmp/mrds-csv.zip
```

Review changes and licence before rebuilding. MRDS ceased systematic updates in 2011; downloading today does not make an observation current. Original report status values are always labelled historical.

## Scaling and remaining production work

Move the extract into PostGIS behind authenticated service endpoints; implement viewport MVT generation and geospatial reconciliation there. Verify/apply the provided schema and add approved scientific read policies. Bind Supabase Auth and private Storage, then test RLS with separate real accounts. Add licensed provider credentials through server secrets. Public OSM and Nominatim services have no production SLA; replace them with an approved provider when usage grows. Configure scheduled source health checks and cache cleanup, abuse limits, storage quotas, observability and backups. Review the remaining untranslated provider messages and detailed labels before a broad launch.

The source registry is evidence of review, not a legal guarantee. Each gated provider needs its own concrete endpoint/licence validation before enabling it.

## Piacenza regional atlas (30 September 2026)

The default view now opens Piacenza. A rust pickaxe identifies historical mining **records**. Clicking it opens documented minerals/materials, operating period where provided, historical status, location caveats, source links and all original attributes. Search by mine, mineral or municipality; category filters affect both map and list.

Imported from official services: 36 ISPRA/APAT province-filtered mining records, 38 regional geosites (4 mining geosites), 145 10k/50k resource/prospecting points, 78 outcrop points, REER parking/springs/viewpoints/museums/shelters/cultural POIs; 397 hiking-route features and 40 geological-itinerary features. 834 point records and 437 line features total. These are source-feature counts, not unique sites/routes: sources remain separate and overlapping evidence is not silently merged. Mine status belongs to the census (updated to 2006), not today.

Nine regional WMS overlays: detailed geology, structures, outcrops/observations, natural caves, geotechnical investigations, protected areas/Natura 2000, Monte Nero/Stirone historical vegetation, the old 5 m terrain model, and 1853 mapping. Enabled queryable layers support click inspection through a cached allowlisted server route. Terrain and historical maps are display-only; no numerical elevation/slope or canopy measurement is inferred. Geosite boundaries and original hiking/geological itinerary geometries can be enabled separately. Original trail dates, difficulty and GPX links are retained where supplied.

PIAE extraction/restoration plans and Parchi del Ducato geological walks are available as **official reference links** in Guides. No unverified document geometry is imported. Thus not every reference is a searchable vector layer. REER parking is now available as recorded points in this regional view; the global parking/routing providers remain unconfigured. Springs/fountains do not imply potability, nor mapped sites permission to enter or collect.

ISPRA and geosite selections use source province attributes; other regional records use the explicit rectangle `[9.15,44.45,10.15,45.2]` and include surroundings. The app labels this distinction. Public downloadable GeoJSON retains source IDs, original attribute JSON, URLs and timestamps. `data/piacenza-manifest.json` stores response hashes, geographic scope and counts. Reproduce with `python3 scripts/ingest-piacenza.py`. WFS 2.0 uses latitude/longitude BBOX order for EPSG:4326; output GeoJSON uses longitude/latitude. No systematic source synchronization is scheduled.

Regional layers have CC BY 4.0 metadata. ISPRA mining records use the institute's default CC BY 4.0 data policy; the mining service states no layer-specific override. PIAE and park documents remain linked only because document-specific republication terms were not verified. The source registry records these distinctions.
