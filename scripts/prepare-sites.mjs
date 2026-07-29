import { copyFile, mkdir, writeFile } from 'node:fs/promises';

const worker = `const INDEX_PATH = '/index.html';

function canUseSpaFallback(request, response) {
  if (request.method !== 'GET' || response.status !== 404) return false;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('Static asset binding is unavailable', { status: 503 });
    }

    const response = await env.ASSETS.fetch(request);
    if (!canUseSpaFallback(request, response)) return response;

    const fallbackUrl = new URL(request.url);
    fallbackUrl.pathname = INDEX_PATH;
    fallbackUrl.search = '';
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
`;

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await writeFile('dist/server/index.js', worker, 'utf8');
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
