import worker from '../../worker/index.ts';
import { buildNodeWorkerEnv, type NodeWorkerEnv } from '../../worker/node-adapter.ts';

let envPromise: Promise<NodeWorkerEnv> | null = null;
const getEnv = () => {
  if (!envPromise) envPromise = buildNodeWorkerEnv();
  return envPromise;
};

export default async function handler(request: Request): Promise<Response> {
  const env = await getEnv();
  return worker.fetch(request, env as Parameters<typeof worker.fetch>[1]);
}
