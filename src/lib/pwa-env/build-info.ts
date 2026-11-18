/**
 * Build-time metadata injected by `withPwaEnv` (see `next-plugin.ts`) and read back at
 * runtime on both server and client. Framework-agnostic on purpose — this file has no Next.js
 * imports — so it can move into a shared `@sdee/pwa-env` package unchanged once a second app
 * adopts the pattern.
 */

export type AppEnvName = 'production' | 'dev';

export interface BuildInfo {
  /** Which permanent environment this build was produced for. */
  env: AppEnvName;
  /** Full commit SHA the build was made from. */
  sha: string;
  /** ISO timestamp of the build. */
  builtAt: string;
  /** App version, sourced from package.json so there's one place to bump it. */
  version: string;
}

/** Reads the build info that `withPwaEnv` inlined into `NEXT_PUBLIC_*` vars. Safe to call from
 *  client or server code — these are always inlined, never runtime-only. */
export function getBuildInfo(): BuildInfo {
  return {
    env: (process.env.NEXT_PUBLIC_APP_ENV as AppEnvName | undefined) ?? 'dev',
    sha: process.env.NEXT_PUBLIC_BUILD_SHA ?? 'unknown',
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? '',
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
  };
}

/** Short (7-char) form of a commit SHA for display. */
export function shortSha(sha: string): string {
  return sha === 'unknown' ? sha : sha.slice(0, 7);
}
