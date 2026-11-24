import worker from '../worker/index.ts';

export const onRequest = (context: {
  request: Request;
  env: Parameters<typeof worker.fetch>[1];
}) => worker.fetch(context.request, context.env);
