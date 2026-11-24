import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import worker from './worker/index.ts';
import type { DbEnv } from './worker/db.ts';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env.local') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const getPort = (): number => {
  const idx = process.argv.indexOf('--port');
  if (idx !== -1 && process.argv[idx + 1]) {
    const parsed = Number(process.argv[idx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Number(process.env.PORT) || 3000;
};

const PORT = getPort();

const createLocalSqliteDb = async (): Promise<DbEnv['DB']> => {
  try {
    const sqlite = await import('node:sqlite');
    const dirCandidates = [
      process.env.DATA_DIR?.trim(),
      path.resolve(__dirname, '.catpad'),
      path.join(os.tmpdir(), 'catpad-data'),
    ].filter((d): d is string => Boolean(d));

    let dbPath = '';
    for (const dir of dirCandidates) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        const probe = path.join(dir, '.write-check');
        fs.writeFileSync(probe, 'ok');
        fs.unlinkSync(probe);
        dbPath = path.join(dir, 'catpad.db');
        break;
      } catch {
        /* try next writable directory */
      }
    }
    if (!dbPath) return undefined;

    const rawDb = new sqlite.DatabaseSync(dbPath);
    const wrapStmt = (sql: string, params: unknown[] = []) => ({
      bind: (...values: unknown[]) => wrapStmt(sql, values),
      all: async <T = Record<string, unknown>>() => ({
        results: rawDb.prepare(sql).all(...(params as any[])) as T[],
      }),
      first: async <T = Record<string, unknown>>() => {
        const row = rawDb.prepare(sql).get(...(params as any[])) as T | undefined;
        return row ?? null;
      },
      run: async () => {
        const result = rawDb.prepare(sql).run(...(params as any[]));
        return {
          success: true,
          meta: { changes: Number(result?.changes ?? 0) },
        };
      },
    });
    return {
      prepare: (sql: string) => wrapStmt(sql),
    };
  } catch {
    return undefined;
  }
};

/**
 * Node adapter around the shared worker handler (`worker/index.ts`).
 * Persists data via Node's built-in SQLite when available, or in memory as fallback.
 */
const env: Record<string, unknown> & {
  ADMIN_SECRET_KEY: string;
  ADMIN_USERNAME: string;
  SOLANA_NETWORK: string;
  DB?: DbEnv['DB'];
  ASSETS: { fetch: () => Promise<Response> };
} = {
  ...process.env,
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY?.trim() || '',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME?.trim() || '',
  SOLANA_NETWORK: process.env.SOLANA_NETWORK || 'devnet',
  DB: undefined,
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
  if (!headers.has('x-forwarded-for') && req.socket?.remoteAddress) {
    headers.set('x-forwarded-for', req.socket.remoteAddress);
  }

  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || 'http';
  const host = forwardedHost || req.headers.host || 'localhost';

  return new Request(`${forwardedProto}://${host}${req.originalUrl}`, {
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
    console.error('API adapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  env.DB = await createLocalSqliteDb();
  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
  let servedViaVite = false;

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      servedViaVite = true;
    } catch {
      /* vite not installed in production bundle; fall back to built dist/ */
    }
  }

  if (!servedViaVite) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: ExpressRequest, res: ExpressResponse) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`CatPad server running on http://0.0.0.0:${PORT} [${env.SOLANA_NETWORK}]`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} is already in use.`);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
