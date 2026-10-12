---
name: browser-app-sound
description: How to create original BGM and sound effects for apps in this repository with the Web Audio API, distilled from VibeBB bard-agent - cue purposes and durations, distinctiveness and originality rules, song design (mode, key, tempo, form, progression), synthesis recipes for a bright "pop" sound, lookahead scheduling, mixing, iPhone audio unlock, and OfflineAudioContext tests. Use when an app plays any sound, music, jingle, or audio feedback.
---

# Browser app sound

All audio is synthesized at runtime with Web Audio. No audio files are needed, so there is
nothing to license and nothing to download. Reference implementation:
`public_html/baked-mochocho/js/audio/` (`engine.js` graph and unlock, `music.js` BGM
sequencer, `sizzle-worklet.js` AudioWorklet) and `public_html/tsumiki/js/audio.js`.

The design method follows [VibeBB bard-agent](https://github.com/VibeBB/bard-agent)
(`plugins/bard/skills/bard-cuecraft/` for product cues, `bard-songcraft/` for songs).

## 1. Plan the sound set before coding

Write a cue table in the plan: event, purpose, notes or pitch contour, duration, priority,
paired visual. Use bard's purpose vocabulary:

| Purpose      | Shape                                        | Duration    |
| ------------ | -------------------------------------------- | ----------- |
| startup      | rising 2-4 notes                             | 300-1200 ms |
| completion   | rising interval ending on the tonic          | 300-1000 ms |
| success      | short rising pair                            | 150-500 ms  |
| notification | two neutral notes                            | 200-700 ms  |
| warning      | repeated unresolved pitch with rests (loops) | 400-2000 ms |
| error        | falling or dissonant pair                    | 300-1500 ms |
| confirm      | short high tick                              | 50-300 ms   |
| cancel       | short falling pair                           | 50-300 ms   |

Rules:

- Every cue is 50-3000 ms and starts and ends on a sounded note.
- No two cues share the same opening pitch and rhythm; a user must tell them apart blind.
- Success and completion rise; error and cancel fall. Rewards scale: a combo or record gets a
  longer, brighter cue than a single hit.
- Sound is never the only channel: each cue has a visual (and optional haptic) twin.
- Frequent cues (every tap, every collision) are short, quiet, and pitch-varied (for example
  +-50 cents random or stepping up a scale with a combo) so they do not fatigue.

## 2. Design the BGM

Decide and write down before coding: mode, key, tempo, meter, form, chord progression,
rhythm palette, melody range, and instrumentation.

- **Pop default**: major (Ionian), Lydian, or Mixolydian; 110-140 BPM; 4/4; a bright lead
  (square/triangle or FM bell), plucky bass, light drums (noise hats, sine kick, noise snare).
  Pick other moods when the app's emotional job demands it (calm puzzle, tense timer).
- Form as short sections (A, B, bridge) of 4 or 8 bars, looping seamlessly; vary the
  arrangement per section so a 2-minute session does not feel like a loop.
- Melody: stepwise motion with occasional leaps, phrases that answer each other, strong
  beats on chord tones, range about an octave and a half.
- Adapt to game state: add layers with intensity, switch to a tense variant under time
  pressure, duck the music under important cues, end with a cadence on results screens.
- Store notes as scale degrees or MIDI numbers in data tables. Add a unit test that every note
  belongs to the declared mode or the current chord (this check has caught real bugs).

## 3. Originality contract

- Compose original material. Never quote or paraphrase existing songs, game jingles,
  console boot sounds, notification sounds, or sound logos, and never aim for "sounds like"
  a named artist, product, or franchise.
- Common chord progressions and scales are fine; recognizable melodies and hooks are not.
- If any recorded sample is ever used, it needs a compatible license and an entry in
  `THIRD_PARTY_NOTICES.md` (prefer CC0); synthesized audio needs none.

## 4. Synthesis recipes for a "pop" sound

- **Pop / bubble**: sine or triangle with a fast downward pitch sweep (for example 900 -> 250 Hz
  in 60 ms) and a 2 ms attack, 80 ms exponential decay.
- **Pluck**: square or saw through a lowpass whose cutoff decays quickly; short envelope.
- **Bell / sparkle**: two-operator FM (modulator ratio 2-3.5, decaying index), plus a delayed
  octave-up echo.
- **Coin / reward arpeggio**: three or four fast rising chord tones, 40-70 ms each.
- **Whoosh / sizzle**: filtered noise buffer with a swept bandpass; continuous textures belong in
  an AudioWorklet (same-origin module file, loaded with `audioWorklet.addModule`).
- **Drums**: kick = sine 150 -> 45 Hz sweep; snare = noise burst + 180 Hz body; hat = highpassed
  noise 30-60 ms.
- Envelopes: use `setValueAtTime` + `linearRampToValueAtTime` /
  `exponentialRampToValueAtTime` (never to 0; use 0.0001), and `setTargetAtTime` for release.
  Always stop and disconnect one-shot nodes when their envelope ends.
- Space: a short convolution reverb from a generated decaying-noise impulse, and stereo spread
  via `StereoPannerNode` linked to the on-screen position of the event.

## 5. Engine structure

- Graph: per-bus `GainNode`s (music, fx, ambience) -> master gain -> `DynamicsCompressorNode`
  (gentle limiting, for example threshold -14 dB, ratio 4) -> destination. Keep the summed peak
  under 0 dBFS.
- Scheduling: a lookahead scheduler (timer every ~25 ms queues events up to ~100 ms ahead using
  `ctx.currentTime`). Never schedule music with `setTimeout` timing directly.
- Limit polyphony (voice stealing) so collision storms cannot overload the audio thread.
- User controls for BGM and SFX (separate toggles, persisted in the save), defaulting to on,
  and a visible mute state.

## 6. Browser and iPhone rules

- Create or resume the `AudioContext` only inside a user-gesture handler (the first tap/start
  button). Fall back to `webkitAudioContext` when needed; `latencyHint: 'interactive'`.
- WebKit can report state `interrupted` (phone call, Siri, other app); listen to
  `statechange` and resume on the next gesture.
- The page cannot detect the iPhone silent switch: show a one-time hint on Apple touch
  devices and keep captions or visual cues for every sound.
- Suspend the context on `visibilitychange` hidden and resume when visible again.
- `web-audio` and `audio-worklet` are optional capabilities: the app must stay playable
  without sound.

## 7. Verification

- Unit tests: cue table rules (durations, distinct openings), music data in mode, scheduler
  math.
- Render each cue and a few bars of BGM through an injected `OfflineAudioContext` (the engine
  accepts one, see `engine.unlock(context)`), then assert non-silence (RMS above a floor) and
  no clipping (peak <= 1). `OfflineAudioContext.resume` exists but throws before rendering:
  guard with `typeof ctx.startRendering !== 'function'`.
- Listen to the result yourself when possible and report that physical-speaker output on an
  iPhone was not verified unless it was.
