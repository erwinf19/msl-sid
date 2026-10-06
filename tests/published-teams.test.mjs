import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pbkdf2Sync } from 'node:crypto';
import { preparePlayers, createDraft, generateRole, chooseName, lockDraft, ROLES } from '../draft.js';
import { canExportDraft, exportDraft, validatePublishedTeams, applyPublishedTeams, DOWNLOAD_FILENAME } from '../published-teams.js';
import { verifyDownloadPassword, DOWNLOAD_LOCK } from '../download-password.js';
import { tournament } from '../tournament-data.js';
import { validateTournament, getStandings } from '../league.js';
import { ALLOW_FINAL_TEAM_CHANGES, draftPermissions, publishedToDraft } from '../draft-policy.js';

const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const players = preparePlayers(json('../assets/player-msl.json'));
const logos = json('../assets/logo-team.json').map(file => ({ name: file.replace(/\.[^.]+$/, ''), src: `assets/logo-team/${encodeURIComponent(file)}` }));
const names = logos.map(l => l.name);
function completeDraft() {
  let draft = createDraft();
  for (const role of ROLES) draft = generateRole(draft, players);
  return draft;
}
function namedDraft() {
  let draft = completeDraft();
  for (let i = 0; i < 8; i++) draft = chooseName(draft, i, names[i], names);
  return draft;
}

test('export stays locked until every role and every team identity is complete', () => {
  let draft = createDraft();
  assert.equal(canExportDraft(draft, players, logos), false);
  draft = completeDraft();
  for (let i = 0; i < 8; i++) {
    assert.equal(canExportDraft(draft, players, logos), false);
    assert.throws(() => exportDraft(draft, players, logos));
    draft = chooseName(draft, i, names[i], names);
  }
  assert.equal(canExportDraft(draft, players, logos), true);
  assert.throws(() => exportDraft(draft, players, logos));
  const bad = structuredClone(draft);
  bad.teams[7].name = bad.teams[0].name;
  assert.equal(canExportDraft(bad, players, logos), false);
});

test('downloaded JSON round-trips into homepage rosters, logos, standings and schedule', () => {
  const draft = lockDraft(namedDraft(), players, names);
  const value = JSON.parse(JSON.stringify(exportDraft(draft, players, logos)));
  assert.equal(DOWNLOAD_FILENAME, 'draft-team-msl.json');
  assert.ok(validatePublishedTeams(value, players, logos));
  assert.equal(value.teams.flatMap(t => t.players).length, 45);
  const data = applyPublishedTeams(tournament, value);
  validateTournament(data);
  assert.equal(data.teams.length, 8);
  assert.equal(data.teams[0].name, names[0]);
  assert.equal(data.teams[0].logo, logos[0].src);
  assert.equal(data.teams.reduce((sum, t) => sum + t.players.length, 0), 45);
  assert.ok(getStandings(data).every(row => row.points === 0));
  assert.ok(data.matches.every(m => !m.previewScore));
  const scored = structuredClone(tournament);
  scored.matches[0].score = [2, 1];
  const updated = applyPublishedTeams(scored, value);
  assert.deepEqual(updated.matches[0].score, [2, 1]);
  assert.equal(updated.matches[0].a, tournament.matches[0].a);
});

test('newly registered players can wait outside the existing locked roster without invalidating it', () => {
  const published=json('../assets/draft-team-msl.json');
  published.teams.forEach(team=>{team.players=team.players.filter(player=>player.id<42);});
  const officialLogos=json('../assets/logo-team.json').map(file=>({name:file.replace(/\.[^.]+$/,''),src:`/assets/logo-team/${encodeURIComponent(file)}`}));
  const before=structuredClone(published);
  assert.ok(validatePublishedTeams(published,players,officialLogos));
  const draft=publishedToDraft(published);
  const assigned=new Set(draft.teams.flatMap(t=>t.players));
  assert.equal(assigned.size,42);
  assert.deepEqual(players.filter(p=>!assigned.has(p.id)).map(p=>[p.id,p.username,p.role]),[[42,'BakpaoCoklat','Goldlaner'],[43,'arl17','Explaner'],[44,'Cor@Zon','Jungler']]);
  assert.equal(draftPermissions(draft,published).canGenerate,false);
  assert.equal(draftPermissions(draft,published).canReset,false);
  assert.equal(canExportDraft(draft,players,officialLogos),false);
  assert.throws(()=>lockDraft(draft,players,officialLogos.map(l=>l.name)));
  assert.deepEqual(published,before);
  for (const change of [
    value=>{value.teams[0].players.pop();},
    value=>{value.teams[1].players.push(value.teams[0].players[0]);},
    value=>{value.teams[0].players[0].id=999;},
    value=>{value.teams[0].players[0].role='Goldlaner';}
  ]) {
    const invalid=structuredClone(published);change(invalid);
    assert.equal(validatePublishedTeams(invalid,players,officialLogos),false);
  }
});

test('the finalized roster includes additional players in separate teams with at most six players', () => {
  const published=json('../assets/draft-team-msl.json');
  const officialLogos=json('../assets/logo-team.json').map(file=>({name:file.replace(/\.[^.]+$/,''),src:`/assets/logo-team/${encodeURIComponent(file)}`}));
  assert.ok(validatePublishedTeams(published,players,officialLogos));
  assert.equal(published.finalized,true);
  assert.equal(published.locked,true);
  const assigned=published.teams.flatMap(team=>team.players.map(player=>player.id));
  assert.equal(assigned.length,45);
  assert.equal(new Set(assigned).size,45);
  assert.ok(published.teams.every(team=>team.players.length>=5&&team.players.length<=6));
  const goldTeam=published.teams.find(team=>team.players.some(player=>player.id===42));
  const expTeam=published.teams.find(team=>team.players.some(player=>player.id===43));
  const jungleTeam=published.teams.find(team=>team.players.some(player=>player.id===44));
  assert.equal(goldTeam.name,'Batavia');
  assert.equal(expTeam.name,'Gajah Mada');
  assert.equal(jungleTeam.name,'Sadewa');
  assert.equal(jungleTeam.players.length,6);
  assert.equal(jungleTeam.players.find(player=>player.id===44).role,'Jungler');
  assert.notEqual(goldTeam.id,expTeam.id);
  assert.equal(goldTeam.players.find(player=>player.id===42).role,'Goldlaner');
  assert.equal(expTeam.players.find(player=>player.id===43).role,'Explaner');
  const draft=publishedToDraft(published);
  assert.equal(canExportDraft(draft,players,officialLogos),true);
  assert.equal(draftPermissions(draft,published).canReset,false);
});

test('adding Cor@Zon preserves the previous 44-player roster and its finalized flags', () => {
  const published=json('../assets/draft-team-msl.json'),previous=structuredClone(published);
  previous.teams.forEach(team=>{team.players=team.players.filter(player=>player.id!==44);});
  const officialLogos=json('../assets/logo-team.json').map(file=>({name:file.replace(/\.[^.]+$/,''),src:`/assets/logo-team/${encodeURIComponent(file)}`}));
  assert.ok(validatePublishedTeams(previous,players.slice(0,44),officialLogos));
  assert.equal(previous.teams.find(team=>team.name==='Sadewa').players.length,5);
  assert.equal(previous.teams.flatMap(team=>team.players).length,44);
  assert.deepEqual(previous.teams.map(team=>[team.name,team.players.map(player=>player.id)]),[
    ['Airlangga',[1,13,16,29,34,33]],['Kalingga',[2,10,23,24,37]],
    ['Samudera',[7,15,21,31,30,38]],['Padjadjaran',[6,9,18,27,40]],
    ['Batavia',[5,14,20,28,36,42]],['Warmadewa',[4,12,22,32,35]],
    ['Sadewa',[0,11,17,25,39]],['Gajah Mada',[3,8,19,26,41,43]]
  ]);
  assert.equal(published.finalized,true);assert.equal(published.locked,true);
  assert.equal(published.generatedAt,'2026-10-02T09:33:02.186Z');
  assert.equal(published.teams.find(team=>team.name==='Sadewa').players.filter(player=>player.role==='Jungler').length,2);
});

test('empty published file shows eight waiting slots and rejects partial/invalid publications', () => {
  const empty = { version: 1, finalized: false, generatedAt: null, teams: createDraft().teams.map(t => ({ ...t, logo: null })) };
  assert.ok(validatePublishedTeams(empty, players, logos));
  const data = applyPublishedTeams(tournament, empty);
  validateTournament(data);
  assert.equal(data.teams.length, 8);
  assert.ok(data.teams.every(t => t.players.length === 0 && t.pendingRoster));
  for (const change of [v => { v.teams[0].players[0].role = 'Roamer'; }, v => { v.teams[0].logo = 'https://example.com/logo.png'; }, v => { v.teams[0].players[0].username = 'changed'; }, v => { v.teams[0].players.push(v.teams[1].players[0]); }, v => { v.teams[0] = null; }]) {
    const value = exportDraft(lockDraft(namedDraft(), players, names), players, logos);
    change(value);
    assert.equal(validatePublishedTeams(value, players, logos), false);
  }
});

test('new exports include profiles, old exports remain valid, and altered profile contacts are rejected', () => {
  const value = exportDraft(lockDraft(namedDraft(),players,names),players,logos);
  assert.ok(value.teams.flatMap(t=>t.players).every(p=>p.businessUnit&&p.jobTitle&&p.telegram&&p.email));
  const old = structuredClone(value);
  old.teams.forEach(team=>team.players.forEach(p=>{delete p.businessUnit;delete p.jobTitle;delete p.telegram;delete p.email;}));
  assert.ok(validatePublishedTeams(old,players,logos));
  value.teams[0].players[0].telegram = '@wrongcontact';
  assert.equal(validatePublishedTeams(value,players,logos),false);
  const wrongEmail = structuredClone(old);
  wrongEmail.teams[0].players[0].email='wrong@example.com';
  assert.equal(validatePublishedTeams(wrongEmail,players,logos),false);
});

test('password verification accepts the matching PBKDF2 value and rejects wrong passwords', async () => {
  const configuration = { ...DOWNLOAD_LOCK, digest: pbkdf2Sync('test-password-only', Buffer.from(DOWNLOAD_LOCK.salt, 'hex'), DOWNLOAD_LOCK.iterations, 32, 'sha256').toString('hex') };
  assert.equal(await verifyDownloadPassword('test-password-only', configuration), true);
  assert.equal(await verifyDownloadPassword('incorrect-password', configuration), false);
  assert.equal(await verifyDownloadPassword(''), false);
  assert.equal(await verifyDownloadPassword('x'.repeat(257)), false);
});

test('completed drafts can reset and rename until the explicit lock action', () => {
  assert.equal(ALLOW_FINAL_TEAM_CHANGES, false);
  const draft = completeDraft();
  let policy = draftPermissions(draft, null);
  assert.equal(policy.canGenerate, false);
  assert.equal(policy.canReset, true);
  assert.equal(policy.rosterLocked, false);
  assert.equal(policy.canChooseName(draft.teams[0]), true);
  const named = chooseName(draft, 0, names[0], names);
  policy = draftPermissions(named, null);
  assert.equal(policy.canChooseName(named.teams[0]), true);
  assert.equal(policy.canChooseName(named.teams[1]), true);
  assert.equal(chooseName(named, 0, names[1], names).teams[0].name, names[1]);
  assert.throws(() => lockDraft(named, players, names));
  const allNamed = namedDraft();
  assert.equal(draftPermissions(allNamed, null).canReset, true);
  assert.equal(draftPermissions(allNamed, null).locked, false);
});

test('final data stays locked after JSON round-trip and requires the code maintenance flag', () => {
  const draft = lockDraft(namedDraft(), players, names);
  assert.equal(draftPermissions(draft, null).locked, true);
  const file = JSON.parse(JSON.stringify(exportDraft(draft, players, logos)));
  assert.equal(file.locked, true);
  assert.ok(validatePublishedTeams(file, players, logos));
  const restored = publishedToDraft(file);
  assert.deepEqual(restored, draft);
  const policy = draftPermissions(restored, file);
  assert.equal(policy.locked, true);
  assert.equal(policy.canReset, false);
  assert.equal(policy.canGenerate, false);
  assert.ok(restored.teams.every(t => !policy.canChooseName(t)));
  const maintenance = draftPermissions(restored, file, true);
  assert.equal(maintenance.locked, false);
  assert.equal(maintenance.canReset, true);
  assert.ok(restored.teams.every(t => maintenance.canChooseName(t)));
  const legacy = structuredClone(file);
  delete legacy.locked;
  assert.ok(validatePublishedTeams(legacy, players, logos));
  assert.equal(draftPermissions(publishedToDraft(legacy), legacy).locked, true);
});
