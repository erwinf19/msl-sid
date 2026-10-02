import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createMSLServer } from '../scripts/serve.mjs';
import { pageRoutes } from '../page-routes.js';

test('clean URLs serve their own pages, navigation and root assets on direct requests', async t => {
  const server = createMSLServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const page of pageRoutes) {
    const response = await fetch(`${base}${page.path}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const html = await response.text();
    assert.equal(html, await readFile(new URL(`..${page.file}`, import.meta.url), 'utf8'));
    const nav = html.match(/<nav aria-label="Navigasi utama">([\s\S]*?)<\/nav>/)[1];
    assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(match => match[1]), pageRoutes.map(route => route.path));
    const assets = [...html.matchAll(/(?:src|href)="(\/[^"#]+\.(?:js|css|png|jpg|webp))"/g)].map(match => match[1]);
    assert.ok(assets.length > 0);
    for (const asset of new Set(assets)) assert.equal((await fetch(`${base}${asset}`)).status, 200, asset);
    assert.equal((await fetch(`${base}${page.path}`)).status, 200, 'refresh remains available');
  }
  for (const page of pageRoutes) {
    for (const alias of [page.file, ...page.aliases, ...(page.path === '/' ? [] : [`${page.path}/`])]) {
      const response = await fetch(`${base}${alias}?view=meeting`, {redirect:'manual'});
      assert.equal(response.status, 301, alias);
      assert.equal(response.headers.get('location'), `${page.path}?view=meeting`);
    }
  }
  assert.equal((await fetch(`${base}/halaman-tidak-ada`)).status, 404);
  assert.equal((await fetch(`${base}/.git/config`)).status, 403);
});

test('Netlify rewrites and legacy redirects agree with the local routes', async () => {
  const rules = (await readFile(new URL('../_redirects', import.meta.url), 'utf8'))
    .split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => line.split(/\s+/));
  for (const page of pageRoutes) {
    if (page.path !== '/') assert.ok(rules.some(([from,to,status]) => from === page.path && to === page.file && status === '200!'));
    for (const alias of [page.file,...page.aliases]) assert.ok(rules.some(([from,to,status]) => from === alias && to === page.path && status === '301!'));
  }
  assert.match(await readFile(new URL('../netlify.toml', import.meta.url), 'utf8'), /pretty_urls\s*=\s*false/);
});
