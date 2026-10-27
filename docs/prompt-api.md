# Prompt API Lab

Prompt API Lab is a static learning page for Chrome's built-in Prompt API (`LanguageModel`). It
uses real browser API calls when the API is present and keeps its explanations, option examples,
and error cases readable when it is not. It never substitutes simulated model output.

## Using the lab

Open `/prompt-api/` in a supported Chrome desktop configuration. The Availability tab reports the
exposed API surface and queries `LanguageModel.availability()` for language, modality, tool, and
sampling option sets. Loading the page does not create a session or download a model. Choose an
option preset and explicitly select **Download & create session** to start model setup.

The other tabs provide focused examples:

- **Chat** streams a conversation, estimates context before sending, appends context without a
  response, forks a session, and demonstrates abort and destruction.
- **Structured output** requests JSON Schema-constrained or RegExp-constrained output and checks
  the result locally.
- **Multimodal** accepts an image, a pointer-drawn canvas, an explicit camera snapshot, an audio
  file, or an explicit microphone recording.
- **Tools** presents each local tool call for approval before executing a safe calculator, time
  lookup, or unit conversion.
- **Sampling** compares selected modes in separate sessions when the experimental option is
  exposed.
- **Error lab** submits intentionally invalid calls and compares the observed error with the
  documented expectation.

Each live call has a code disclosure whose options are serialized from the objects used by that
call. Model output is shown as plain text. The page never sends prompts, files, or saved history to
a server.

## Browser and hardware requirements

The lab itself is a static learning page and does not require the Prompt API. The browser's built-in
model is a separate capability: according to the supplied Chrome documentation, Prompt API
availability requires Chrome 148+ on desktop Windows 10/11, macOS 13+, Linux, or ChromeOS on a
Chromebook Plus device. Chrome on Android, iOS, and non-Chromebook Plus ChromeOS devices is not
supported.

The device needs at least 22 GB free on the volume containing the Chrome profile, plus either a GPU
with **more than** 4 GB VRAM or a CPU with at least 16 GB RAM and four cores. Prompt API audio input
requires a GPU. The initial model download needs an unmetered connection; subsequent use is local.
These are Chrome requirements, not a promise that every qualifying browser/device combination
will expose every option. The live availability matrix reports the result for the current browser.

## Architecture

| Area                     | Implementation                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page and responsive UI   | `public_html/prompt-api/index.html` and `app.css`; semantic tab panels, keyboard tab navigation, visible focus, reduced-motion support, and narrow-screen layouts |
| Browser integration      | `app.js`; `checkRequirements`, read-only availability checks, user-initiated session creation, streaming, media actions, and text-only output                     |
| Prompt and session rules | `js/messages.js`, `js/statechart.js`, `js/availability-matrix.js`, and `js/error-cases.js`                                                                        |
| Local output validation  | `js/schema-validate.js` and `js/calc.js`; a deliberately small JSON Schema subset and arithmetic parser without `eval` or `Function`                              |
| Tool orchestration       | `js/tool-loop.js`; injectable session, approval callback, and result classes make the open loop independently testable                                            |
| Signed chat history      | `js/history.js` plus the shared `public_html/library/js/signed-storage.js` HMAC store                                                                             |
| Browser tests            | Unit tests use pure modules; the fake `LanguageModel` is confined to `tests/e2e/fixtures/` and is not part of the public app                                      |

## Saving and privacy

Chat history and language settings are stored locally through the shared signed-storage helper.
HMAC signing provides tamper evidence for local edits or older-envelope replay; it is not
encryption, and it cannot prevent someone with DevTools from running altered code. The signing key
is non-extractable and remains in browser storage, so a save cannot be verified on another device
or after site data is cleared. The app handles unavailable, empty, corrupt, tampered, rollback,
missing-key, and version-mismatch load results without silently loading invalid data.

Model prompts and multimodal files are passed to the browser's API and are not uploaded by this
site. Browser model behavior, model quality, feature availability, and experimental support are
implementation-specific. The availability query is informative, not a guarantee that a later
create or prompt call will succeed.

## Defaults intentionally not used

The app-building defaults for WebGPU/WebGL2, background music and sound effects, and WebAssembly
are intentionally omitted. This app is an API reference and text-first teaching interface rather
than a game or computational demo: inference is supplied by the browser, there is no custom
rendering hot path, and sound would distract from the examples or require an unrelated audio
unlock. Signed local persistence is retained because history restoration is part of the lesson.

## Sources

- [Prompt API draft specification](https://webmachinelearning.github.io/prompt-api) — availability,
  message validation, session lifecycle, multimodal content, context, and tool dictionary behavior.
- [Prompt API explainer repository](https://github.com/webmachinelearning/prompt-api) — examples,
  prompting patterns, tools, and the proposal's current scope.
- [Chrome Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api) — Chrome
  setup, hardware requirements, availability, creation, and download progress.
- [Chrome built-in AI overview](https://developer.chrome.com/docs/ai/built-in) — browser-provided
  AI API context.
