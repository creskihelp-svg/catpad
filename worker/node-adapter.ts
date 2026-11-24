import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import type { DbEnv } from './db.ts';
import worker from './index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

let cachedDbPromise: Promise<DbEnv['DB']> | null = null;

export const createLocalSqliteDb = async (): Promise<DbEnv['DB']> => {
  if (cachedDbPromise) return cachedDbPromise;
  cachedDbPromise = (async () => {
    try {
      const sqlite = await import('node:sqlite');
      const dirCandidates = [
        process.env.DATA_DIR?.trim(),
        path.resolve(PROJECT_ROOT, '.catpad'),
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
  })();
  return cachedDbPromise;
};

export interface NodeWorkerEnv extends Record<string, unknown> {
  ADMIN_SECRET_KEY: string;
  ADMIN_USERNAME: string;
  SOLANA_NETWORK: string;
  DB?: DbEnv['DB'];
  ASSETS: { fetch: () => Promise<Response> };
}

export const buildNodeWorkerEnv = async (): Promise<NodeWorkerEnv> => ({
  ...process.env,
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY?.trim() || '',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME?.trim() || '',
  SOLANA_NETWORK: process.env.SOLANA_NETWORK || 'devnet',
  DB: await createLocalSqliteDb(),
  ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) },
});

const sanitizeHeaderHost = (value: string | undefined): string => {
  const first = value?.split(',')[0]?.trim() || '';
  return /^[a-z0-9.\-:\[\]]+$/i.test(first) ? first : '';
};

const sanitizeProto = (value: string | undefined): string => {
  const first = value?.split(',')[0]?.trim().toLowerCase() || '';
  return first === 'https' ? 'https' : 'http';
};

export const nodeRequestToWebRequest = async (
  req: IncomingMessage & { originalUrl?: string; body?: unknown },
): Promise<Request> => {
  let body: BodyInit | undefined;
  const method = (req.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') {
        body = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body as unknown as BodyInit;
      } else {
        body = JSON.stringify(req.body);
      }
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      if (chunks.length) body = Buffer.concat(chunks) as unknown as BodyInit;
    }
  }

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value !== undefined) headers.set(key, value);
  });
  if (!headers.has('x-forwarded-for') && req.socket?.remoteAddress) {
    headers.set('x-forwarded-for', req.socket.remoteAddress);
  }

  const forwardedHost = sanitizeHeaderHost(req.headers['x-forwarded-host'] as string | undefined);
  const directHost = sanitizeHeaderHost(req.headers.host);
  const host = forwardedHost || directHost || 'localhost';
  const proto = sanitizeProto(req.headers['x-forwarded-proto'] as string | undefined);
  const reqPath = req.originalUrl || req.url || '/';

  return new Request(`${proto}://${host}${reqPath.startsWith('/') ? reqPath : `/${reqPath}`}`, {
    method,
    headers,
    body,
  });
};

export const handleNodeWorkerRequest = async (
  req: IncomingMessage & { originalUrl?: string; body?: unknown },
  res: ServerResponse,
  env?: NodeWorkerEnv,
): Promise<void> => {
  try {
    const resolvedEnv = env ?? (await buildNodeWorkerEnv());
    if (!resolvedEnv.DB) resolvedEnv.DB = await createLocalSqliteDb();
    const webRequest = await nodeRequestToWebRequest(req);
    const response = await worker.fetch(
      webRequest,
      resolvedEnv as Parameters<typeof worker.fetch>[1],
    );
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    console.error('API adapter error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
    }
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};
