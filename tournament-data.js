// Ubah data turnamen di file ini. Klasemen dan hadiah dihitung otomatis.
export const tournament = {
  demo: false,
  pointsPerWin: 1,
  defaultWeek: 1,
  teams: [
    { id: 'dawn', name: 'Dawn Raiders', tag: 'DWN', color: 'blue', players: ['Aether', 'GoldRush', 'Titan', 'Atlas', 'Lumi'] },
    { id: 'solar', name: 'Solar Titans', tag: 'SOL', color: 'amber', players: ['Blaze', 'Solstice', 'Orion', 'Aegis', 'Nova'] },
    { id: 'sky', name: 'Sky Sentinels', tag: 'SKY', color: 'teal', players: ['Zephyr', 'Cloud9', 'Stratos', 'Harbor', 'Nimbus'] },
    { id: 'lunar', name: 'Lunar Wolves', tag: 'LNR', color: 'purple', players: ['Lupus', 'Moonshot', 'Eclipse', 'Howl', 'Selene'] },
    { id: 'ember', name: 'Ember Pact', tag: 'EMB', color: 'red', players: ['Cinder', 'Flare', 'Obsidian', 'Bastion', 'Pyra'] },
    { id: 'rift', name: 'Rift Nomads', tag: 'RFT', color: 'slate', players: ['Drift', 'Vesper', 'Onyx', 'Rune', 'Sora'] },
    { id: 'storm', name: 'Storm Keepers', tag: 'STM', color: 'blue', players: ['Bolt', 'Flash', 'Thunder', 'Rain', 'Mist'] },
    { id: 'jade', name: 'Jade Guardians', tag: 'JDE', color: 'teal', players: ['Jade', 'Emerald', 'Stone', 'Fern', 'Leaf'] }
  ],
  // Urutan pemain selalu mengikuti urutan role ini.
  roles: ['Jungler', 'Gold Lane', 'EXP Lane', 'Roamer', 'Mid Lane'],
  matches: [],
  rewards: [
    { win: true, score: '2–0', diamonds: 28 },
    { win: true, score: '2–1', diamonds: 19 },
    { win: false, score: '1–2', diamonds: 12 },
    { win: false, score: '0–2', diamonds: 5 }
  ]
};

// Eight teams meet once across ten weeks, starting Tuesday, 6 October 2026.
export const weeklyMatchCounts = [3, 3, 3, 2, 3, 3, 2, 3, 3, 3];
const rotation = tournament.teams.map(t => t.id);
const pairings = [];
for (let round = 0; round < rotation.length - 1; round++) {
  for (let pair = 0; pair < rotation.length / 2; pair++) {
    pairings.push({ a: rotation[pair], b: rotation[rotation.length - 1 - pair] });
  }
  rotation.splice(1, 0, rotation.pop());
}
let matchIndex = 0;
tournament.matches = weeklyMatchCounts.flatMap((count, weekIndex) =>
  Array.from({ length: count }, (_, dayIndex) => {
    const date = new Date(Date.UTC(2026, 9, 6 + weekIndex * 7 + dayIndex));
    const pairing = pairings[matchIndex++];
    return { id: `m${matchIndex}`, week: weekIndex + 1, date: date.toISOString().slice(0, 10), time: '12:15', ...pairing, score: null };
  })
);
