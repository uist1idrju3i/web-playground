# Agent Guidelines

- Priorities: security and stability first, then runtime performance.
- Keep this a static site with no build step. Load JavaScript/CSS only from this origin or `https://cdnjs.cloudflare.com`. cdnjs resources must be version-pinned and use `integrity` (SRI sha384/sha512 from the cdnjs API) with `crossorigin="anonymous"`. Do not use any other third-party origin.
- Put shared runtime code only in `public_html/library/`.
- Every app must call `checkRequirements` before using its required capabilities.
- Never trigger permission prompts while a page loads.
- Write all repository documentation and comments in English.
- Run `npm test` before pushing changes.
- Regenerate the feature dataset with `npm run generate`.
- Register every new app in the root portal.
- This is a public repository. Never add secrets or private credentials.
- Generate WebAssembly probe binaries with `npm run generate`; do not edit generated `.wasm` files by hand.
- Build compiler profiles only with the pinned versions in `rust-toolchain.toml` and `docs/webassembly.md`.
- Keep toolchain sources under `wasm/toolchains/` and generated binaries plus their manifest under `public_html/library/wasm/toolchains/`.
- Pin every workflow action to a full commit SHA with a release-version comment; run zizmor and actionlint after workflow changes.
- Keep top-level workflow permissions empty, minimize job permissions, use `persist-credentials: false`, and harden every job.
- Run `scripts/build-wasm-toolchains.sh` when toolchain sources or flags change; commit all generated outputs and their hashes.
