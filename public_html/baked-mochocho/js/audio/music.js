// Original music and cue data (composed for this app). Pure data + helpers, no Web Audio here,
// so unit tests can check the cue-design rules without a browser.

export const BPM = 120;
export const SWING = 0.58;
export const KEY = { tonic: 67, mode: 'mixolydian' };
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];

// Melody in eighth notes: [midi, eighths]. midi null is a rest. 8 bars of 4/4.
export const MELODY = [
  [
    [74, 2],
    [71, 1],
    [74, 1],
    [76, 3],
    [74, 1],
  ],
  [
    [72, 1],
    [69, 1],
    [72, 1],
    [77, 2],
    [76, 1],
    [72, 2],
  ],
  [
    [76, 2],
    [79, 1],
    [76, 1],
    [74, 1],
    [72, 1],
    [74, 2],
  ],
  [
    [71, 3],
    [69, 1],
    [67, 4],
  ],
  [
    [83, 2],
    [81, 1],
    [79, 1],
    [76, 2],
    [79, 2],
  ],
  [
    [81, 1],
    [84, 1],
    [81, 1],
    [77, 1],
    [79, 2],
    [77, 2],
  ],
  [
    [76, 1],
    [74, 1],
    [72, 1],
    [74, 1],
    [81, 3],
    [79, 1],
  ],
  [
    [79, 6],
    [null, 2],
  ],
];

// One chord per bar: root midi + chord tones (semitones above root).
export const CHORDS = [
  { root: 55, tones: [0, 4, 7] },
  { root: 53, tones: [0, 4, 7] },
  { root: 48, tones: [0, 4, 7] },
  { root: 55, tones: [0, 4, 7] },
  { root: 52, tones: [0, 3, 7] },
  { root: 53, tones: [0, 4, 7] },
  { root: 50, tones: [0, 5, 7, 10] },
  { root: 55, tones: [0, 4, 7] },
];

// Cue set (bard cuecraft): notes are [midi, ms]; every cue starts and ends on a sounded note.
export const CUES = {
  confirm: {
    purpose: 'confirm',
    wave: 'marimba',
    notes: [
      [86, 60],
      [91, 100],
    ],
  },
  notification: {
    purpose: 'notification',
    wave: 'bell',
    notes: [
      [93, 80],
      [93, 140],
    ],
  },
  success: {
    purpose: 'success',
    wave: 'marimba',
    notes: [
      [79, 90],
      [83, 90],
      [86, 220],
    ],
  },
  completion: {
    purpose: 'completion',
    wave: 'marimba',
    notes: [
      [79, 180],
      [86, 110],
      [83, 110],
      [91, 420],
    ],
  },
  perfect: {
    purpose: 'success',
    wave: 'bell',
    notes: [
      [91, 70],
      [96, 80],
      [103, 160],
    ],
  },
  warning: {
    purpose: 'warning',
    wave: 'square',
    notes: [
      [89, 180],
      [88, 260],
    ],
    loop: true,
    restMs: 700,
  },
  error: {
    purpose: 'error',
    wave: 'square',
    notes: [
      [74, 140],
      [68, 200],
    ],
  },
};

export const CUE_DURATION_MS = {
  confirm: [55, 300],
  success: [155, 500],
  completion: [305, 1000],
  notification: [105, 600],
  warning: [205, 800],
  error: [155, 500],
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
