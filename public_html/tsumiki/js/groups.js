// Achievement groupings: complete a whole group of prefectures to unlock.
// Three families — modern regions, the historical Gokishichido circuits,
// and cultural groupings. Names are yasashii-nihongo (easy Japanese).

export const MODERN_REGION_NAMES = {
  Hokkaido: 'ほっかいどう',
  Tohoku: 'とうほく',
  Kanto: 'かんとう',
  Chubu: 'ちゅうぶ',
  Kinki: 'きんき',
  Chugoku: 'ちゅうごく',
  Shikoku: 'しかく',
  Kyushu: 'きゅうしゅう',
  Okinawa: 'おきなわ',
};

// Gokishichido: the eight historical circuits (prefecture-level mapping —
// split provinces keep the prefecture in one circuit for gameplay).
export const ANCIENT_CIRCUITS = [
  { id: 'kinai', name: 'きない', codes: ['JP-26', 'JP-27', 'JP-28', 'JP-29'] },
  {
    id: 'tokaido',
    name: 'とうかいどう',
    codes: [
      'JP-08',
      'JP-11',
      'JP-12',
      'JP-13',
      'JP-14',
      'JP-19',
      'JP-21',
      'JP-22',
      'JP-23',
      'JP-24',
      'JP-25',
    ],
  },
  {
    id: 'tosando',
    name: 'とうさんどう',
    codes: [
      'JP-02',
      'JP-03',
      'JP-04',
      'JP-05',
      'JP-06',
      'JP-07',
      'JP-09',
      'JP-10',
      'JP-15',
      'JP-20',
    ],
  },
  { id: 'hokurikudo', name: 'ほくりくどう', codes: ['JP-16', 'JP-17', 'JP-18'] },
  { id: 'sanindo', name: 'さんいんどう', codes: ['JP-31', 'JP-32'] },
  { id: 'sanyodo', name: 'さんようどう', codes: ['JP-33', 'JP-34', 'JP-35'] },
  {
    id: 'nankaido',
    name: 'なんかいどう',
    codes: ['JP-30', 'JP-36', 'JP-37', 'JP-38', 'JP-39'],
  },
  {
    id: 'saikaido',
    name: 'さいかいどう',
    codes: ['JP-40', 'JP-41', 'JP-42', 'JP-43', 'JP-44', 'JP-45', 'JP-46', 'JP-47'],
  },
  { id: 'hokkaido', name: 'ほっかいどう', codes: ['JP-01'] },
];

// Cultural / historical groupings (regions may overlap here by design).
export const CULTURAL_GROUPS = [
  { id: 'koshinetsu', name: 'こうしんえつ', codes: ['JP-15', 'JP-19', 'JP-20'] },
  { id: 'tokai', name: 'とうかい', codes: ['JP-21', 'JP-22', 'JP-23', 'JP-24'] },
  { id: 'hokuriku', name: 'ほくりく', codes: ['JP-15', 'JP-16', 'JP-17', 'JP-18'] },
  { id: 'ouu', name: 'おうう', codes: ['JP-02', 'JP-05', 'JP-06'] },
  { id: 'chukyo', name: 'ちゅうきょう', codes: ['JP-21', 'JP-23'] },
  {
    id: 'setouchi',
    name: 'せとうち',
    codes: ['JP-28', 'JP-33', 'JP-34', 'JP-35', 'JP-36', 'JP-37', 'JP-38'],
  },
  { id: 'kiihanto', name: 'きいはんとう', codes: ['JP-24', 'JP-29', 'JP-30'] },
  {
    id: 'kitakyushu',
    name: 'きたきゅうしゅう',
    codes: ['JP-40', 'JP-41', 'JP-42', 'JP-44'],
  },
  {
    id: 'minamikyushu',
    name: 'みなみきゅうしゅう',
    codes: ['JP-43', 'JP-45', 'JP-46'],
  },
  { id: 'ryukyu', name: 'りゅうきゅう', codes: ['JP-47'] },
];

// Sections rendered on the collection screen. `modern` groups are derived
// from piece.region so the data file stays the source of truth.
export const ACHIEVEMENT_SECTIONS = [
  { id: 'modern', title: 'いまの ちほう', groups: 'modern' },
  { id: 'ancient', title: 'むかしの みち', groups: ANCIENT_CIRCUITS },
  { id: 'cultural', title: 'ぶんかの くに', groups: CULTURAL_GROUPS },
];

// Flat list of { id, name, codes } for completion checks.
export function achievementGroups(pieces) {
  const modern = {};
  for (const p of pieces) {
    (modern[p.region] ??= {
      id: `region-${p.region.toLowerCase()}`,
      name: MODERN_REGION_NAMES[p.region] ?? p.region,
      codes: [],
    }).codes.push(p.code);
  }
  return {
    modern: Object.values(modern),
    ancient: ANCIENT_CIRCUITS,
    cultural: CULTURAL_GROUPS,
  };
}
