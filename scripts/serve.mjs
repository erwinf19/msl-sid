import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { getPageRoute } from '../page-routes.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
export function createMSLServer() {
  return createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const page = getPageRoute(pathname);
    if (page && pathname !== page.path) {
      response.writeHead(301, { Location: `${page.path}${url.search}` });
      response.end(); return;
    }
    const file = resolve(root, `.${page?.file || pathname}`);
    const local = relative(root, file);
    if (local.startsWith('..') || isAbsolute(local) || local.split(/[\\/]/).some(part => part.startsWith('.'))) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createMSLServer().listen(4173, '127.0.0.1', () => console.log('MSL: http://127.0.0.1:4173'));
}
