# Acceptance boundaries

Scientific integrity is the release gate. Every map point is an original USGS report or a private user-created location. Every geological polygon comes from Macrostrat or BRO/PDOK. No point is expanded into an occurrence probability surface. Exact matching uses the source's ore/gangue list; commodity-only records do not establish mineral species.

## Implemented checks

- TypeScript compilation and a production Worker build.
- Five passing checks using the real extract: archive provenance/bounds, exact mineral matching, viewport bounds/truncation, evidence-preserving reconciliation, and personal-input rejection.
- Real upstream Macrostrat inspection, PDOK WMS capabilities and text GetFeatureInfo, USGS hosted query and official CSV extract.
- Browser confirmation of OSM and Macrostrat map rendering, resource report list and layer controls.
- Dataset ingestion retains every field, records an archive SHA-256, bounds the extract to Europe and introduces no artificial records.

## Outstanding validation

- Hosted sign-in and two-account authorization need verification against actual deployed accounts.
- The Supabase/PostGIS reference migration is not the hosted database and has not been applied.
- Offline mode, sharing, moderation, routing and environmental metrics are intentionally unavailable.
- No stress or load testing has been performed. Public provider infrastructure is not an SLA-backed commercial map stack.

## Built-Worker endpoint verification

Verified the built local Worker (not only development compilation): geology returned two mapped units at the inspected Italian point; mineral search returned real Macrostrat definitions; an exact European Fluorite search returned 18 historical reports; PDOK returned its original landform classification at 52.12, 5.5; unauthenticated private-record access returned HTTP 401. A 390 × 844 browser check confirmed the mobile map/search sheet and mineral search interaction.

## Piacenza extension

- Real source ingestion: 36 ISPRA province records and 38 regional geosites (including 4 historical mines); exact original attributes retained.
- Regional WFS geographic axis ordering checked against the actual Vigonzano geosite position.
- Additional integrity tests cover counts/IDs, original minerals and operating dates, trail/GPX provenance and WMS allowlisting.
- Live regional geological GetFeatureInfo successfully returned source formation attributes at a test point near Ferriere.
- Source counts represent records; nearby cross-source points may describe the same physical workings.
- PIAE and park guides are reference links, not ingested polygons/routes. No current site accessibility is certified.

Piacenza validation: TypeScript and production build passed; three dataset/coordinate/layer-integrity tests passed. Local API inspection returned actual regional bedrock attributes. Clicking a pickaxe opened the Pontenure historical record with material, dates and source link. Mobile layout at 390 × 844 had no horizontal overflow; layer and itinerary controls were operable.
