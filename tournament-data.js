// Aturan dan slot jadwal tetap. Nama/roster: assets/draft-team-msl.json.
// Hasil pertandingan: assets/match-results.json. Klasemen dan hadiah dihitung otomatis.
export const tournament = {
  demo: false,
  pointsPerWin: 1,
  defaultWeek: 1,
  teams: [
    { id: 'airlangga', name: 'Team 01', tag: 'T01', color: 'blue', players: [], pendingRoster: true },
    { id: 'kalingga', name: 'Team 02', tag: 'T02', color: 'amber', players: [], pendingRoster: true },
    { id: 'samudera', name: 'Team 03', tag: 'T03', color: 'teal', players: [], pendingRoster: true },
    { id: 'padjadjaran', name: 'Team 04', tag: 'T04', color: 'purple', players: [], pendingRoster: true },
    { id: 'batavia', name: 'Team 05', tag: 'T05', color: 'red', players: [], pendingRoster: true },
    { id: 'warmadewa', name: 'Team 06', tag: 'T06', color: 'slate', players: [], pendingRoster: true },
    { id: 'sadewa', name: 'Team 07', tag: 'T07', color: 'blue', players: [], pendingRoster: true },
    { id: 'gajah-mada', name: 'Team 08', tag: 'T08', color: 'teal', players: [], pendingRoster: true }
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
