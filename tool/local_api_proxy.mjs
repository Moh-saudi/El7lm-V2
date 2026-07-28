import http from 'node:http';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.EL7LM_PROXY_PORT ?? '3001', 10);
const upstream = new URL('https://www.el7lm.com');
const localOriginPattern = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/;

function corsHeaders(origin) {
  if (!origin || !localOriginPattern.test(origin)) {
    return {};
  }

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type, Accept',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  const headers = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (!request.url?.startsWith('/api/')) {
    response.writeHead(404, {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ error: 'Only /api/ routes are available.' }));
    return;
  }

  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        throw new Error('Request body is too large.');
      }
      chunks.push(chunk);
    }

    const target = new URL(request.url, upstream);
    const upstreamResponse = await fetch(target, {
      method: request.method,
      redirect: 'error',
      headers: {
        accept: request.headers.accept ?? 'application/json',
        ...(request.headers['content-type']
          ? { 'content-type': request.headers['content-type'] }
          : {}),
        ...(request.headers.authorization
          ? { authorization: request.headers.authorization }
          : {}),
      },
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : Buffer.concat(chunks),
    });

    const body = Buffer.from(await upstreamResponse.arrayBuffer());
    response.writeHead(upstreamResponse.status, {
      ...headers,
      'content-type':
        upstreamResponse.headers.get('content-type') ??
        'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(502, {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify({ error: 'تعذر الاتصال بخادم المنصة.' }));
  }
});

server.listen(port, host, () => {
  console.log(`El7lm local API proxy: http://${host}:${port}`);
});
