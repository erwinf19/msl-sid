import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ROLES, PLAYER_PROFILE_FIELDS, preparePlayers, createDraft, generateRole, validateDraft, chooseName, lockDraft, readDraft, saveDraft } from '../draft.js';

const source = JSON.parse(readFileSync(new URL('../assets/player-msl.json', import.meta.url), 'utf8'));
const players = preparePlayers(source);
const files = JSON.parse(readFileSync(new URL('../assets/logo-team.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const names = files.map(file => file.replace(/\.[^.]+$/, ''));

test('all 45 player profiles include the supplied organization, position and Telegram handle', () => {
  assert.equal(players.length,45);
  for (const player of players) {
    assert.ok(PLAYER_PROFILE_FIELDS.every(field => typeof player[field] === 'string' && player[field].trim()));
    assert.match(player.businessUnit,/^(BU|FU) - /);
    assert.match(player.telegram,/^@[a-z0-9_]{5,32}$/i);
  }
  const fikri = players.find(p => p.playername === 'Muhammad Fikri Adriansyah');
  assert.deepEqual([fikri.businessUnit,fikri.jobTitle,fikri.telegram],['BU - Sekolah Murid Merdeka','Admission Officer','@Fikri_Adri']);
  assert.equal(players.find(p => p.playername === 'Suci Amelia').telegram,'@Sameli4');
  assert.equal(players.find(p => p.playername === 'Bana Hasnul Fata').businessUnit,'FU - Learning Spaces Development');
  assert.deepEqual(players.slice(-3).map(p=>[p.id,p.playername,p.username,p.role,p.businessUnit,p.telegram]),[
    [42,'Furqon Ahmad Taher','BakpaoCoklat','Goldlaner','FU - Technology','@frqnahmdt24'],
    [43,'Amrul Fikri','arl17','Explaner','BU - Kampus','@amrulfikri'],
    [44,'Rachmat Basuki','Cor@Zon','Jungler','BU - Sekolah Murid Merdeka','@amatingat']
  ]);
  assert.throws(() => preparePlayers(source.map((p,i)=>i ? p : {...p,telegram:'javascript:bad'})));
});

test('profile updates preserve legacy saved drafts while actual player identity changes still invalidate them', () => {
  const legacyPlayers = players.map(({id,playername,username,role})=>({id,playername,username,role}));
  const draft = generateRole(createDraft(),players);
  let stored = JSON.stringify({signature:JSON.stringify(legacyPlayers),draft});
  const storage = {getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
  assert.deepEqual(readDraft(players,names,storage),draft);
  saveDraft(draft,players,storage);
  const updated = players.map(p=>({...p,businessUnit:'FU - Updated',jobTitle:'Updated position',telegram:'@newhandle'}));
  assert.deepEqual(readDraft(updated,names,storage),draft);
  const renamed = players.map((p,i)=>i ? p : {...p,username:'Changed identity'});
  assert.throws(()=>readDraft(renamed,names,storage));
});

test('every supplied logo is offered using its filename as the identity', () => {
  assert.deepEqual([...files].sort(), readdirSync(new URL('../assets/logo-team/', import.meta.url)).sort());
  assert.equal(new Set(names).size, names.length);
});

test('45 players are allocated once, in role order, with five different teams receiving surplus players', () => {
  for (let run = 0; run < 200; run++) {
    let draft = createDraft();
    assert.ok(validateDraft(draft, players, names));
    for (const [step, role] of ROLES.entries()) {
      const previous = structuredClone(draft);
      draft = generateRole(draft, players);
      assert.equal(draft.step, step + 1);
      assert.ok(validateDraft(draft, players, names));
      for (const team of draft.teams) {
        assert.ok(previous.teams[team.id].players.every(id => team.players.includes(id)));
        assert.ok(team.players.some(id => players[id].role === role));
      }
    }
    const ids = draft.teams.flatMap(t => t.players);
    assert.equal(ids.length, 45);
    assert.equal(new Set(ids).size, 45);
    assert.deepEqual(draft.teams.map(t => t.players.length).sort(), [5, 5, 5, 6, 6, 6, 6, 6]);
    const extraTeams=ROLES.map(role=>draft.teams.find(t=>t.players.filter(id=>players[id].role===role).length===2)?.id);
    assert.ok(extraTeams.every(id=>id!==undefined));
    assert.equal(new Set(extraTeams).size,5);
    assert.throws(() => generateRole(draft, players));
  }
});

test('surplus players respect the total capacity of eight teams with at most six players', () => {
  const extra = Array.from({length:48-source.length},(_,i)=>({...source[0],playername:`Extra ${i}`,username:`Extra ${i}`,role:'Goldlaner'}));
  const full=preparePlayers([...source,...extra]);
  let draft=createDraft();
  for (const role of ROLES) draft=generateRole(draft,full);
  assert.ok(validateDraft(draft,full,names));
  assert.ok(draft.teams.every(t=>t.players.length===6));
  assert.throws(()=>preparePlayers([...source,...extra,{...source[0],playername:'Over capacity',username:'Over capacity'}]),/kapasitas/);
});

test('team identities unlock after the final draw and cannot be shared', () => {
  let draft = createDraft();
  assert.throws(() => chooseName(draft, 0, names[0], names));
  for (const role of ROLES) draft = generateRole(draft, players);
  draft = chooseName(draft, 0, names[0], names);
  assert.throws(() => chooseName(draft, 1, names[0], names));
  draft = chooseName(draft, 0, names[1], names);
  draft = chooseName(draft, 1, names[0], names);
  assert.ok(validateDraft(draft, players, names));
  assert.throws(() => chooseName(draft, 1, 'Unknown', names));
  for (let i = 2; i < 8; i++) draft = chooseName(draft, i, names[i], names);
  draft = lockDraft(draft, players, names);
  assert.throws(() => chooseName(draft, 0, names[8], names));
});

test('invalid source and corrupted saved rosters are rejected', () => {
  assert.throws(() => preparePlayers([...source.filter(p=>p.role!=='Jungler'),...source.filter(p=>p.role==='Jungler').slice(0,7)]));
  assert.throws(() => preparePlayers([...source, source[0]]));
  assert.throws(() => preparePlayers([{ ...source[0], role: 'Unknown' }, ...source.slice(1)]));
  let draft = createDraft();
  for (const role of ROLES) draft = generateRole(draft, players);
  const duplicated = structuredClone(draft);
  duplicated.teams[0].players[0] = duplicated.teams[1].players[0];
  assert.equal(validateDraft(duplicated, players, names), false);
  const incomplete = structuredClone(draft);
  incomplete.teams[0].players.pop();
  assert.equal(validateDraft(incomplete, players, names), false);
  const invalidRole = structuredClone(draft);
  invalidRole.step = 1;
  assert.equal(validateDraft(invalidRole, players, names), false);
  assert.ok(validateDraft(JSON.parse(JSON.stringify(draft)), players, names));
});
