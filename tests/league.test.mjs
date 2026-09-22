import test from 'node:test';
import assert from 'node:assert/strict';
import { tournament } from '../dist/tournament-data.js';
import { getStandings, getReward, validateTournament } from '../dist/league.js';

test('standings ignore unplayed matches and balance games and match results', () => {
  const fixture = structuredClone(tournament);
  fixture.matches[0].score = [2,0];
  fixture.matches[1].score = [2,1];
  validateTournament(fixture);
  const rows = getStandings(fixture);
  assert.equal(rows[0].id, 'dawn');
  assert.deepEqual([rows[0].points, rows[0].wins, rows[0].losses, rows[0].net], [1,1,0,2]);
  assert.equal(rows.reduce((n,r)=>n+r.net,0),0);
  assert.equal(rows.reduce((n,r)=>n+r.wins,0),2);
  assert.equal(rows.reduce((n,r)=>n+r.losses,0),2);
  assert.equal(rows.find(r=>r.id==='sky').gameWins,0);
});
test('the published tournament starts with no results and all standings at zero', () => {
  assert.ok(tournament.matches.every(m => m.score === null));
  for (const row of getStandings(tournament)) {
    assert.deepEqual([row.points,row.wins,row.losses,row.gameWins,row.gameLosses,row.net], [0,0,0,0,0,0]);
  }
});
test('all BO3 outcomes award the requested diamonds',()=>{
  for (const [a,b,amount] of [[2,0,28],[2,1,19],[1,2,12],[0,2,5]]) assert.equal(getReward(tournament,a,b),amount);
});
test('invalid scores and incomplete rosters are rejected',()=>{
  for (const score of [[2,2],[1,0],[3,0],[-1,2],[2,0,0]]) {
    const data=structuredClone(tournament);data.matches[0].score=score;
    assert.throws(()=>validateTournament(data));
  }
  const data=structuredClone(tournament); data.teams[0].players.pop();
  assert.throws(()=>validateTournament(data));
});
test('six teams play each other once at lunch on Tuesday or Thursday',()=>{
  assert.equal(tournament.teams.length,6);
  assert.equal(tournament.matches.length,15);
  const pairs=new Set();
  for(const m of tournament.matches){
    assert.ok([2,4].includes(new Date(`${m.date}T12:15:00Z`).getUTCDay()));
    assert.equal(m.time,'12:15'); pairs.add([m.a,m.b].sort().join(':'));
  }
  assert.equal(pairs.size,15);
  for(const t of tournament.teams) assert.equal(tournament.matches.filter(m=>m.a===t.id||m.b===t.id).length,5);
});
