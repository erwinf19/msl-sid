import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tournament } from '../tournament-data.js';
import { preparePlayers } from '../draft.js';
import { applyPublishedTeams } from '../published-teams.js';
import { emptyLineups, lockMatchLineup } from '../match-lineups.js';
import { getCalendarInvite, renderCalendarInvite, MATCH_MEET_URL, MATCH_INVITE_EMAIL, CALENDAR_DURATION_MINUTES } from '../match-calendar.js';

const json = file => JSON.parse(readFileSync(new URL(file, import.meta.url),'utf8'));
const players = preparePlayers(json('../assets/player-msl.json'));
// Local previews must still produce production links in outgoing invitations.
const origin = 'http://127.0.0.1:4173';
function fixture(loans = false) {
  const data = applyPublishedTeams(tournament,json('../assets/draft-team-msl.json'));
  const match = data.matches[0], a = data.teams.find(t=>t.id===match.a), b = data.teams.find(t=>t.id===match.b);
  const idsA = loans ? [...a.playerIds.slice(0,3), ...data.teams.find(t=>t.name==='Kalingga').playerIds.slice(0,2)] : a.playerIds.slice(0,5);
  data.lineupConfig = lockMatchLineup(data,emptyLineups(),match.id,idsA,b.playerIds.slice(0,5));
  data.lineupAvailable = true;
  return {data,match};
}

test('Calendar drafts use exactly the locked lineup, Jakarta start time, fixed Meet and match context', () => {
  const {data,match} = fixture();
  const before = structuredClone(data);
  const invite = getCalendarInvite(data,match,players,origin), url = new URL(invite.url);
  const entry = data.lineupConfig.matches[0], ids = [...entry.playerIdsA,...entry.playerIdsB];
  assert.equal(url.origin,'https://calendar.google.com');
  assert.equal(url.searchParams.get('action'),'TEMPLATE');
  assert.equal(url.searchParams.get('ctz'),'Asia/Jakarta');
  assert.equal(invite.start.toISOString(),'2026-10-06T05:15:00.000Z');
  assert.equal(invite.end-invite.start,CALENDAR_DURATION_MINUTES*60000);
  assert.equal(url.searchParams.get('dates'),'20261006T051500Z/20261006T060000Z');
  assert.equal(url.searchParams.get('location'),MATCH_MEET_URL);
  assert.match(url.searchParams.get('text'),/MLBB SESI LEAGUE · Airlangga vs Gajah Mada/);
  assert.deepEqual(invite.guests,[...ids.map(id=>players[id].email), MATCH_INVITE_EMAIL]);
  assert.equal(invite.guests.length,11);
  const bench = data.teams.filter(t=>[match.a,match.b].includes(t.id)).flatMap(t=>t.playerIds).filter(id=>!ids.includes(id));
  bench.forEach(id=>assert.ok(!invite.guests.includes(players[id].email)));
  const description=url.searchParams.get('details');
  assert.match(description,/breakout room/);
  assert.ok(description.includes('https://msl-sesi.netlify.app/full-schedule#match-m1'));
  assert.ok(!description.includes(origin));
  const matchTwoDescription = new URL(getCalendarInvite(data,data.matches[1],players,origin).url).searchParams.get('details');
  assert.ok(matchTwoDescription.includes('https://msl-sesi.netlify.app/full-schedule#match-m2'));
  assert.ok(!matchTwoDescription.includes('127.0.0.1'));
  assert.ok(description.includes(MATCH_MEET_URL));
  assert.deepEqual(data,before);
});

test('Calendar guests include loan players rather than the benched home-team players', () => {
  const {data,match}=fixture(true), invite=getCalendarInvite(data,match,players,origin);
  const entry=data.lineupConfig.matches[0];
  assert.equal(entry.borrowedPlayerIdsA.length,2);
  entry.borrowedPlayerIdsA.forEach(id=>assert.ok(invite.guests.includes(players[id].email)));
  assert.match(new URL(invite.url).searchParams.get('details'),/pinjaman dari Kalingga/);
});

test('Invites stay active before lineup locking and use both complete team rosters', () => {
  const {data,match}=fixture();
  const absent={...data,lineupConfig:emptyLineups()};
  const expectedIds=data.teams.filter(team=>[match.a,match.b].includes(team.id)).flatMap(team=>team.playerIds);
  const invite=getCalendarInvite(absent,match,players,origin);
  assert.equal(invite.mode,'roster');
  assert.deepEqual(invite.guests,[...expectedIds.map(id=>players[id].email), MATCH_INVITE_EMAIL]);
  assert.equal(invite.guests.length,13);
  assert.match(invite.notice,/termasuk cadangan/);
  const unavailable=getCalendarInvite({...data,lineupAvailable:false},match,players,origin);
  assert.equal(unavailable.mode,'roster');
  assert.match(unavailable.notice,/belum dapat dimuat/);
  const unlocked=structuredClone(data);unlocked.lineupConfig.matches[0].locked=false;
  assert.equal(getCalendarInvite(unlocked,match,players,origin).mode,'roster');
  const html=renderCalendarInvite(absent,match,players,origin);
  assert.match(html,/data-invite-player/);
  assert.match(html,/calendar\.google\.com/);
  assert.doesNotMatch(html,/disabled/);
});

test('Missing emails keep Calendar active and clearly identify guests to add manually', () => {
  const {data,match}=fixture();
  const id=data.lineupConfig.matches[0].playerIdsA[0];
  for(const email of [undefined,'bad email','a@example.com,b@example.com']) {
    const profiles=players.map(p=>p.id===id?{...p,email}:p);
    const invite=getCalendarInvite(data,match,profiles,origin);
    assert.equal(invite.guests.length,10);
    assert.match(invite.notice,/Email belum lengkap/);
    assert.ok(invite.notice.includes(players[id].username));
    const html=renderCalendarInvite(data,match,profiles,origin);
    assert.match(html,/data-invite-player/);
    assert.doesNotMatch(html,/disabled/);
  }
  const fallback=renderCalendarInvite(data,{...match,time:'invalid'},players,origin);
  assert.match(fallback,/data-invite-player/);
  assert.doesNotMatch(fallback,/disabled/);
  assert.match(fallback,/add=infomuvers%40sekolahmu.co.id/);
});

test('Every match includes Info Muvers with or without a lineup, even when player emails are unavailable', () => {
  const {data}=fixture();
  for (const lineupAvailable of [true, false]) {
    for (const match of data.matches) {
      const invite=getCalendarInvite({...data,lineupAvailable},match,players);
      const guests=new URL(invite.url).searchParams.get('add').split(',');
      assert.equal(guests.filter(email=>email===MATCH_INVITE_EMAIL).length,1,match.id);
    }
  }
  const noEmails=players.map(player=>({...player,email:undefined}));
  assert.deepEqual(getCalendarInvite(data,data.matches[0],noEmails).guests,[MATCH_INVITE_EMAIL]);
  const sharedEmail=players.map(player=>({...player,email:MATCH_INVITE_EMAIL}));
  assert.deepEqual(getCalendarInvite(data,data.matches[0],sharedEmail).guests,[MATCH_INVITE_EMAIL]);
});

test('Invite previews escape player text and do not display guest email addresses', () => {
  const {data,match}=fixture(), id=data.lineupConfig.matches[0].playerIdsA[0];
  const profiles=players.map(p=>p.id===id?{...p,username:'<script>player</script>'}:p);
  const html=renderCalendarInvite(data,match,profiles,origin);
  assert.match(html,/&lt;script&gt;player&lt;\/script&gt;/);
  assert.match(html,/Invite Player ↗/);
  assert.match(html,/Link ini belum mengirim undangan/);
  const text=html.replace(/<[^>]+>/g,'');
  players.forEach(p=>assert.ok(!text.includes(p.email)));
  const page=readFileSync(new URL('../choose-team.html',import.meta.url),'utf8');
  assert.doesNotMatch(page,/<th[^>]*>Email<\/th>/);
});
