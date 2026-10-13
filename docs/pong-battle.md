# PONG Programming Battle

A programming-battle game: the paddle is driven by Ruby code, not your
hands. You write (or pick) a brain, deploy it, and it fights an enemy
brain in real time.

## Running it

`npm run serve` then open `/pong-battle/`. Requires Web Workers,
WebAssembly and WebGL2 (WebGPU preferred when present). Audio unlocks on
the first gesture.

## Architecture

| Piece | Path | Notes |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic sim | `js/sim.js` | 120 Hz fixed-step physics; seeded; speed-cap, rally wind and stamina escalation systems |
| Statechart | `js/statechart.js` | Explicit phases mirrored to `body[data-phase]` |
| Brain workers | `brain-worker.js`, `js/brain-host.js` | Two workers, each booting a private Ruby.wasm VM (~70 MB). Brains are isolated: a crashed or hung brain is rebooted without touching the opponent |
| Ruby SDK | `ruby/pong_kit.rb` | `brain "name" do                                                                                                                                  | g   | … end`DSL +`Brain.register`objects;`g.ball.y_at`intercept prediction,`g.seek`, `g.wind_ay`, `g.me.stamina`, `brain_debug` overlay |
| Brains | `ruby/enemy/*.rb`, `ruby/samples/*.rb` | Four enemy levels (Rookie/Club/Ace/NOVA boss) and five readable player samples, all in Ruby |
| Renderers | `js/render-webgpu.js`, `js/render-webgl2.js` | Identical sprite-batch scene from `js/scene.js`; WebGPU first, WebGL2 fallback, `canvas[data-renderer]` reports which ran |
| Audio | `js/audio.js` | Synthesized cues + procedural 4-bar pop loop; every cue has a visual twin (banner/HUD) |
| Saves | `js/save.js` | HMAC-signed via `library/js/signed-storage.js`: unlocked level, best scores, settings, your code |
| i18n | `js/i18n.js` | ja/en dictionary, `[data-i18n]` and `[data-i18n-title]` |
| Execution trace | `ruby/pong_kit.rb`, `js/app.js` | `TracePoint(:line)` scoped to `brain.rb` reports executed lines per tick; the editor flashes the hot line and fades recent ones (toggle `#trace-toggle`) |
| Debug tools | `js/app.js`, `ruby/pong_kit.rb` | Whole-match slow motion (`#speed-group`: 1×/½/¼/⅒, scales one `dt` so physics, brains and countdown stay coherent) and a variable-watch panel (`opts[:watch]` → `Pong::Brain.vars` dumps the brain's @ivars per tick; numerics draw sparklines) |

## Brain protocol

`brain-worker.js` receives `{op:'boot'|'load'|'tick'}`. Brain source and
match state cross the worker boundary as single-quoted Ruby string
literals inside `Battle.load_brain('…')` / `Battle.tick('…')` evals; the
VM returns JSON which the host parses. `require 'js'` is deliberately
not used — brains are pure-Ruby functions over a state hash, which keeps
CSP at `wasm-unsafe-eval` with no `unsafe-eval` and lets the same brains
run headless under Node for unit tests.

## Escalation design

A rally that drags past ~8 hits fades in persistent wind plus gust
bursts (`GUST`), the ball's speed cap rises with rally length, and
paddles drain stamina per distance travelled (`STAMINA`). This makes
rallies always resolve while rewarding disturbance-tolerant control —
which is the lesson the enemy ladder teaches: Rookie chases, Club
predicts, Ace predicts-and-aims under wind correction, and NOVA
pre-positions, budgets stamina, and aims lethal-corner returns off your
own velocity.

## Match visuals

Missed balls fly out of the court before the point is awarded, and both
paddles' and the ball's glow sprites are sized near the real hit boxes
so visual contact matches the exact swept-plane collision test in
`js/sim.js`. Pickers lock while a match is live; the editor sits under
the board and can expand to a focus view via `#editor-expand`.

## Tests

`tests/unit/pong-battle-sim.test.js` covers sim invariants,
determinism, serve direction, escalation, snapshot side-symmetry, and
real-Ruby headless matches (rookie must lose to every serious brain).
`tests/e2e/pong-battle.spec.js` covers boot → deploy → playing phase,
editor, HUD and renderer selection without playing in real time.
