'use client';

/**
 * Persistent top banner making a non-production build unmistakable: "DEV · a1b2c3d · v0.12.3",
 * optionally linking out to the promotion workflow. No app-specific imports — the caller
 * supplies label/colors/link, so this moves into `@sdee/pwa-env` unchanged.
 *
 * Height is a fixed constant (not measured) so the caller can reserve the same space with a
 * plain CSS rule instead of a ResizeObserver — see `BANNER_HEIGHT_PX` and globals.css.
 */
import { shortSha } from './build-info';

export const BANNER_HEIGHT_PX = 28;

export interface EnvBannerProps {
  label: string;
  sha: string;
  version: string;
  /** Link to the promotion page (e.g. the GitHub Actions workflow_dispatch form). Contains no
   *  credentials — GitHub's own login gates the destination. Omit to render plain text. */
  href?: string;
  background?: string;
  color?: string;
}

export function EnvBanner({
  label,
  sha,
  version,
  href,
  background = '#f59e0b',
  color = '#1c1917',
}: EnvBannerProps) {
  const text = `${label} · ${shortSha(sha)} · v${version}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        insetInline: 0,
        zIndex: 50,
        background,
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div
        style={{
          height: BANNER_HEIGHT_PX,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: '600 12px system-ui, sans-serif',
          letterSpacing: '0.02em',
        }}
      >
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{ color, textDecoration: 'none' }}
          >
            {text}
          </a>
        ) : (
          <span style={{ color }}>{text}</span>
        )}
      </div>
    </div>
  );
}
