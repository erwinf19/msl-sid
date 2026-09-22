// Ubah data turnamen di file ini. Klasemen dan hadiah dihitung otomatis.
export const tournament = {
  demo: true,
  pointsPerWin: 1,
  defaultWeek: 1,
  teams: [
    { id: 'dawn', name: 'Dawn Raiders', tag: 'DWN', color: 'blue', players: ['Aether', 'GoldRush', 'Titan', 'Atlas', 'Lumi'] },
    { id: 'solar', name: 'Solar Titans', tag: 'SOL', color: 'amber', players: ['Blaze', 'Solstice', 'Orion', 'Aegis', 'Nova'] },
    { id: 'sky', name: 'Sky Sentinels', tag: 'SKY', color: 'teal', players: ['Zephyr', 'Cloud9', 'Stratos', 'Harbor', 'Nimbus'] },
    { id: 'lunar', name: 'Lunar Wolves', tag: 'LNR', color: 'purple', players: ['Lupus', 'Moonshot', 'Eclipse', 'Howl', 'Selene'] },
    { id: 'ember', name: 'Ember Pact', tag: 'EMB', color: 'red', players: ['Cinder', 'Flare', 'Obsidian', 'Bastion', 'Pyra'] },
    { id: 'rift', name: 'Rift Nomads', tag: 'RFT', color: 'slate', players: ['Drift', 'Vesper', 'Onyx', 'Rune', 'Sora'] }
  ],
  // Urutan pemain selalu mengikuti urutan role ini.
  roles: ['Jungler', 'Gold Lane', 'EXP Lane', 'Roamer', 'Mid Lane'],
  matches: [
    // previewScore hanya contoh visual; tidak memengaruhi klasemen.
    { id: 'm1', week: 1, date: '2026-10-06', time: '12:15', a: 'dawn', b: 'rift', score: null, previewScore: [2, 1] },
    { id: 'm2', week: 1, date: '2026-10-08', time: '12:15', a: 'solar', b: 'ember', score: null },
    { id: 'm3', week: 2, date: '2026-10-13', time: '12:15', a: 'sky', b: 'lunar', score: null },
    { id: 'm4', week: 2, date: '2026-10-15', time: '12:15', a: 'dawn', b: 'ember', score: null },
    { id: 'm5', week: 3, date: '2026-10-20', time: '12:15', a: 'rift', b: 'lunar', score: null },
    { id: 'm6', week: 3, date: '2026-10-22', time: '12:15', a: 'solar', b: 'sky', score: null },
    { id: 'm7', week: 4, date: '2026-10-27', time: '12:15', a: 'dawn', b: 'lunar', score: null },
    { id: 'm8', week: 4, date: '2026-10-29', time: '12:15', a: 'ember', b: 'sky', score: null },
    { id: 'm9', week: 5, date: '2026-11-03', time: '12:15', a: 'rift', b: 'solar', score: null },
    { id: 'm10', week: 5, date: '2026-11-05', time: '12:15', a: 'dawn', b: 'sky', score: null },
    { id: 'm11', week: 6, date: '2026-11-10', time: '12:15', a: 'lunar', b: 'solar', score: null },
    { id: 'm12', week: 6, date: '2026-11-12', time: '12:15', a: 'ember', b: 'rift', score: null },
    { id: 'm13', week: 7, date: '2026-11-17', time: '12:15', a: 'dawn', b: 'solar', score: null },
    { id: 'm14', week: 7, date: '2026-11-19', time: '12:15', a: 'sky', b: 'rift', score: null },
    { id: 'm15', week: 8, date: '2026-11-24', time: '12:15', a: 'lunar', b: 'ember', score: null }
  ],
  rewards: [
    { win: true, score: '2–0', diamonds: 28 },
    { win: true, score: '2–1', diamonds: 19 },
    { win: false, score: '1–2', diamonds: 12 },
    { win: false, score: '0–2', diamonds: 5 }
  ]
};
