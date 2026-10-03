import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tournament } from '../tournament-data.js';
import { preparePlayers } from '../draft.js';
import { applyPublishedTeams } from '../published-teams.js';
import { emptyLineups, getLoanTeams, validateLineupPlayers, validateLineups, lockMatchLineup, mergeLineups, loadMatchLineups, getPlayerRewards, savePendingLineups, readPendingLineups, LINEUP_STORAGE_KEY } from '../match-lineups.js';

const json = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const players = preparePlayers(json('../assets/player-msl.json'));
const fixture = () => applyPublishedTeams(tournament, json('../assets/draft-team-msl.json'));
const timestamp = '2026-10-03T01:00:00.000Z';
function lock(data, config = emptyLineups(), id = 'm1') {
  const match = data.matches.find(m => m.id === id);
  return lockMatchLineup(data, config, id, data.teams.find(t => t.id === match.a).playerIds.slice(0,5), data.teams.find(t => t.id === match.b).playerIds.slice(0,5), timestamp);
}

test('lineup exports preserve earlier matches and cannot edit a locked match', () => {
  const data = fixture(), original = emptyLineups();
  const first = lock(data, original), second = lock(data, first, 'm2');
  assert.deepEqual(original, emptyLineups());
  assert.equal(first.matches.length, 1);
  assert.deepEqual(second.matches[0], first.matches[0]);
  assert.equal(second.matches.length, 2);
  assert.equal(second.matches[0].teamA, 'Airlangga');
  assert.equal(second.matches[0].teamB, 'Gajah Mada');
  assert.equal(second.matches[0].locked, true);
  assert.throws(() => lock(data, second), /terkunci/);
  assert.deepEqual(validateLineups(data, JSON.parse(JSON.stringify(second))), second);
});

test('lineups reject duplicate, wrong team, missing or extra players and stale identities', () => {
  const data = fixture(), valid = lock(data);
  for (const change of [
    c => { c.matches[0].playerIdsA.pop(); },
    c => { c.matches[0].playerIdsA.push(data.teams[0].playerIds[5]); },
    c => { c.matches[0].playerIdsA[0] = c.matches[0].playerIdsA[1]; },
    c => { c.matches[0].playerIdsA[0] = c.matches[0].playerIdsB[0]; },
    c => { c.matches[0].playerIdsA[0] = String(c.matches[0].playerIdsA[0]); },
    c => { c.matches[0].teamA = 'Sky'; },
    c => { c.matches[0].id = 'unknown'; },
    c => { c.matches[0].locked = false; },
    c => { c.matches[0].lockedAt = 'invalid'; },
    c => { c.matches.push(structuredClone(c.matches[0])); }
  ]) {
    const invalid = structuredClone(valid); change(invalid);
    assert.throws(() => validateLineups(data, invalid));
  }
});

test('all four BO3 outcomes reward exactly the selected five and exclude both benches', () => {
  for (const [score, expectedA, expectedB] of [[[2,0],28,5], [[2,1],19,12], [[1,2],12,19], [[0,2],5,28]]) {
    const data = fixture(); data.matches[0].score = score;
    const config = lock(data), rewards = getPlayerRewards(data, players, config);
    assert.equal(rewards.countedMatches, 1);
    assert.equal(rewards.totalDiamonds, 5 * (expectedA + expectedB));
    assert.equal(rewards.rows.filter(p => p.played === 1).length, 10);
    for (const [ids, diamonds] of [[config.matches[0].playerIdsA,expectedA],[config.matches[0].playerIdsB,expectedB]]) {
      ids.forEach(id => assert.equal(rewards.rows.find(p => p.id === id).diamonds, diamonds));
    }
    const starters = new Set([...config.matches[0].playerIdsA,...config.matches[0].playerIdsB]);
    rewards.rows.filter(p => !starters.has(p.id)).forEach(p => { assert.equal(p.played,0); assert.equal(p.diamonds,0); });
    const a = rewards.rows.find(p => p.id === config.matches[0].playerIdsA[0]);
    assert.equal(a.history[0].score, `${score[0]}–${score[1]}`);
  }
});

test('totals accumulate only completed published lineups; pending downloads and upcoming matches do not count', () => {
  const data = fixture(); data.matches[0].score = [2,0];
  const next = data.matches.find(m => m.id !== 'm1' && (m.a === data.matches[0].a || m.b === data.matches[0].a));
  next.score = next.a === data.matches[0].a ? [2,1] : [1,2];
  const pending = lock(data), published = lock(data, lock(data, pending, next.id), 'm2');
  const rewards = getPlayerRewards(data, players, published);
  const player = rewards.rows.find(p => p.id === pending.matches[0].playerIdsA[0]);
  assert.equal(player.diamonds,47); assert.equal(player.played,2); assert.equal(player.history.length,2);
  assert.equal(rewards.countedMatches,2);
  const withoutPublication = getPlayerRewards(data, players, emptyLineups());
  assert.equal(withoutPublication.totalDiamonds,0);
  assert.equal(withoutPublication.awaitingLineups,2);
  assert.equal(pending.matches.length,1);
  const incomplete = fixture();
  assert.equal(getPlayerRewards(incomplete, players, lock(incomplete)).totalDiamonds,0);
  incomplete.matches[0].score = [1,1];
  assert.throws(() => getPlayerRewards(incomplete,players,lock(incomplete)), /Skor/);
});

test('published lineup takes priority over pending exports; browser drafts reject a changed roster', () => {
  const data = fixture(), pending = lock(data), published = lock(data);
  published.matches[0].playerIdsA[0] = data.teams[0].playerIds[5];
  const merged = mergeLineups(data, lock(data,pending,'m2'), published);
  assert.deepEqual(merged.matches[0],published.matches[0]);
  assert.equal(merged.matches.length,2);
  const items = new Map(), storage = {getItem:key=>items.get(key),setItem:(key,value)=>items.set(key,value)};
  savePendingLineups(data,pending,storage);
  assert.ok(items.has(LINEUP_STORAGE_KEY));
  assert.deepEqual(readPendingLineups(data,storage),pending);
  const changed = structuredClone(data); changed.teams[0].name='Changed';
  assert.throws(() => readPendingLineups(changed,storage), /roster/);
});

test('initial 404 allows first export; unavailable or invalid sources cannot be mistaken for published data', async () => {
  const data = fixture(), config = lock(data);
  let options;
  const loaded = await loadMatchLineups(data,async (_url,settings)=>{options=settings;return new Response(JSON.stringify(config));});
  assert.equal(loaded.available,true); assert.deepEqual(loaded.config,config);
  assert.equal(options.cache,'no-store');
  const initial = await loadMatchLineups(data,async()=>new Response('',{status:404}));
  assert.equal(initial.initial,true); assert.equal(initial.available,true);
  for (const fetcher of [async()=>new Response('',{status:500}),async()=>{throw new Error('offline');},async()=>new Response('bad JSON'),async()=>new Response(JSON.stringify({version:1,matches:[{}]}))]) {
    const failure = await loadMatchLineups(data,fetcher);
    assert.equal(failure.available,false); assert.equal(failure.initial,false);
  }
});

test('three original players and two loans can lock; loan identities survive JSON export and legacy files remain valid', () => {
  const data=fixture(),match=data.matches[0],a=data.teams.find(t=>t.id===match.a),b=data.teams.find(t=>t.id===match.b);
  const donors=getLoanTeams(data,match),loans=[donors[0].playerIds[0],donors[1].playerIds[0]];
  const config=lockMatchLineup(data,emptyLineups(),match.id,[...a.playerIds.slice(0,3),...loans],b.playerIds.slice(0,5),timestamp);
  assert.deepEqual(config.matches[0].borrowedPlayerIdsA,loans);
  assert.deepEqual(config.matches[0].borrowedPlayerIdsB,[]);
  assert.deepEqual(validateLineups(data,JSON.parse(JSON.stringify(config))),config);
  const old=lock(data); delete old.matches[0].borrowedPlayerIdsA; delete old.matches[0].borrowedPlayerIdsB;
  assert.equal(validateLineups(data,old),old);
  assert.throws(()=>lockMatchLineup(data,config,match.id,a.playerIds.slice(0,5),b.playerIds.slice(0,5)),/terkunci/);
});

test('loans reject fewer than three originals, opponent players, unknown players and shared loans on both sides', () => {
  const data=fixture(),match=data.matches[0],a=data.teams.find(t=>t.id===match.a),b=data.teams.find(t=>t.id===match.b),donor=getLoanTeams(data,match)[0];
  assert.throws(()=>validateLineupPlayers(data,match,[...a.playerIds.slice(0,2),...donor.playerIds.slice(0,3)],b.playerIds.slice(0,5)),/minimal 3/);
  assert.throws(()=>validateLineupPlayers(data,match,[...a.playerIds.slice(0,4),b.playerIds[5]],b.playerIds.slice(0,5)),/selain lawan/);
  assert.throws(()=>validateLineupPlayers(data,match,[...a.playerIds.slice(0,4),999],b.playerIds.slice(0,5)),/selain lawan/);
  assert.throws(()=>validateLineupPlayers(data,match,[...a.playerIds.slice(0,4),donor.playerIds[0]],[...b.playerIds.slice(0,4),donor.playerIds[0]]),/duplikat/);
  assert.throws(()=>validateLineupPlayers(data,match,[...a.playerIds.slice(0,3),donor.playerIds[0]],b.playerIds.slice(0,5)),/tepat 5/);
});

test('a donor team playing at the same date and time is unavailable, while a different time is allowed', () => {
  const data=fixture(),match=data.matches[0],other=data.matches[1];
  const a=data.teams.find(t=>t.id===match.a),b=data.teams.find(t=>t.id===match.b),donor=data.teams.find(t=>t.id===other.a);
  other.date=match.date;other.time=match.time;
  assert.ok(!getLoanTeams(data,match).some(team=>team.id===donor.id));
  assert.throws(()=>validateLineupPlayers(data,match,[...a.playerIds.slice(0,4),donor.playerIds[0]],b.playerIds.slice(0,5)),/tidak bermain/);
  other.time='16:00';
  assert.ok(getLoanTeams(data,match).some(team=>team.id===donor.id));
  assert.deepEqual(validateLineupPlayers(data,match,[...a.playerIds.slice(0,4),donor.playerIds[0]],b.playerIds.slice(0,5)),[[donor.playerIds[0]],[]]);
});

test('reward follows the borrowed individual and playing team outcome, and accumulates with matches for their own team', () => {
  const data=fixture(),match=data.matches[0],a=data.teams.find(t=>t.id===match.a),b=data.teams.find(t=>t.id===match.b),donor=getLoanTeams(data,match)[0];
  match.score=[2,1];
  const loan=donor.playerIds[0],replaced=a.playerIds[4];
  let config=lockMatchLineup(data,emptyLineups(),match.id,[...a.playerIds.slice(0,4),loan],b.playerIds.slice(0,5),timestamp);
  let rewards=getPlayerRewards(data,players,config),row=rewards.rows.find(player=>player.id===loan);
  assert.equal(row.team,donor.name);assert.equal(row.diamonds,19);assert.equal(row.played,1);
  assert.equal(row.history[0].team,a.name);assert.equal(row.history[0].borrowed,true);
  assert.equal(rewards.rows.find(player=>player.id===replaced).diamonds,0);
  assert.equal(rewards.rows.find(player=>player.id===replaced).played,0);
  assert.equal(rewards.totalDiamonds,155);
  const ownMatch=data.matches.find(m=>m.id!==match.id&&(m.a===donor.id||m.b===donor.id));
  ownMatch.score=ownMatch.a===donor.id?[0,2]:[2,0];
  config=lock(data,config,ownMatch.id);
  rewards=getPlayerRewards(data,players,config);row=rewards.rows.find(player=>player.id===loan);
  assert.equal(row.diamonds,24);assert.equal(row.played,2);
  assert.deepEqual(row.history.map(record=>record.borrowed),[true,false]);
  assert.equal(rewards.totalDiamonds,320);
});

test('loan metadata must identify the actual borrowed players, without duplicates or originals', () => {
  const data=fixture(),match=data.matches[0],a=data.teams.find(t=>t.id===match.a),b=data.teams.find(t=>t.id===match.b),loan=getLoanTeams(data,match)[0].playerIds[0];
  const config=lockMatchLineup(data,emptyLineups(),match.id,[...a.playerIds.slice(0,4),loan],b.playerIds.slice(0,5),timestamp);
  for(const wrong of [[],[a.playerIds[0]],[loan,loan],[''+loan]]){
    const invalid=structuredClone(config);invalid.matches[0].borrowedPlayerIdsA=wrong;
    assert.throws(()=>validateLineups(data,invalid),/Catatan pemain pinjaman/);
  }
});
