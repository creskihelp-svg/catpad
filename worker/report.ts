/**
 * Error reporting for the worker.
 *
 * Always logs a structured line. When the deployment is given a Sentry DSN the
 * event is also delivered to Sentry over its HTTP store endpoint, so no SDK or
 * extra dependency is needed at the edge. Reporting never throws.
 */

export interface ReportEnv {
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
}

interface SentryDsn {
  storeUrl: string;
  key: string;
}

/** Parses `https://<key>@<host>/<project>` into its store endpoint. */
export const parseDsn = (dsn: string): SentryDsn | null => {
  try {
    const url = new URL(dsn);
    const key = url.username;
    const project = url.pathname.replace(/^\//, '');
    if (!key || !project) return null;
    return { storeUrl: `${url.protocol}//${url.host}/api/${project}/store/`, key };
  } catch {
    return null;
  }
};

const eventId = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const reportError = (
  env: ReportEnv,
  error: unknown,
  context: Record<string, unknown> = {},
): void => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      level: 'error',
      message,
      stack,
      ...context,
      timestamp: new Date().toISOString(),
    }),
  );

  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const event = {
    event_id: eventId(),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    environment: env.ENVIRONMENT || 'production',
    message,
    extra: { ...context, stack },
  };

  // Best effort: a failed report must never fail the request.
  void fetch(parsed.storeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=catpad-worker/1.0`,
    },
    body: JSON.stringify(event),
  }).catch(() => undefined);
};
