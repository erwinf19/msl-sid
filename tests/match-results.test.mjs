import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tournament } from '../tournament-data.js';
import { applyPublishedTeams } from '../published-teams.js';
import { getStandings, validateTournament } from '../league.js';
import { applyMatchResults, loadMatchResults, MATCH_RESULTS_PATH } from '../match-results.js';
import { applyMatchStreams } from '../match-streams.js';
import { renderMatchCard } from '../schedule-view.js';
import { matchBroadcast } from '../match-actions.js';

const json = async path => JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const published = await json('../assets/draft-team-msl.json');
const source = applyPublishedTeams(tournament,published);
const config = await json('../assets/match-results.json');
const blankResults = () => ({...structuredClone(config),matches:config.matches.map(m=>({...m,score:null}))});

test('all 28 JSON results match the official roster and schedule', () => {
  assert.equal(config.matches.length,28);
  const loaded = applyMatchResults(source,config);
  validateTournament(loaded);
  assert.deepEqual(loaded.teams,source.teams);
  for (const entry of config.matches) {
    const match=loaded.matches.find(m=>m.id===entry.id);
    assert.deepEqual(match.score,entry.score);
    assert.equal(entry.teamA,loaded.teams.find(t=>t.id===match.a).name);
    assert.equal(entry.teamB,loaded.teams.find(t=>t.id===match.b).name);
  }
});

test('scores follow match IDs, update standings and broadcasts, and leave locked rosters intact', async () => {
  const results=blankResults();
  results.matches[0].score=[2,1];
  results.matches[1].score=[0,2];
  results.matches.reverse();
  const before=structuredClone(source);
  const loaded=applyMatchResults(source,results);
  assert.deepEqual(loaded.matches[0].score,[2,1]);
  assert.deepEqual(loaded.matches[1].score,[0,2]);
  assert.deepEqual(source,before);
  assert.deepEqual(loaded.teams,source.teams);
  const rows=getStandings(loaded),winner=rows.find(t=>t.id===loaded.matches[0].a),loser=rows.find(t=>t.id===loaded.matches[0].b);
  assert.deepEqual([winner.wins,winner.losses,winner.gameWins,winner.gameLosses,winner.points,winner.net],[1,0,2,1,1,1]);
  assert.deepEqual([loser.wins,loser.losses,loser.gameWins,loser.gameLosses,loser.points,loser.net],[0,1,1,2,0,-1]);
  assert.equal(rows.reduce((sum,t)=>sum+t.wins,0),2);
  assert.equal(rows.reduce((sum,t)=>sum+t.net,0),0);
  assert.match(matchBroadcast(loaded,loaded.matches[0],'https://msl-sid.netlify.app'),/Skor akhir: Airlangga 2–1 Gajah Mada/);
  const streams=await json('../assets/match-streams.json');
  streams.matches[0].streamUrl='https://youtu.be/finished-match';
  const combined=applyMatchStreams(loaded,streams);
  assert.deepEqual(combined.matches[0].score,[2,1]);
  const card=renderMatchCard(combined,combined.matches[0]);
  assert.match(card,/Tonton Siaran/);
  assert.match(card,/match-completed/);
  assert.match(card,/19<\/strong>/);
  assert.match(card,/12<\/strong>/);
  assert.equal(published.finalized,true);
  assert.equal(published.locked,true);
});

test('invalid BO3 scores and incomplete, duplicate or mismatched match entries are rejected', () => {
  for (const score of [undefined,'2-0',[1,0],[2,2],[3,0],[-1,2],[2,0,0],[2,'0']]) {
    const value=blankResults();value.matches[0].score=score;
    assert.throws(()=>applyMatchResults(source,value),/Skor m1 tidak valid/);
  }
  for (const change of [
    value=>{value.matches.pop();},
    value=>{value.matches.push(value.matches[0]);},
    value=>{value.matches[0].id='m999';},
    value=>{value.matches[0].teamA='Wrong team';},
    value=>{value.matches[0].date='2027-01-01';},
    value=>{value.matches[0].week=2;},
    value=>{value.version=2;}
  ]) {
    const value=blankResults();change(value);
    assert.throws(()=>applyMatchResults(source,value));
  }
});

test('JSON loading uses fresh data and fails visibly instead of resetting scores on errors', async () => {
  const loaded=await loadMatchResults(source,async (path,options)=>{
    assert.equal(path,MATCH_RESULTS_PATH);
    assert.equal(options.cache,'no-store');
    return {ok:true,json:async()=>config};
  });
  assert.equal(loaded.matches.length,28);
  await assert.rejects(loadMatchResults(source,async()=>({ok:false})),/belum dapat dimuat/);
  await assert.rejects(loadMatchResults(source,async()=>({ok:true,json:async()=>{throw new SyntaxError('invalid JSON');}})),/invalid JSON/);
});
