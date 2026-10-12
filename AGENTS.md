# Agent Guidelines

- Keep this a static site: do not add a build step or a CDN.
- Put shared runtime code only in `public_html/library/`.
- Every app must call `checkRequirements` before using its required capabilities.
- Never trigger permission prompts while a page loads.
- Write all repository documentation and comments in English.
- Run `npm test` before pushing changes.
- Regenerate the feature dataset with `npm run generate`.
- Register every new app in the root portal.
- This is a public repository. Never add secrets or private credentials.
