import { buildNodeWorkerEnv, handleNodeWorkerRequest } from './_worker-bundle.mjs';

let envPromise = null;
const getEnv = () => {
  if (!envPromise) envPromise = buildNodeWorkerEnv();
  return envPromise;
};

export default async function handler(req, res) {
  const rawUrl = req.originalUrl || req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const rewrittenPath = parsed.searchParams.get('__api_path');

  if (rewrittenPath !== null) {
    parsed.searchParams.delete('__api_path');
    const cleanSubPath = rewrittenPath.replace(/^\/+/, '');
    const qs = parsed.searchParams.toString();
    const reconstructed = `/api/${cleanSubPath}${qs ? `?${qs}` : ''}`;
    req.originalUrl = reconstructed;
    req.url = reconstructed;
  }

  const env = await getEnv();
  await handleNodeWorkerRequest(req, res, env);
}
