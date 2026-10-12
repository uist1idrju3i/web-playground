// Per-mode records and histogram rendering. Burn durations are bucketed in
// 5s steps (0-40s+, 8 buckets); ejection intervals in 50ms steps (0-400ms+).

const SEC_STEP = 5;
const SEC_BUCKETS = 8;
const INT_STEP_MS = 50;
const INT_BUCKETS = 8;

export function bucketSeconds(seconds) {
  return Math.min(SEC_BUCKETS - 1, Math.max(0, Math.floor(seconds / SEC_STEP)));
}

export function bucketInterval(seconds) {
  return Math.min(INT_BUCKETS - 1, Math.max(0, Math.floor((seconds * 1000) / INT_STEP_MS)));
}

// Feed one burn result into a per-mode stat bucket (mutates `rec`).
export function recordBurn(rec, { duration, intervals = [] }) {
  rec.sticks += 1;
  rec.lastDur = duration;
  rec.longest = Math.max(rec.longest, duration);
  rec.hist[bucketSeconds(duration)] += 1;
  for (const iv of intervals) {
    rec.ints[bucketInterval(iv)] += 1;
  }
}

// Render a small bar histogram into a container: one div.bar per bucket,
// heights normalized to the max bucket. Labels drawn every other bucket.
export function renderHistogram(el, buckets, { unit = 's', step = SEC_STEP } = {}) {
  el.replaceChildren();
  const max = Math.max(1, ...buckets);
  const wrap = document.createElement('div');
  wrap.className = 'hist';
  buckets.forEach((n, i) => {
    const cell = document.createElement('div');
    cell.className = 'hist-col';
    const bar = document.createElement('div');
    bar.className = 'hist-bar';
    bar.style.height = `${(n / max) * 100}%`;
    bar.title = `${i * step}${unit === 'ms' ? '–' + (i + 1) * step : '+'}${unit}: ${n}`;
    const label = document.createElement('span');
    label.className = 'hist-label';
    label.textContent = i % 2 === 0 ? `${i * step}` : '';
    cell.append(bar, label);
    wrap.append(cell);
  });
  el.append(wrap);
}
