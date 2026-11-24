import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  buildNodeWorkerEnv,
  handleNodeWorkerRequest,
  type NodeWorkerEnv,
} from './worker/node-adapter.ts';

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

let envPromise: Promise<NodeWorkerEnv> | null = null;
const getEnv = () => {
  if (!envPromise) envPromise = buildNodeWorkerEnv();
  return envPromise;
};

app.use('/api', async (req: ExpressRequest, res: ExpressResponse) => {
  const env = await getEnv();
  await handleNodeWorkerRequest(req, res, env);
});

async function startServer() {
  const env = await getEnv();
  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
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
    // Auto-build dist/ if started straight from a fresh repo clone without a prior build step.
    if (!fs.existsSync(distIndex)) {
      try {
        const { build } = await import('vite');
        console.log('dist/index.html missing — building frontend bundle...');
        await build();
      } catch (err) {
        console.error('Could not auto-build dist/:', err);
      }
    }

    app.use(express.static(distDir));
    app.get('*', (req: ExpressRequest, res: ExpressResponse) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
      }
      if (!fs.existsSync(distIndex)) {
        return res.status(503).send('Frontend build is missing. Run "npm run build" first.');
      }
      return res.sendFile(distIndex);
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
