# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Academic project website for "LessMimic: Generalizable Long-Horizon Humanoid Interaction via Distance Fields". The site has two layers:

1. **Static presentation layer** (`index.html`) — Bulma CSS + vanilla JS page with videos, carousels, and paper content.
2. **Interactive demo app** (`humanoid-policy-viewer/`) — Vue 3 + Vite SPA that runs MuJoCo physics simulation with ONNX neural network policy inference entirely in the browser. Embedded via iframe in the main page.

## Build & Development Commands

All commands run from `humanoid-policy-viewer/`:

```bash
npm install          # Install dependencies
npm run dev          # Dev server on localhost:3000
npm run build        # Production build → ../static/humanoid-policy-viewer/
npm run preview      # Preview production build
```

The main `index.html` is plain HTML with no build step — edit directly and open in browser.

### SDF Precomputation (Python)

```bash
python3 precompute_sdf.py    # Generate SDF JSON files from OBJ meshes
```

Produces 40×40×40 voxel grid distance fields as base64-encoded Float32 arrays in JSON. Requires numpy.

## Deployment

GitHub Actions (`.github/workflows/deploy-pages.yml`) deploys on push to `master`:
1. Builds `humanoid-policy-viewer/` with Vite
2. Stages `index.html` + `static/` into `_site/`
3. Publishes to GitHub Pages

## Architecture

### Static Site (`index.html`, `static/`)
- Bulma CSS framework for layout, FontAwesome for icons
- `static/js/index.js` handles carousel, scroll-to-top, copy BibTeX, outline navigation
- Videos/images/PDFs served from `static/`

### Interactive Demo (`humanoid-policy-viewer/src/`)

**Entry:** `main.js` → Vue 3 app → `App.vue` → `views/Demo.vue`

**Simulation loop** (`simulation/main.js` — `MuJoCoDemo` class):
1. Initialize MuJoCo WASM with virtual filesystem
2. Load MJCF scene (G1 humanoid robot) + Three.js WebGL renderer
3. Load ONNX policy model
4. Per-frame: compute observations → ONNX forward pass → apply actions → render

**Key simulation modules:**

| Module | Role |
|--------|------|
| `simulation/main.js` | MuJoCo bootstrap, Three.js renderer, main loop |
| `simulation/mujocoUtils.js` | Scene/policy loading, MEMFS file preloading |
| `simulation/interactionPolicyRunner.js` | Policy execution with interaction task conditions |
| `simulation/policyRunner.js` | ONNX inference wrapper, observation pipeline |
| `simulation/observationHelpers.js` | Joint state, contact forces, body poses, SDF queries |
| `simulation/sdfHelper.js` | SDFVoxelGrid class for distance field evaluation |
| `simulation/objSdfComputer.js` | OBJ mesh parsing → SDF grid computation |
| `simulation/onnxHelper.js` | ONNX Runtime Web wrapper |
| `simulation/trackingHelper.js` | Motion tracking for reference-based control |
| `simulation/utils/math.js` | Quaternion, Euler, coordinate transform utilities |

**UI controls** (`views/Demo.vue`): WASD movement, task condition selection (None/Carry/Push), OBJ upload with real-time SDF computation, object position/rotation editing.

### Demo Assets (`lessmimic-live-demo-assets/`)
- `policy.onnx` / `latent_encoder.onnx` — trained neural network models
- `*.obj` — 3D meshes for interaction objects
- `*_sdf.json` — precomputed distance fields
- Motion clip JSONs and scene configuration files

## Adding New Robots/Policies

1. Place MJCF + meshes in `humanoid-policy-viewer/public/examples/scenes/<robot>/`
2. Add policy config JSON + ONNX to `humanoid-policy-viewer/public/examples/checkpoints/<robot>/`
3. Register file paths in `public/examples/scenes/files.json` for MEMFS preloading
4. Update paths in `simulation/main.js` — see `humanoid-policy-viewer/README.md` for full details

## Key Technology Constraints

- **Vite base path** is `./` (relative) for GitHub Pages compatibility
- `vuetify` and `onnxruntime-web` are excluded from Vite dep optimization in `vite.config.mjs`
- MuJoCo runs as WebAssembly — scene files must be preloaded into MEMFS virtual filesystem
- ONNX Runtime Web runs inference client-side; model files are fetched at load time
