import { Studio } from "@anvia/studio";
import { initializeDatabase } from "./db/sqlite.ts";
import { extractAbstraction } from "./pipelines/extract-abstraction.ts";
import { matchTopic } from "./pipelines/match-topic.ts";
import { explainAbstract } from "./pipelines/explain-abstract.ts";
import { handleAbstractRequest } from './web/abstract-route.ts';

const studioLayout = await Bun.file(new URL('./web/studio-layout.css', import.meta.url)).text();

initializeDatabase();

const studio = new Studio([
  extractAbstraction,
  matchTopic,
  explainAbstract,
]);

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(Bun.env.RUNNER_PORT ?? 4021),
  idleTimeout: 255,
  async fetch(request) {
    const customResponse = await handleAbstractRequest(request);
    if (customResponse) return customResponse;
    const response = await studio.fetch(request);
    if (!response.headers.get('content-type')?.includes('text/html')) return response;
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    const html = (await response.text()).replace('</head>', `<style>${studioLayout}</style></head>`);
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  },
});

console.log(`Input abstrak: ${server.url}abstract`);
console.log(`Studio UI: ${server.url}pipelines`);