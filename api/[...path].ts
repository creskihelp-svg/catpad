import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  buildNodeWorkerEnv,
  handleNodeWorkerRequest,
  type NodeWorkerEnv,
} from '../worker/node-adapter.ts';

let envPromise: Promise<NodeWorkerEnv> | null = null;
const getEnv = () => {
  if (!envPromise) envPromise = buildNodeWorkerEnv();
  return envPromise;
};

export default async function handler(
  req: IncomingMessage & { originalUrl?: string; body?: unknown },
  res: ServerResponse,
) {
  const env = await getEnv();
  await handleNodeWorkerRequest(req, res, env);
}
