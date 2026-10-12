// Original composition data for the BGM and the bard-style cue set.
// Everything here is written from scratch for this app: no borrowed melody,
// no sampled audio. Scale: in-scale / miyako-bushi pentatonic over D
// (D F G A C) for the "yugen" feel, brightened by the major 4th degree.

export const BPM = 76;

// Frequencies (Hz) in the D in-scale family.
export const SCALE = {
  D3: 146.83,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
};

// Chord beds for the sho-style pad (root + color tones in Hz).
export const CHORDS = [
  [SCALE.D3, SCALE.F3, SCALE.A3, SCALE.C4],
  [SCALE.F3, SCALE.A3, SCALE.C4, SCALE.D4],
  [SCALE.G3, SCALE.C4, SCALE.D4, SCALE.G4],
  [SCALE.A3, SCALE.C4, SCALE.D4, SCALE.F4],
];

// Original melody: 16 bars, [beats offset within 4-bar cycle, freq, dur].
export const MELODY = [
  [0, SCALE.D5, 1.5],
  [1.5, SCALE.C5, 0.5],
  [2, SCALE.A4, 1.0],
  [3, SCALE.G4, 1.0],
  [4, SCALE.D5, 1.5],
  [5.5, SCALE.F5, 0.5],
  [6, SCALE.G5, 1.5],
  [7.5, SCALE.F5, 0.5],
  [8, SCALE.D5, 2.0],
  [10, SCALE.A4, 1.0],
  [11, SCALE.C5, 1.0],
  [12, SCALE.F4, 1.0],
  [13, SCALE.G4, 1.0],
  [14, SCALE.A4, 1.0],
  [15, SCALE.D5, 1.0],
];

// Taiko pattern: o-daiko hits as [beat, velocity, low|high].
export const TAIKO = [
  [0, 1.0, 'low'],
  [1, 0.5, 'high'],
  [1.75, 0.55, 'high'],
  [2, 0.8, 'low'],
  [3, 0.5, 'high'],
];

// Koto arpeggio across each chord.
export const KOTO_DIV = 0.5;

export const CUES = {
  startup: { notes: [SCALE.D4, SCALE.G4, SCALE.A4, SCALE.D5], dur: 0.22 },
  success: { notes: [SCALE.G4, SCALE.A4, SCALE.D5], dur: 0.14 },
  completion: { notes: [SCALE.D5, SCALE.F5, SCALE.G5, SCALE.A5], dur: 0.2 },
  error: { notes: [SCALE.F4, SCALE.D4], dur: 0.2 },
  notification: { notes: [SCALE.A4, SCALE.D5], dur: 0.12 },
  confirm: { notes: [SCALE.A4], dur: 0.1 },
  cancel: { notes: [SCALE.G4], dur: 0.1 },
  warning: { notes: [SCALE.C4, SCALE.D4], dur: 0.28, loop: true },
  shutdown: { notes: [SCALE.D5, SCALE.A4, SCALE.G4, SCALE.D4], dur: 0.24 },
  pairing: { notes: [SCALE.C4, SCALE.G4], dur: 0.3, loop: true },
};
