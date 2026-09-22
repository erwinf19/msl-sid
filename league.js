export function validateTournament(data) {
  const ids = new Set(data.teams.map(t => t.id));
  if (ids.size !== data.teams.length) throw new Error('ID tim harus unik.');
  if (!Number.isFinite(data.pointsPerWin) || data.pointsPerWin < 0) throw new Error('Match Point tidak valid.');
  for (const t of data.teams) if (t.players.length !== 5) throw new Error(`${t.name} harus memiliki 5 pemain.`);
  for (const m of data.matches) {
    if (!ids.has(m.a) || !ids.has(m.b) || m.a === m.b) throw new Error(`Tim pada ${m.id} tidak valid.`);
    if (m.score !== null && (!Array.isArray(m.score) || m.score.length !== 2 || !m.score.every(n => Number.isInteger(n) && n >= 0 && n <= 2) || Math.max(...m.score) !== 2 || m.score[0] === m.score[1])) throw new Error(`Skor BO3 ${m.id} tidak valid.`);
  }
}
export function getStandings(data) {
  const rows = data.teams.map(t => ({ ...t, wins: 0, losses: 0, gameWins: 0, gameLosses: 0, points: 0, net: 0 }));
  for (const m of data.matches.filter(m => m.score !== null)) {
    [m.a, m.b].forEach((id, index) => {
      const row = rows.find(t => t.id === id), own = m.score[index], other = m.score[1-index];
      row.gameWins += own; row.gameLosses += other;
      if (own > other) { row.wins++; row.points += data.pointsPerWin; } else row.losses++;
      row.net = row.gameWins - row.gameLosses;
    });
  }
  return rows.sort((a,b) => b.points-a.points || b.net-a.net || b.gameWins-a.gameWins || a.name.localeCompare(b.name));
}
export function getReward(data, own, other) {
  return data.rewards.find(r => r.score === `${own}–${other}`)?.diamonds ?? 0;
}
