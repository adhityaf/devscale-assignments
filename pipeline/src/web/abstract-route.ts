import { extractAbstraction } from '../pipelines/extract-abstraction.ts';
import { matchTopic } from '../pipelines/match-topic.ts';
import { z } from 'zod';

const page = await Bun.file(new URL('./abstract.html', import.meta.url)).text();
const maxLength = 100_000;
const comparisonInput = z.object({
  abstractionId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  title: z.string().trim().min(1).max(2000),
});

export async function handleAbstractRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!['/abstract', '/abstract/compare'].includes(url.pathname)) return null;
  if (request.method === 'GET') {
    return new Response(page, { headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    } });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  }
  // Local developer surface: reject cross-origin form submissions.
  if (request.headers.get('origin') && request.headers.get('origin') !== url.origin) {
    return Response.json({ error: 'Permintaan harus berasal dari halaman yang sama.' }, { status: 403 });
  }
  if (url.pathname === '/abstract/compare') {
    let body: unknown;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Input perbandingan tidak valid.' }, { status: 400 });
    }
    const parsed = comparisonInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Masukkan ID abstrak berupa bilangan bulat positif dan judul sepanjang 1–2.000 karakter.' }, { status: 400 });
    }
    try {
      const result = await matchTopic.run({ input: parsed.data });
      return Response.json(result.output, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('Title comparison failed:', error);
      return Response.json({ error: 'Perbandingan gagal. Pastikan abstrak dengan ID tersebut sudah tersimpan. Detail error ada di terminal Studio.' }, { status: 500 });
    }
  }
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'text/plain') {
    return Response.json({ error: 'Kirim abstrak sebagai teks biasa.' }, { status: 415 });
  }
  const text = await request.text();
  if (!text.trim() || text.length > maxLength) {
    return Response.json({ error: 'Masukkan abstrak sepanjang 1–100.000 karakter. Teks tidak boleh hanya berisi spasi.' }, { status: 400 });
  }
  try {
    const result = await extractAbstraction.run({ input: { text } });
    return Response.json(result.output, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Abstract extraction failed:', error);
    return Response.json({ error: 'Ekstraksi atau penyimpanan gagal. Periksa terminal Studio sebelum mencoba lagi.' }, { status: 500 });
  }
}
