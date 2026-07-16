# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository currently contains only a planning document (`PLAN_HOSPITAL_3D.md`) and a reference image (`imagen (14).png`). **No code has been written yet** — there is no `package.json`, no `src/` directory, and no build tooling in place. When implementation begins, this file should be updated with real build/lint/test commands and verified architecture notes.

## Project Concept

Kezelmedica — Hospital 3D Walkthrough: a first-person interactive 3D web tour of a hospital, letting users explore 15 departments/areas and view the medical equipment Kezelmedica sells. Read `PLAN_HOSPITAL_3D.md` in full before starting implementation — it contains the complete architecture plan, file structure, floor plan layout, area/equipment data model, and phased roadmap (MVP → Phase 2 → Phase 3).

## Planned Stack (per PLAN_HOSPITAL_3D.md)

- **Build tool:** Vite + Vanilla JS (no framework — intentional choice for performance/fast HMR)
- **3D engine:** Three.js (r170+)
- **First-person controls:** `PointerLockControls` (native Three.js), WASD movement, camera locked to ~1.7m eye height
- **Collisions:** native raycasting in 4 directions — no physics library
- **Models:** `GLTFLoader` for GLB/GLTF medical equipment models
- **UI overlay:** native HTML/CSS (glassmorphism panels/modals over the WebGL canvas), no UI framework

## Key Architectural Decisions to Preserve

- **Hospital geometry is procedural, not modeled**: since no GLB/GLTF hospital models exist, the building (walls, floors, ceilings, corridors) is generated programmatically from a `FloorPlan.js` data structure — do not assume pre-built hospital assets exist. Only individual equipment items are separate GLB models (sourced from Sketchfab/TurboSquid, or converted from Kezelmedica renders via Blender if available).
- **Two floors, 15 fixed areas**: the floor plan and the list of 15 areas (Quirófano, UCI, Urgencias, Imagenología, etc.) are defined in the plan's area table — treat this as the canonical data model when building `areaDefinitions.js` / `FloorPlan.js`.
- **Equipment catalog is data-driven**: equipment lives in a JSON-like structure (`equipmentData.js`) keyed by area, each with `id`, `name`, `brand`, `area`, `description`, `features`, `image`, and optional `model3d`. MVP equipment images may be placeholders if real Kezelmedica product photos aren't available.
- Hotspots (glowing interactive markers), the minimap with click-to-teleport, and the area side panel are all core MVP UI, not later enhancements.

## Performance & Feasibility Adjustments (validated 2026-07-16)

These were added during plan review — implementations should follow them, not the original unadjusted wording still visible in some plan prose:

- **No walkable stairs**: connect the two floors with an elevator/teleport trigger zone (like `DoorSystem`'s door trigger) that snaps camera Y between floors. Raycasting collision has no step-offset physics, so literal stairs are out of scope.
- **Merge static geometry**: per-room walls/floors/ceilings must be merged by material (`BufferGeometryUtils.mergeGeometries`) or instanced (`InstancedMesh` for repeated columns/door frames) — building 15 areas × 2 floors as individual meshes will blow past a reasonable draw-call budget on integrated graphics.
- **Shadow casting is proximity-scoped**: only lights in the player's current (and adjacent) area should have `castShadow = true` at any time; toggle it dynamically as the player moves. Building-wide ambient occlusion comes from baked AO/lightmap textures, not real-time AO across all 15 areas.
- **Equipment models load lazily**: the initial `LoadingScreen` only loads the hospital shell + the starting area's equipment. The remaining ~50-60 GLBs load on area-enter/proximity, not all upfront.
- **Compression is required, not optional**: use `DRACOLoader` for GLB geometry and `KTX2Loader`/Basis for textures — free Sketchfab assets are typically uncompressed and will hurt load time otherwise.
- **Reference image must be compressed**: `imagen (14).png` (3.3MB) needs to become WebP (~200-400KB) before use as the `WelcomeScreen` background.
- **"Responsive tablet" means tablet + external keyboard/mouse**, not touch controls — `PointerLockControls`/WASD has no touch equivalent in MVP scope. True touch support (virtual joystick) is Phase 2, not MVP.
- **Model licensing must be checked per-asset**: this is a commercial site, so free Sketchfab/TurboSquid models must be CC0 or explicitly commercially licensed — many "free" models are CC BY-NC and cannot legally be used here.

## Verification (per plan, once code exists)

```bash
npm run dev    # local dev server
npm run build  # verify production build compiles cleanly
```

Manual verification checklist from the plan: WASD/mouse navigation without clipping through walls, all 15 areas reachable and labeled, hotspots glow/tooltip/open modal correctly, minimap reflects real position and teleport works, >30 FPS on mid-range hardware, responsive at 1080p/1440p/tablet.

## Open Questions from the Plan

The plan explicitly flags unresolved product questions (see "Preguntas Abiertas" in `PLAN_HOSPITAL_3D.md`): whether real Kezelmedica equipment photos are available, whether this integrates into an existing Kezelmedica site or stands alone, whether the tour opens in an isometric overview before dropping into first-person, and whether there's a brand color palette to follow. Surface these to the user if they materially affect an implementation choice you're about to make.
