// Original music and cue data (composed for this app). Pure data + helpers, no Web Audio here,
// so unit tests can check the cue-design rules without a browser.

export const BPM = 96;
export const SWING = 0.58;
export const KEY = { tonic: 62, mode: 'mixolydian' };
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];

// Melody in eighth notes: [midi, eighths]. midi null is a rest. 8 bars of 4/4.
export const MELODY = [
  [
    [69, 2],
    [66, 1],
    [69, 1],
    [71, 3],
    [69, 1],
  ],
  [
    [67, 1],
    [64, 1],
    [67, 1],
    [72, 2],
    [71, 1],
    [67, 2],
  ],
  [
    [71, 2],
    [74, 1],
    [71, 1],
    [69, 1],
    [67, 1],
    [69, 2],
  ],
  [
    [66, 3],
    [64, 1],
    [62, 4],
  ],
  [
    [78, 2],
    [76, 1],
    [74, 1],
    [71, 2],
    [74, 2],
  ],
  [
    [76, 1],
    [79, 1],
    [76, 1],
    [72, 1],
    [74, 2],
    [72, 2],
  ],
  [
    [71, 1],
    [69, 1],
    [67, 1],
    [69, 1],
    [76, 3],
    [74, 1],
  ],
  [
    [74, 6],
    [null, 2],
  ],
];

// One chord per bar: root midi + chord tones (semitones above root).
export const CHORDS = [
  { root: 50, tones: [0, 4, 7] },
  { root: 48, tones: [0, 4, 7] },
  { root: 43, tones: [0, 4, 7] },
  { root: 50, tones: [0, 4, 7] },
  { root: 47, tones: [0, 3, 7] },
  { root: 48, tones: [0, 4, 7] },
  { root: 45, tones: [0, 5, 7, 10] },
  { root: 50, tones: [0, 4, 7] },
];

// Cue set (bard cuecraft): notes are [midi, ms]; every cue starts and ends on a sounded note.
export const CUES = {
  confirm: {
    purpose: 'confirm',
    wave: 'marimba',
    notes: [
      [81, 60],
      [86, 100],
    ],
  },
  notification: {
    purpose: 'notification',
    wave: 'bell',
    notes: [
      [88, 80],
      [88, 140],
    ],
  },
  success: {
    purpose: 'success',
    wave: 'marimba',
    notes: [
      [74, 90],
      [78, 90],
      [81, 220],
    ],
  },
  completion: {
    purpose: 'completion',
    wave: 'marimba',
    notes: [
      [74, 180],
      [81, 110],
      [78, 110],
      [86, 420],
    ],
  },
  warning: {
    purpose: 'warning',
    wave: 'square',
    notes: [
      [84, 180],
      [83, 260],
    ],
    loop: true,
    restMs: 700,
  },
  error: {
    purpose: 'error',
    wave: 'square',
    notes: [
      [69, 140],
      [63, 200],
    ],
  },
};

export const CUE_DURATION_MS = {
  confirm: [50, 300],
  success: [150, 500],
  completion: [300, 1000],
  notification: [100, 600],
  warning: [200, 800],
  error: [150, 500],
};

export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function cueDuration(cue) {
  return cue.notes.reduce((sum, [, ms]) => sum + ms, 0);
}

export function openingInterval(cue) {
  return cue.notes[1][0] - cue.notes[0][0];
}

export function contour(cue) {
  const notes = cue.notes;
  return Math.sign(notes[notes.length - 1][0] - notes[0][0]);
}

export function inMode(midi) {
  return MIXOLYDIAN.includes((((midi - KEY.tonic) % 12) + 12) % 12);
}

// Flatten the loop into absolute events (seconds) for one pass.
export function melodyEvents() {
  const eighth = 60 / BPM / 2;
  const events = [];
  let index = 0;
  MELODY.forEach((bar) => {
    for (const [midi, len] of bar) {
      if (midi !== null) events.push({ midi, start: swungTime(index, eighth), dur: len * eighth });
      index += len;
    }
  });
  return events;
}

export function swungTime(eighthIndex, eighth) {
  const pair = Math.floor(eighthIndex / 2);
  return pair * 2 * eighth + (eighthIndex % 2 ? SWING * 2 * eighth : 0);
}

export const LOOP_SECONDS = (MELODY.length * 4 * 60) / BPM;
