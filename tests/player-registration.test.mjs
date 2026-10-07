import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { preparePlayers } from '../draft.js';
import { applyPublishedTeams, exportDraft, validatePublishedTeams } from '../published-teams.js';
import { publishedToDraft } from '../draft-policy.js';
import { emptyLineups, lockMatchLineup, validateLineups, getPlayerRewards } from '../match-lineups.js';
import { tournament } from '../tournament-data.js';

const json = file => JSON.parse(readFileSync(new URL(file, import.meta.url),'utf8'));
const source = json('../assets/player-msl.json');
const players = preparePlayers(source);
const roster = json('../assets/draft-team-msl.json');
const logos = json('../assets/logo-team.json').map(file=>({name:file.replace(/\.[^.]+$/,''),src:`/assets/logo-team/${encodeURIComponent(file)}`}));

test('Risno joins Kalingga as ID 45 while SEPHORA keeps ID 35, Warmadewa membership and roster locks', () => {
  assert.deepEqual(roster.teams.map(team=>[team.name,team.players.map(player=>player.id)]),[
    ['Airlangga',[1,13,16,29,34,33]],['Kalingga',[2,10,23,24,37,45]],
    ['Samudera',[7,15,21,31,30,38]],['Padjadjaran',[6,9,18,27,40]],
    ['Batavia',[5,14,20,28,36,42]],['Warmadewa',[4,12,22,32,35]],
    ['Sadewa',[0,11,17,25,39,44]],['Gajah Mada',[3,8,19,26,41,43]]
  ]);
  assert.equal(roster.finalized,true);
  assert.equal(roster.locked,true);
  assert.equal(roster.generatedAt,'2026-10-02T09:33:02.186Z');
  assert.ok(validatePublishedTeams(roster,players,logos));
  const exported=exportDraft(publishedToDraft(roster),players,logos);
  for (const [id,username,mlId,server,roles] of [
    [35,'SEPHORA','114502835','2578','Midlaner, Roamer'],
    [45,'Cheese Milk','128162878','5029','Jungler, Goldlaner']
  ]) {
    const player=players[id];
    assert.equal(player.id,id);
    assert.equal(player.username,username);
    assert.equal(player.mobileLegendsId,mlId);
    assert.equal(player.mobileLegendsServerId,server);
    assert.equal(player.registeredRoles,roles);
    assert.deepEqual(exported.teams.flatMap(team=>team.players).find(p=>p.id===id),player);
  }
  assert.equal(players[45].telegram,'@risno.14');
  assert.equal(players[45].email,'risno@smm.sch.id');
  for (const field of ['mobileLegendsId','mobileLegendsServerId']) {
    assert.throws(()=>preparePlayers(source.map((p,id)=>id===45?{...p,[field]:'invalid'}:p)),/ID akun atau server/);
  }
});

test('existing locked match selections and individual rewards survive the rename and new registration', () => {
  const oldRoster=structuredClone(roster);
  oldRoster.teams.forEach(team=>{
    team.players=team.players.filter(player=>player.id!==45);
    team.players.forEach(player=>{if(player.id===35)player.username='M A R C O';});
  });
  const oldData=applyPublishedTeams(tournament,oldRoster);
  const match=oldData.matches.find(match=>[match.a,match.b].includes('warmadewa'));
  match.score=[2,1];
  const lineup=lockMatchLineup(oldData,emptyLineups(),match.id,
    oldData.teams.find(team=>team.id===match.a).playerIds.slice(0,5),
    oldData.teams.find(team=>team.id===match.b).playerIds.slice(0,5));
  assert.ok([...lineup.matches[0].playerIdsA,...lineup.matches[0].playerIdsB].includes(35));
  const newData=applyPublishedTeams(oldData,roster);
  assert.deepEqual(validateLineups(newData,lineup),lineup);
  const oldPlayers=players.slice(0,45).map(player=>player.id===35?{...player,username:'M A R C O'}:player);
  const before=getPlayerRewards(oldData,oldPlayers,lineup);
  const after=getPlayerRewards(newData,players,lineup);
  before.rows.forEach(player=>{
    const current=after.rows.find(row=>row.id===player.id);
    assert.equal(current.played,player.played);
    assert.equal(current.diamonds,player.diamonds);
  });
  assert.equal(after.rows.find(player=>player.id===35).username,'SEPHORA');
  assert.equal(after.rows.find(player=>player.id===45).played,0);
  assert.equal(after.rows.find(player=>player.id===45).diamonds,0);
  assert.equal(after.totalDiamonds,before.totalDiamonds);
});
