/**
 * `withPwaEnv` — a Next.js config wrapper that gives every environment (production, dev,
 * deploy previews, local) a consistent identity with zero manual wiring per app:
 *
 *  - inlines build metadata (`NEXT_PUBLIC_APP_ENV/BUILD_SHA/BUILD_TIME/APP_VERSION/PROMOTE_URL`)
 *  - refuses to produce a "production" build from any branch but the declared one
 *
 * Copied from Lengua (Firebase rewrite dropped: Practicando uses Supabase) (see AGENTS.md-style note: "build once, extract once proven").
 * No app-specific imports — this file is written to move into `@sdee/pwa-env` unchanged.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';
import type { AppEnvName } from './build-info';

export interface WithPwaEnvOptions {
  /** The one branch allowed to produce a Netlify `production`-context build. */
  productionBranch: string;
}

function resolveAppEnv(): AppEnvName {
  // Netlify sets CONTEXT to 'production' | 'deploy-preview' | 'branch-deploy' | 'dev' (the
  // last being Netlify Dev / CLI, not our 'dev' environment). Locally (plain `next dev` /
  // `next build`), CONTEXT is unset — treated as 'dev', same as a branch deploy.
  return process.env.CONTEXT === 'production' ? 'production' : 'dev';
}

function resolveSha(): string {
  // Netlify sets COMMIT_REF to the full SHA being built. Fall back to git for local builds.
  if (process.env.COMMIT_REF) return process.env.COMMIT_REF;
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

function resolveVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function resolvePromoteUrl(): string {
  // REPOSITORY_URL is a Netlify build variable, e.g. https://github.com/sdee/practicando — never a
  // credential, just the repo's own public (to the signed-in owner) Actions page. GitHub's own
  // login gates the page; nothing here is a secret.
  const repo = process.env.REPOSITORY_URL;
  return repo ? `${repo}/actions/workflows/promote.yml` : '';
}

export function withPwaEnv(nextConfig: NextConfig, options: WithPwaEnvOptions): NextConfig {
  const appEnv = resolveAppEnv();
  const branch = process.env.BRANCH;

  // Guardrail: a Netlify *production*-context build must come from the production branch.
  // CONTEXT is only set on Netlify, so this never fires for a local `next build`.
  if (process.env.CONTEXT === 'production' && branch && branch !== options.productionBranch) {
    throw new Error(
      `[withPwaEnv] Refusing a production build from branch "${branch}" ` +
        `(expected "${options.productionBranch}"). Check the site's production branch setting.`,
    );
  }

  return {
    ...nextConfig,
    env: {
      ...nextConfig.env,
      NEXT_PUBLIC_APP_ENV: appEnv,
      NEXT_PUBLIC_BUILD_SHA: resolveSha(),
      NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
      NEXT_PUBLIC_APP_VERSION: resolveVersion(),
      NEXT_PUBLIC_PROMOTE_URL: resolvePromoteUrl(),
    },
  };
}
