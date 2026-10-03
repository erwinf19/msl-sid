import test from 'node:test';
import assert from 'node:assert/strict';
import { tournament } from '../tournament-data.js';
import { getStandings, getReward, validateTournament } from '../league.js';

test('standings ignore unplayed matches and balance games and match results', () => {
  const fixture = structuredClone(tournament);
  fixture.matches[0].score = [2,0];
  fixture.matches[1].score = [2,1];
  validateTournament(fixture);
  const rows = getStandings(fixture);
  assert.equal(rows[0].id, 'airlangga');
  assert.deepEqual([rows[0].points, rows[0].wins, rows[0].losses, rows[0].net], [1,1,0,2]);
  assert.equal(rows.reduce((n,r)=>n+r.net,0),0);
  assert.equal(rows.reduce((n,r)=>n+r.wins,0),2);
  assert.equal(rows.reduce((n,r)=>n+r.losses,0),2);
  assert.equal(rows.find(r=>r.id==='samudera').gameWins,0);
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
  const data=structuredClone(tournament); data.teams[0].pendingRoster=false; data.teams[0].players=['P1','P2','P3','P4'];
  assert.throws(()=>validateTournament(data));
});
test('eight teams meet once over ten weeks on the requested Tuesday–Thursday dates',()=>{
  assert.equal(tournament.teams.length,8);
  assert.equal(tournament.matches.length,28);
  const pairs=new Set();
  for(const m of tournament.matches){
    assert.ok([2,3,4].includes(new Date(`${m.date}T12:15:00Z`).getUTCDay()));
    assert.equal(m.time,'12:15'); pairs.add([m.a,m.b].sort().join(':'));
  }
  assert.equal(pairs.size,28);
  for(const t of tournament.teams) assert.equal(tournament.matches.filter(m=>m.a===t.id||m.b===t.id).length,7);
  const expectedDates = [
    ['2026-10-06','2026-10-07','2026-10-08'],
    ['2026-10-13','2026-10-14','2026-10-15'],
    ['2026-10-20','2026-10-21','2026-10-22'],
    ['2026-10-27','2026-10-28'],
    ['2026-11-03','2026-11-04','2026-11-05'],
    ['2026-11-10','2026-11-11','2026-11-12'],
    ['2026-11-17','2026-11-18'],
    ['2026-11-24','2026-11-25','2026-11-26'],
    ['2026-12-01','2026-12-02','2026-12-03'],
    ['2026-12-08','2026-12-09','2026-12-10']
  ];
  assert.equal(new Set(tournament.matches.map(m=>m.week)).size,10);
  expectedDates.forEach((dates,index)=>{
    const matches=tournament.matches.filter(m=>m.week===index+1);
    assert.deepEqual(matches.map(m=>m.date),dates);
    const teams=matches.flatMap(m=>[m.a,m.b]);
    assert.equal(new Set(teams).size,teams.length,'a team plays at most once per week');
  });
});
