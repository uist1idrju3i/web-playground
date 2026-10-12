# CI/CD and Repository Security

## Workflow map

| Workflow                 | Trigger                                                           | Purpose                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CI`                     | Pull requests and pushes to `main`                                | Static checks, generated-artifact validation, unit tests, and one Playwright job per browser engine. `ci-ok` is the required aggregate check.                                     |
| `CodeQL`                 | Pull requests, pushes to `main`, and weekly                       | Advanced security-and-quality analysis for Actions, JavaScript/TypeScript, C/C++, and Rust.                                                                                       |
| `Workflow Security`      | Pull requests and pushes to `main`                                | Runs zizmor and actionlint against workflow definitions.                                                                                                                          |
| `Dependency Review`      | Pull requests                                                     | Reviews dependency changes for known vulnerabilities.                                                                                                                             |
| `OpenSSF Scorecard`      | Pushes to `main` and weekly                                       | Publishes the repository security posture to the Scorecard service.                                                                                                               |
| `Deployment Smoke Test`  | Pushes to `main`                                                  | Waits for the live site marker, then checks key pages, isolation/CSP headers, and WebAssembly MIME type. It emits a notice and skips when the domain is not serving this project. |
| `WebAssembly Toolchains` | Pull requests and `main` changes to `wasm/**` or its build script | Rebuilds all compiler profiles and checks generated artifacts against committed outputs.                                                                                          |

All workflow actions are pinned to full commit SHAs. Keep the adjacent version comment current, resolve releases through the GitHub API, and run both zizmor and actionlint when workflow files change. Workflow permissions default to none; each job declares only the permissions it needs. Checkout steps disable persisted credentials.

The static job runs `scripts/check-external-resources.mjs` through `npm run lint` to enforce the repository's JavaScript and CSS origin policy. Keep external resources limited to this origin and compliant cdnjs resources; see [External Resources](external-resources.md).

## Owner-side settings checklist

- [ ] Keep the full-SHA action pinning policy enabled in review; do not replace pins with tags.
- [ ] Require approval for workflow runs from first-time or outside collaborators before they can consume Actions minutes or access repository resources.
- [ ] Set the default `GITHUB_TOKEN` permission to read-only. Grant write access only to jobs that explicitly need it, such as publishing CodeQL or Scorecard SARIF.
- [ ] Enable secret scanning and push protection. Do not add credentials, deployment secrets, or private data to this public repository.
- [ ] Enable the dependency graph and private vulnerability reporting.
- [ ] Add a `main` branch ruleset requiring `CI / ci-ok` and the CodeQL analysis check before merge; require pull requests and block force pushes.
- [ ] If GitHub's default CodeQL setup is enabled, switch it to **Advanced** before relying on `.github/workflows/codeql.yml`; do not run both default and advanced configurations unintentionally.
- [ ] Keep the Cloudflare Pages production branch set to `main`, with framework preset **None**, build command empty, output directory `public_html`, and `SKIP_DEPENDENCY_INSTALL=1`.

## Local workflow checks

Install actionlint from its release archive and verify the archive against the published checksums. Run:

```sh
uvx zizmor .
actionlint
```

The CI workflow also runs `npm ci --ignore-scripts` and `npm audit signatures`; no install lifecycle script is needed for this static project.
