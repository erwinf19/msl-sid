import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DATA_SOURCES, getDataSource, loadDataJSON } from '../data-sources.js';
import { loadAssets } from '../draft.js';
import { loadPublishedTeams } from '../published-teams.js';
import { publishedToDraft, draftPermissions } from '../draft-policy.js';

const json = async path => JSON.parse((await readFile(new URL(path, import.meta.url),'utf8')).replace(/^\uFEFF/,''));

test('sources support independent HTTPS URLs and retain local sources only when unconfigured', () => {
  assert.equal(getDataSource('players', {}), '/assets/player-msl.json');
  const urls = {players:'https://raw.githubusercontent.com/example/msl-data/main/player-msl.json'};
  assert.equal(getDataSource('players',urls),urls.players);
  assert.equal(getDataSource('teamRoster',urls),'/assets/draft-team-msl.json');
  for (const value of ['javascript:alert(1)','http://example.com/players.json','https://user:secret@example.com/players.json',42]) {
    assert.throws(()=>getDataSource('players',{players:value}));
  }
  assert.throws(()=>getDataSource('unknown'));
});

test('external JSON is read without browser caching and errors never switch back to local files', async () => {
  const urls={players:'https://example.com/player-msl.json'},calls=[];
  const fetcher=async (url,options)=>{
    calls.push(url);
    assert.equal(options.cache,'no-store');
    return {ok:true,json:async()=>[{username:'updated'}]};
  };
  assert.deepEqual(await loadDataJSON('players',fetcher,urls),[{username:'updated'}]);
  assert.deepEqual(calls,[urls.players]);
  await assert.rejects(loadDataJSON('players',async()=>({ok:false}),urls),/belum dapat dimuat/);
  await assert.rejects(loadDataJSON('players',async()=>{throw new Error('CORS/network');},urls),/CORS\/network/);
  await assert.rejects(loadDataJSON('players',async()=>({ok:true,json:async()=>{throw new SyntaxError('bad JSON');}}),urls),/bad JSON/);
});

test('Player Data and locked published rosters share external profiles without changing membership', async t => {
  const source=await json('../assets/player-msl.json');
  const published=await json('../assets/draft-team-msl.json');
  const files=await json('../assets/logo-team.json');
  const original=structuredClone(published),oldUrl=DATA_SOURCES.players;
  DATA_SOURCES.players='https://example.com/player-msl.json';
  t.after(()=>{DATA_SOURCES.players=oldUrl;});
  source[0].businessUnit='FU - Updated';source[0].telegram='@newcontact';
  const calls=[];
  const fetcher=async (url,options)=>{
    calls.push(url);
    assert.equal(options.cache,'no-store');
    if (url===DATA_SOURCES.players) return {ok:true,json:async()=>source};
    if (url==='/assets/logo-team.json') return {ok:true,json:async()=>files};
    if (url==='/assets/draft-team-msl.json') return {ok:true,json:async()=>published};
    throw new Error(`Unexpected URL ${url}`);
  };
  const {players,logos}=await loadAssets(fetcher);
  assert.equal(players[0].businessUnit,'FU - Updated');
  const loaded=await loadPublishedTeams(players,logos,fetcher);
  const profile=loaded.teams.flatMap(t=>t.players).find(p=>p.id===0);
  assert.equal(profile.telegram,'@newcontact');
  assert.equal(profile.businessUnit,'FU - Updated');
  assert.deepEqual(loaded.teams.map(t=>[t.id,t.name,t.players.map(p=>p.id)]),published.teams.map(t=>[t.id,t.name,t.players.map(p=>p.id)]));
  assert.deepEqual(published,original);
  const permissions=draftPermissions(publishedToDraft(loaded),loaded);
  assert.equal(permissions.canGenerate,false);
  assert.equal(permissions.canReset,false);
  assert.ok(calls.includes(DATA_SOURCES.players));
  assert.ok(!calls.includes('/assets/player-msl.json'));
  players[0].username='changed locked identity';
  await assert.rejects(loadPublishedTeams(players,logos,fetcher),/File team tidak valid/);
  await assert.rejects(loadAssets(async url=>({ok:true,json:async()=>url===DATA_SOURCES.players ? source.slice(1) : files})),/harus memiliki/);
});
