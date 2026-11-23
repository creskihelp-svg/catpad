import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import worker from './worker/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

/**
 * Local development is a thin Node adapter around the same edge worker that is
 * deployed, so validation, sessions, throttles and on-chain verification can
 * never drift between `bun run dev` and production. Without a DB binding the
 * worker keeps its data in memory for the life of the process.
 */
const env = {
  ...process.env,
  ADMIN_SECRET_KEY:
    process.env.ADMIN_SECRET_KEY?.trim() ||
    (process.env.NODE_ENV === 'production' ? '' : 'catpad-admin-key-2026'),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME?.trim() || 'stud.disc',
  SOLANA_NETWORK: process.env.SOLANA_NETWORK || 'devnet',
  ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) },
};

const toRequest = async (req: ExpressRequest): Promise<Request> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value !== undefined) headers.set(key, value);
  });

  return new Request(`http://${req.headers.host}${req.originalUrl}`, {
    method: req.method,
    headers,
    body: body as BodyInit | undefined,
  });
};

app.use('/api', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const response = await worker.fetch(await toRequest(req), env as Parameters<typeof worker.fetch>[1]);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Dev API adapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: ExpressRequest, res: ExpressResponse) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`CatPad server running on port ${PORT} [${env.SOLANA_NETWORK}]`);
  });
}

startServer();
