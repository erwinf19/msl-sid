import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tournament as baseTournament } from '../tournament-data.js';
import { applyPublishedTeams } from '../published-teams.js';
import { applyMatchStreams, loadMatchStreams, getStreamUrl, MATCH_STREAMS_PATH } from '../match-streams.js';
import { renderMatchCard } from '../schedule-view.js';

const config = JSON.parse(await readFile(new URL('../assets/match-streams.json', import.meta.url),'utf8'));
const published = JSON.parse(await readFile(new URL('../assets/draft-team-msl.json', import.meta.url),'utf8'));
const tournament = applyPublishedTeams(baseTournament, published);

test('official team IDs and names are consistent in standings, results and stream JSON', async () => {
  const results=JSON.parse(await readFile(new URL('../assets/match-results.json',import.meta.url),'utf8'));
  assert.deepEqual(tournament.teams.map(t=>t.id),published.teams.map(t=>t.name.toLowerCase().replace(/\s+/g,'-')));
  for (const entry of config.matches) {
    const result=results.matches.find(m=>m.id===entry.id);
    assert.deepEqual([entry.teamA,entry.teamB,entry.date,entry.week],[result.teamA,result.teamB,result.date,result.week]);
  }
  const {getStandings}=await import('../league.js');
  const scored=structuredClone(tournament);scored.matches[0].score=[2,1];
  const rows=getStandings(scored);
  const airlangga=rows.find(t=>t.id==='airlangga'),gajahMada=rows.find(t=>t.id==='gajah-mada');
  assert.deepEqual([airlangga.name,airlangga.wins,gajahMada.name,gajahMada.losses],['Airlangga',1,'Gajah Mada',1]);
  assert.equal(published.locked,true);
  assert.deepEqual(scored.teams.map(t=>t.players),tournament.teams.map(t=>t.players));
});

test('all 28 stream entries identify the correct match, and links follow IDs rather than row order', () => {
  assert.equal(config.matches.length,28);
  assert.equal(new Set(config.matches.map(match => match.id)).size,28);
  for (const entry of config.matches) {
    const match=tournament.matches.find(m=>m.id===entry.id);
    assert.equal(entry.teamA,tournament.teams.find(t=>t.id===match.a).name);
    assert.equal(entry.teamB,tournament.teams.find(t=>t.id===match.b).name);
  }
  const source = structuredClone(config);
  source.matches[0].streamUrl = 'https://www.youtube.com/watch?v=match-one';
  source.matches[1].streamUrl = 'https://www.youtube.com/watch?v=match-two';
  source.matches.reverse();
  const data = applyMatchStreams(tournament,source);
  assert.equal(data.matches[0].streamUrl,'https://www.youtube.com/watch?v=match-one');
  assert.equal(data.matches[1].streamUrl,'https://www.youtube.com/watch?v=match-two');
  assert.ok(data.matches.slice(2).every(match => match.streamUrl === ''));
  assert.equal(tournament.matches[0].streamUrl,undefined);
  assert.deepEqual(data.teams,tournament.teams);
  assert.deepEqual(data.matches.map(({streamUrl,...match}) => match),tournament.matches);
});

test('unknown or duplicate matches, mismatched dates and unsafe stream URLs are rejected', () => {
  for (const value of ['javascript:alert(1)','data:text/html,hello','/relative-url','https://user:password@example.com/','not a URL']) assert.equal(getStreamUrl(value),null);
  assert.equal(getStreamUrl('  https://youtu.be/abc  '),'https://youtu.be/abc');
  for (const change of [
    source => { source.matches[0].id = 'm999'; },
    source => { source.matches.push(source.matches[0]); },
    source => { source.matches[0].date = '2027-01-01'; },
    source => { source.matches[0].teamA = 'Wrong team'; },
    source => { [source.matches[0].teamA,source.matches[0].teamB] = [source.matches[0].teamB,source.matches[0].teamA]; },
    source => { source.matches[0].streamUrl = 'javascript:alert(1)'; },
    source => { source.matches[0].streamUrl = 123; }
  ]) {
    const source=structuredClone(config); change(source);
    assert.throws(()=>applyMatchStreams(tournament,source));
  }
});

test('match cards show a pending state without a link and safe watch buttons for scheduled and completed matches', () => {
  const match={...tournament.matches[0]};
  for (const value of [undefined,'','javascript:alert(1)']) {
    match.streamUrl=value;
    const card=renderMatchCard(tournament,match);
    assert.match(card,/data-stream-state="pending"/);
    assert.match(card,/Belum tersedia/);
    assert.doesNotMatch(card,/<a class="stream-button"/);
  }
  match.streamUrl='https://www.youtube.com/watch?v=123&feature=share';
  const card=renderMatchCard(tournament,match);
  assert.match(card,/href="https:\/\/www.youtube.com\/watch\?v=123&amp;feature=share"/);
  assert.match(card,/target="_blank" rel="noopener noreferrer"/);
  assert.match(card,/Tonton Live/);
  assert.match(card,/data-match-id="m1"/);
  match.score=[2,0];
  const completed=renderMatchCard(tournament,match);
  assert.match(completed,/Tonton Siaran/);
  assert.match(completed,/match-rewards/);
});

test('both pages load the same JSON; unavailable stream data keeps the schedule usable', async t => {
  const loaded=await loadMatchStreams(tournament, async (path,options) => {
    assert.equal(path,MATCH_STREAMS_PATH);
    assert.equal(options.cache,'no-store');
    return {ok:true,json:async()=>config};
  });
  assert.ok(loaded.matches.every(match=>match.streamUrl === ''));
  t.mock.method(console,'warn',()=>{});
  assert.equal(await loadMatchStreams(tournament,async()=>({ok:false})),tournament);
  assert.equal(await loadMatchStreams(tournament,async()=>{throw new Error('offline');}),tournament);
});
