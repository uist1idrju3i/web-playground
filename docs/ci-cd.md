# CI/CD

## Workflow map

| Workflow                | Trigger and responsibility                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`                | Static checks and Chromium/WebKit/Firefox E2E; `ci-ok` aggregates required jobs                                                                                                                        |
| `codeql.yml`            | Advanced CodeQL for Actions and JavaScript/TypeScript, PRs, main pushes, weekly                                                                                                                        |
| `workflow-lint.yml`     | zizmor and actionlint                                                                                                                                                                                  |
| `dependency-review.yml` | Dependency changes on pull requests                                                                                                                                                                    |
| `scorecard.yml`         | Scorecard publishing on main and weekly                                                                                                                                                                |
| `wasm-toolchains.yml`   | Rebuilds and byte-compares WASM outputs when sources/build script change                                                                                                                               |
| `deploy-smoke.yml`      | Main pushes, daily schedule, and manual dispatch; waits for deployed non-HTML assets to match the commit, checks Pages headers, then tests production resource policy in Chromium, WebKit, and Firefox |

Actions are pinned to full commit SHAs with version comments. Jobs use minimal permissions, `persist-credentials: false`, and `step-security/harden-runner`. Node is pinned to 24.21.0. Ubuntu 26.04 is currently a public runner-image preview; see [maintenance](maintenance.md) for the fallback policy.

The `browser-policy` job fails if the Cloudflare zone rewrites application HTML (for example with Rocket Loader) or injects third-party scripts such as the Web Analytics beacon. It runs the per-page resource-policy checks against the production custom domain; the scheduled run also catches dashboard changes that do not create a repository push.

For branch protection, require the `ci-ok` aggregator and the CodeQL code-scanning check. CodeQL advanced setup analyzes Actions and JavaScript/TypeScript; C/C++ and Rust use `build-mode: none` when their sources are present.

## Owner-side repository settings checklist

- Require approval for first-time or otherwise untrusted fork pull requests before workflows run.
- Keep the default `GITHUB_TOKEN` read-only; grant write permissions only to the one job that needs them.
- Enable secret scanning and push protection.
- Configure a ruleset requiring `ci-ok` and CodeQL, and require branches to be up to date.
- Enable “Require code scanning results” for High severity and above and for errors.
- If CodeQL default setup is enabled, switch to advanced setup before enabling this repository's `codeql.yml`; do not run conflicting setups.
- Keep `wasm-toolchains` optional in branch rules: its `paths` filters mean it is not emitted for every pull request.
- Review the owner file and dependency graph availability for dependency-review.

## Local checks

```sh
npm ci --ignore-scripts
npm audit signatures
npm test
uvx zizmor .
actionlint
```

Do not describe a deployment as live or CI as green without checking the corresponding workflow and logs.
