// Japanese/English strings. `t(key)` resolves, `t(key, vars)` interpolates
// `{name}` placeholders.

const STRINGS = {
  ja: {
    title: '超リアルな線香花火シミュレータ',
    lead: '和紙に火薬を包んだだけの小さな花火。火球のふるまいから4段階の火花まで、物理に基づいて再現します。',
    modePick: '乱数モードをえらぶ',
    modeFeel: '体感乱数(ゲーム流)',
    modeFeelDesc:
      '人間が「ランダム」と感じる分布に整える方式。PRD・シャッフルバッグ・方向カバレッジ。',
    modeTrng: '真の乱数(Web Crypto)',
    modeTrngDesc: 'crypto.getRandomValues の独立一様乱数。自然の荒さ、偏りや連発もありえます。',
    modeTrngOff: 'このブラウザでは Web Crypto の乱数が使えません',
    start: 'ともす',
    how: 'あそびかた',
    howBody1: '画面をタップ/ドラッグして線香花火を軽く傾けられます。',
    howBody2: '火花は 蕾→牡丹→松葉→散り菊 の4段階をたどり、やがて火球が落ちて終わります。',
    howBody3: '乱数モードを切り替えると、分布の「体感」が変わります。',
    close: 'とじる',
    next: 'もう一本',
    toTitle: 'タイトルへ',
    lit: '燃焼中',
    phase: '段階',
    elapsed: 'けいか',
    sparks: '火花',
    seedLabel: 'シード',
    stageNames: ['準備中', '蕾', '牡丹', '松葉', '散り菊', '落下', '終了'],
    spentTitle: '散りました',
    duration: '燃焼時間',
    bursts: '分裂回数',
    record: '最長記録',
    stats: '統計',
    statsTitle: '乱数モード別の記録',
    sticksLabel: 'ともした本数',
    histTitle: '燃焼時間の分布(秒)',
    intHistTitle: '噴出間隔の分布(ミリ秒)',
    noData: 'まだ記録がありません — ともしてみましょう',
    sound: 'おとの おおきさ',
    mute: '消音',
    bgm: '環境音',
    language: 'English',
    screenshot: '画像を保存',
    saveWarn: '保存データを読み込めませんでした(署名が一致しません)。新しく始めます。',
    engine: '{gpu} · WASM{simd}',
    simd: '+SIMD',
    oobeTitle: '線香花火へようこそ',
    oobeBody:
      '火球から火花がこぼれ、空気中で連鎖して弾けます。2つの乱数モードで「自然の荒さ」と「ゲーム的な整い」を比べてみてください。',
    oobeGo: 'はじめる',
    tiltHint: 'ドラッグで傾けられます',
    trngShort: '真乱数',
    feelShort: '体感乱数',
    sec: '秒',
    share: '共有',
  },
  en: {
    title: 'Ultra-realistic Senkō Hanabi',
    lead: 'A tiny fireworks: black powder folded into a washi twist. Simulated from the molten ball physics to the four spark stages.',
    modePick: 'Choose the random source',
    modeFeel: 'Perceived RNG (game-style)',
    modeFeelDesc:
      'Game-industry shaping: PRD transitions, quantile shuffle bags, direction coverage.',
    modeTrng: 'True randomness (Web Crypto)',
    modeTrngDesc:
      'crypto.getRandomValues — independent uniform draws, clumps and streaks included.',
    modeTrngOff: 'Web Crypto randomness is not available in this browser',
    start: 'Light it',
    how: 'How to play',
    howBody1: 'Tap or drag to gently tilt the sparkler.',
    howBody2:
      'Sparks go through bud → peony → pine-needle → falling-chrysanthemum, then the ball drops.',
    howBody3: 'Switch random modes to feel the difference in the distribution.',
    close: 'Close',
    next: 'One more',
    toTitle: 'Back to title',
    lit: 'Burning',
    phase: 'Stage',
    elapsed: 'elapsed',
    sparks: 'sparks',
    seedLabel: 'seed',
    stageNames: ['ready', 'bud', 'peony', 'pine', 'chrys', 'falling', 'done'],
    spentTitle: 'It went out',
    duration: 'Burn time',
    bursts: 'Bursts',
    record: 'Longest',
    stats: 'Stats',
    statsTitle: 'Records per random mode',
    sticksLabel: 'Sticks lit',
    histTitle: 'Burn time distribution (s)',
    intHistTitle: 'Ejection interval distribution (ms)',
    noData: 'No records yet — light one',
    sound: 'Volume',
    mute: 'Mute',
    bgm: 'Ambience',
    language: '日本語',
    screenshot: 'Save image',
    saveWarn: 'Saved data could not be verified (signature mismatch). Starting fresh.',
    engine: '{gpu} · WASM{simd}',
    simd: '+SIMD',
    oobeTitle: 'Welcome',
    oobeBody:
      'Droplets spill from the molten ball and burst in a chain in mid-air. Compare "wild nature" and "game fairness" with the two random modes.',
    oobeGo: 'Begin',
    tiltHint: 'Drag to tilt',
    trngShort: 'TRNG',
    feelShort: 'Feel',
    sec: 's',
    share: 'Share',
  },
};

let lang = 'ja';
export function setLanguage(next) {
  lang = next === 'en' ? 'en' : 'ja';
}
export function language() {
  return lang;
}
export function t(key, vars = {}) {
  const table = STRINGS[lang];
  let s = table[key] ?? STRINGS.ja[key] ?? key;
  if (Array.isArray(s)) return s;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(`{${k}}`, String(v));
  }
  return s;
}
export function stageName(phase) {
  const names = t('stageNames');
  return names[Math.max(0, Math.min(names.length - 1, phase | 0))];
}
export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }
  document.documentElement.lang = lang;
}
