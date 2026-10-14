import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.EL7LM_WEB_PORT ?? '5217', 10);
const root = normalize(join(import.meta.dirname, '..', 'build', 'web'));
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

http
  .createServer((request, response) => {
    const requestPath = decodeURIComponent(
      new URL(request.url ?? '/', `http://${host}`).pathname,
    );
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
    let target = normalize(join(root, relativePath));

    if (!target.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }

    try {
      if (!statSync(target).isFile()) {
        target = join(root, 'index.html');
      }
    } catch {
      target = join(root, 'index.html');
    }

    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': contentTypes[extname(target)] ?? 'application/octet-stream',
    });
    createReadStream(target).pipe(response);
  })
  .listen(port, host, () => {
    console.log(`El7lm local web app: http://${host}:${port}`);
  });
