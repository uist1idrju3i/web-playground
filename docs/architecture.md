# Architecture

The production deployment is a static file tree. There is no production build step.

```mermaid
flowchart TD
  visitor[Browser visitor] --> pages[public_html HTML apps]
  pages --> shared[public_html/library shared runtime]
  shared --> requirements[checkRequirements]
  requirements --> caps[capabilities.js]
  caps --> probes[feature and WASM probes]
  pages --> data[generated web feature dataset]
  source[MDN browser data and web-features] --> generate[scripts/generate-feature-data.mjs]
  generate --> data
  wat[wasm probe sources] --> wasmgen[scripts/generate-wasm-probes.mjs]
  wasmgen --> probes
  repo[tracked repository] --> gates[static resource, doc, unit, E2E, CSP, CodeQL gates]
  gates --> pages
  pages --> pagesdeploy[Cloudflare Pages serves public_html]
```

## Data flow

The portal links to each app. Apps load the shared runtime and same-origin generated data. Capability checks are read-only and do not trigger permission prompts. `checkRequirements` evaluates required and optional IDs before app-specific use. Static generators update checked-in data, capability documentation, and probe artifacts during development/CI; Cloudflare Pages serves the committed files directly.

## Source and generated files

Hand-written sources live in `public_html/`, `scripts/`, `wasm/`, and `tests/`. Generated data is under `public_html/library/data/`, generated WASM probe modules are under `public_html/library/wasm/probes/`, and the capability reference is `docs/capability-reference.md`. Edit their sources and regenerate outputs; never patch generated content alone.
