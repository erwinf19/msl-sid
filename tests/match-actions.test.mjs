import test from 'node:test';
import assert from 'node:assert/strict';
import { tournament } from '../tournament-data.js';
import { getStandings } from '../league.js';
import { matchBroadcast, weekBroadcast, matchLink, telegramShareUrl, renderTeamDetail } from '../match-actions.js';
import { renderMatchCard } from '../schedule-view.js';
const origin = 'https://msl-sid.netlify.app';

test('broadcasts identify each match, include spacing, stream links, and current results', () => {
  const m = {...tournament.matches[0], streamUrl:'https://youtu.be/m1'};
  const a = tournament.teams.find(t=>t.id===m.a), b = tournament.teams.find(t=>t.id===m.b);
  const text = matchBroadcast(tournament,m,origin);
  assert.ok(text.includes(`${a.name} vs ${b.name}`));
  assert.match(text,/6 Oktober 2026/);
  assert.match(text,/12:15 WIB/);
  assert.match(text,/\n\n⚔️/);
  assert.ok(text.includes(m.streamUrl));
  assert.ok(text.endsWith(`${origin}/full-schedule#match-m1`));
  assert.doesNotMatch(text,/Skor akhir/);
  assert.match(matchBroadcast(tournament,{...m,score:[2,1]},origin),/Skor akhir: .* 2–1/);
  assert.match(matchBroadcast(tournament,{...m,streamUrl:'javascript:alert(1)'},origin),/Link streaming menyusul/);
});

test('weekly broadcasts contain only the selected week with every match and correct destination', () => {
  for (let week=1;week<=10;week++) {
    const selected = tournament.matches.filter(m=>m.week===week);
    const text = weekBroadcast(tournament,week,origin);
    assert.equal((text.match(/⚔️/g)||[]).length,selected.length);
    for (const m of selected) assert.ok(text.includes(`${tournament.teams.find(t=>t.id===m.a).name} vs ${tournament.teams.find(t=>t.id===m.b).name}`));
    assert.ok(text.endsWith(`${origin}/full-schedule#pekan-${week}`));
  }
  assert.throws(()=>weekBroadcast(tournament,99,origin));
});

test('Telegram links preserve emoji, multiline text and URL characters without duplicating the page link', () => {
  const url = matchLink(tournament.matches[0],origin);
  const text = `🎮 Team A & B\n\n📺 https://youtu.be/x?a=1&b=2\n\n${url}`;
  const parsed = new URL(telegramShareUrl(text,url));
  assert.equal(parsed.origin,'https://t.me');
  assert.equal(parsed.searchParams.get('url'),url);
  assert.equal(parsed.searchParams.get('text'),text.slice(0,-url.length).trimEnd());
});

test('details show published roster roles, safe player text, and standings from real scores only', () => {
  const data = structuredClone(tournament);
  data.matches.forEach(m=>{m.score=null;m.previewScore=[2,0];});
  data.matches[0].score=[2,1];
  const rows=getStandings(data), team=rows.find(t=>t.id===data.matches[0].a);
  team.players=['<player>', 'Second'];
  team.playerNames=['Name & name', 'Other'];
  team.playerRoles=[data.roles[0],data.roles[4]];
  const html=renderTeamDetail(team,rows.indexOf(team)+1,data.roles);
  assert.match(html,/&lt;player&gt;/);
  assert.match(html,/Name &amp; name/);
  assert.match(html, /Match W–L<\/dt><dd aria-label="1 menang, 0 kalah">1–0/);
  assert.match(html, /Game W–L<\/dt><dd aria-label="2 menang, 1 kalah">2–1/);
  assert.match(html, /Net Game<\/dt><dd>\+1/);
  assert.doesNotMatch(html, /Match Lose|Game Lose|Match Point/);
  assert.ok(html.includes(data.roles[4]));
  assert.match(renderTeamDetail({...team,players:[]},1,data.roles),/Roster belum dipublikasikan/);
  const card=renderMatchCard(data,data.matches[0]);
  assert.match(card,/id="match-m1"/);
  assert.match(card,/data-match-detail="m1"/);
  assert.match(card,/data-match-share="m1"/);
});
