# CI/CD

## Workflow map

| Workflow                | Trigger and responsibility                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `ci.yml`                | Static checks and Chromium/WebKit/Firefox E2E; `ci-ok` aggregates required jobs                      |
| `codeql.yml`            | Advanced CodeQL for Actions and JavaScript/TypeScript, PRs, main pushes, weekly                      |
| `workflow-lint.yml`     | zizmor and actionlint                                                                                |
| `dependency-review.yml` | Dependency changes on pull requests                                                                  |
| `scorecard.yml`         | Scorecard publishing on main and weekly                                                              |
| `wasm-toolchains.yml`   | Rebuilds and byte-compares WASM outputs when sources/build script change                             |
| `deploy-smoke.yml`      | Main-branch deployment smoke check; skips with notice until the custom domain serves the site marker |

Actions are pinned to full commit SHAs with version comments. Jobs use minimal permissions, `persist-credentials: false`, and `step-security/harden-runner`. Node is pinned to 24.21.0. Ubuntu 26.04 is currently a public runner-image preview; see [maintenance](maintenance.md) for the fallback policy.

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
