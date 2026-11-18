/**
 * Handler body for the `/api/build` endpoint `useUpdateCheck` polls. Framework-agnostic
 * (returns a standard `Response`) — the app wires it into its own route file so it can wrap
 * it with whatever error-handling convention the app already has (see
 * `src/app/api/build/route.ts`, which wraps this in Lengua's `apiRoute`).
 */
import { getBuildInfo } from './build-info';

export function buildInfoResponse(): Response {
  const { env, sha, version, builtAt } = getBuildInfo();
  return Response.json(
    { env, sha, version, builtAt },
    // Always fresh — a cached answer would defeat the whole point of the endpoint.
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
