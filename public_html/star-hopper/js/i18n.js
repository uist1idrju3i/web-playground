// Localized strings for Star Hopper. Key parity between languages is checked
// by a unit test.

const STRINGS = {
  ja: {
    back: 'Web Playground へ戻る',
    kicker: '一人称 浮島ジャンプアクション',
    titleSmall: 'ほしがり',
    titleMain: 'ホッパー',
    titleCopy:
      'ゆうやけの そらに うかぶ しまを ジャンプで わたり、240びょう いないに 21この ほしのかけらを あつめよう。',
    start: 'はじめる',
    how: 'あそびかた',
    loading: '準備中…',
    best: 'さいこう',
    score: 'スコア',
    time: 'のこり',
    shards: 'かけら',
    combo: 'コンボ',
    next: 'つぎへ',
    close: 'とじる',
    resume: 'つづける',
    pause: 'いったんやすみ',
    quit: 'おわる',
    retry: 'もういちど',
    toTitle: 'タイトルへ',
    result: 'けっか',
    win: 'クリア！',
    timeout: 'タイムアップ',
    newBest: 'あたらしい さいこう！',
    falls: 'おちた かず',
    bestCombo: 'さいだい コンボ',
    collected: 'あつめた かけら',
    sound: 'サウンド',
    bgm: 'BGM',
    language: 'English',
    pointerHint: 'クリックで カーソルを かくす',
    touchHint: 'ひだり: いどう · みぎ: むき · ボタン: ジャンプ',
    engine: 'そら: {gpu} · ぶつり: WebAssembly{simd}',
    simd: ' SIMD',
    go: 'GO!',
    ready: 'READY',
    countdown3: '3',
    countdown2: '2',
    countdown1: '1',
    'save.empty': 'セーブはまだありません。',
    'save.ok': 'セーブを読み込みました（HMAC 検証 OK）。',
    'save.saved': '保存しました（HMAC 署名）',
    'save.tampered': 'セーブが改ざんされていたため、新しく始めます。',
    'save.rollback': '古いセーブへの巻き戻しを検出したため、新しく始めます。',
    'save.corrupt': 'セーブの読み取りに失敗したため、新しく始めます。',
    'save.unavailable': 'このブラウザではセーブできません（記録はリセットされます）。',
    'save.key-missing': '署名キーが見つからないため、新しく始めます。',
    'save.version-mismatch': 'セーブのバージョンが違うため、新しく始めます。',
    'oobe.1.title': 'かけらを あつめよう',
    'oobe.1.body':
      'しまの うえや ジャンプの とちゅうに かがやく「ほしのかけら」が あるよ。ぜんぶで 21こ！',
    'oobe.2.title': '2だんジャンプ',
    'oobe.2.body':
      'くうちゅうでも もういちど ジャンプできるよ。とおくの しまや たかい かけらは 2だんジャンプで。',
    'oobe.3.title': 'コンボで たかとくてん',
    'oobe.3.body':
      'つぎつぎに かけらを とると コンボが のびて スコアアップ。おちると じかんが へっちゃうから きをつけて！',
    'howto.move.title': 'いどう',
    'howto.move.body': 'WASD / やじるしキー。iPhone は ひだりがわの スティック。',
    'howto.look.title': 'むき',
    'howto.look.body': 'マウスを うごかす / ドラッグ。iPhone は みぎがわを スワイプ。',
    'howto.jump.title': 'ジャンプ',
    'howto.jump.body': 'スペースキー / JUMP ボタン。もういちど おすと 2だんジャンプ！',
    'msg.pickup': '+{score}',
    'msg.combo': '{combo} コンボ！',
    'msg.fall': 'おちちゃった！ -{penalty}びょう',
    'msg.timeLow': 'あとすこし！',
    'msg.allShards': 'ぜんぶ あつめた！',
  },
  en: {
    back: 'Back to Web Playground',
    kicker: 'FIRST-PERSON FLOATING-ISLAND PLATFORMER',
    titleSmall: 'Star',
    titleMain: 'Hopper',
    titleCopy:
      'Hop across floating islands at sunset and collect all 21 star shards within 240 seconds.',
    start: 'Start',
    how: 'How to play',
    loading: 'Loading…',
    best: 'Best',
    score: 'Score',
    time: 'Time',
    shards: 'Shards',
    combo: 'Combo',
    next: 'Next',
    close: 'Close',
    resume: 'Resume',
    pause: 'Paused',
    quit: 'Quit',
    retry: 'Retry',
    toTitle: 'Title',
    result: 'Results',
    win: 'Clear!',
    timeout: 'Time up',
    newBest: 'New best!',
    falls: 'Falls',
    bestCombo: 'Best combo',
    collected: 'Shards collected',
    sound: 'Sound',
    bgm: 'Music',
    language: '日本語',
    pointerHint: 'Click to hide the cursor',
    touchHint: 'Left: move · Right: look · Button: jump',
    engine: 'Sky: {gpu} · Physics: WebAssembly{simd}',
    simd: ' SIMD',
    go: 'GO!',
    ready: 'READY',
    countdown3: '3',
    countdown2: '2',
    countdown1: '1',
    'save.empty': 'No save data yet.',
    'save.ok': 'Save loaded (HMAC verified).',
    'save.saved': 'Saved (HMAC signed).',
    'save.tampered': 'Save data was tampered with; starting fresh.',
    'save.rollback': 'Save rollback detected; starting fresh.',
    'save.corrupt': 'Save could not be read; starting fresh.',
    'save.unavailable': 'Saving is unavailable in this browser.',
    'save.key-missing': 'Signing key missing; starting fresh.',
    'save.version-mismatch': 'Save version mismatch; starting fresh.',
    'oobe.1.title': 'Collect the shards',
    'oobe.1.body': 'Glowing star shards wait on the islands and along jump arcs — 21 in total!',
    'oobe.2.title': 'Double jump',
    'oobe.2.body': 'Jump again in mid-air. Reach far islands and high shards with a double jump.',
    'oobe.3.title': 'Chain combos',
    'oobe.3.body':
      'Grab shards back-to-back to grow your combo and score. Falling costs time — careful!',
    'howto.move.title': 'Move',
    'howto.move.body': 'WASD / arrow keys. On iPhone use the left stick.',
    'howto.look.title': 'Look',
    'howto.look.body': 'Move the mouse / drag. On iPhone swipe the right half.',
    'howto.jump.title': 'Jump',
    'howto.jump.body': 'Space bar / JUMP button. Press again mid-air for a double jump!',
    'msg.pickup': '+{score}',
    'msg.combo': '{combo} combo!',
    'msg.fall': 'Fell off! -{penalty}s',
    'msg.timeLow': 'Almost out of time!',
    'msg.allShards': 'All shards collected!',
  },
};

let currentLanguage = 'ja';

export function setLanguage(lang) {
  if (lang in STRINGS) currentLanguage = lang;
}

export function language() {
  return currentLanguage;
}

export function t(key, params = {}) {
  const table = STRINGS[currentLanguage] ?? STRINGS.ja;
  const template = table[key] ?? STRINGS.ja[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

export const LANGUAGES = Object.keys(STRINGS);
export const STRING_KEYS = { ja: Object.keys(STRINGS.ja), en: Object.keys(STRINGS.en) };
