// Pure scoring of one taken-out cake from the simulation stats block.
// Browning index b: 0 raw dough, ~0.6 golden ("kitsune-iro"), > 1.2 burnt.

export const FILLINGS = Object.freeze({
  1: { id: 'tsubuan', grams: 25, color: '#4b1f1f' },
  2: { id: 'custard', grams: 25, color: '#f1c75a' },
  3: { id: 'cheese', grams: 20, color: '#f5e2a0' },
  4: { id: 'matcha', grams: 22, color: '#7da23e' },
});

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const bell = (v, center, width) => clamp01(1 - ((v - center) / width) ** 2);

export const WEIGHTS = Object.freeze({
  color: 25,
  even: 15,
  doneness: 20,
  filling: 15,
  shape: 10,
  ring: 5,
  order: 10,
});

export function scoreCake(stats, order = {}) {
  const meanBrown = (stats.topBrownMean + stats.bottomBrownMean) / 2;
  const meanStd = (stats.topBrownStd + stats.bottomBrownStd) / 2;
  const grades = {
    color: bell(meanBrown, 0.62, 0.42) * (1 - clamp01(stats.burntFraction * 3)),
    even: clamp01(1 - meanStd / 0.18),
    doneness: clamp01(1 - stats.rawFraction * 2.5) * clamp01((stats.coreTempC - 55) / 25),
    filling:
      stats.fillingKind === 0
        ? 0
        : clamp01(stats.fillingG / (FILLINGS[stats.fillingKind]?.grams ?? 25)) *
          clamp01(1 - stats.fillingOffsetMm / 18),
    shape: clamp01(1 - stats.spillMl / 12) * bell(stats.volumeMl, 80, 50),
    ring: clamp01(stats.ringWhiteness),
    order: order.filling === undefined || order.filling === stats.fillingKind ? 1 : 0,
  };
  let total = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) total += grades[key] * weight;
  // Burnt or raw cakes cannot be rescued by good marks elsewhere.
  total *= clamp01(1 - stats.burntFraction * 2.5) * clamp01(1 - stats.rawFraction);
  total = Math.round(total);
  const stars = total >= 90 ? 5 : total >= 75 ? 4 : total >= 55 ? 3 : total >= 35 ? 2 : 1;
  return { total, stars, grades, comment: commentFor(stats, meanBrown, grades) };
}

function commentFor(stats, meanBrown, grades) {
  if (stats.burntFraction > 0.08 || meanBrown > 1.05) return 'comment.burnt';
  if (stats.rawFraction > 0.2 || grades.doneness < 0.5) return 'comment.raw';
  if (stats.spillMl > 4) return 'comment.spill';
  if (meanBrown < 0.38) return 'comment.pale';
  if (stats.fillingKind !== 0 && stats.fillingOffsetMm > 10) return 'comment.offcenter';
  return 'comment.great';
}

export function priceFor(score) {
  return score.stars * 40 + Math.max(0, score.total - 50);
}

export function makeOrder(rng, round) {
  const kinds = round < 2 ? [1] : round < 5 ? [1, 2] : [1, 2, 3, 4];
  return { filling: kinds[Math.floor(rng() * kinds.length)] };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
