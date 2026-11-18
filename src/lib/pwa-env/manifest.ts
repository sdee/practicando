/**
 * Merges an environment's identity (name/theme/icons) into a base Web App Manifest, so a
 * `manifest.ts` in any app becomes one call instead of hand-duplicating the whole object per
 * environment. Framework-agnostic — only depends on the shape of `MetadataRoute.Manifest`.
 */
import type { MetadataRoute } from 'next';

export interface ManifestEnvironment {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  /** Appended to icon filenames before the extension, e.g. '-dev' → `icon-192-dev.png`. */
  iconSuffix: string;
}

export function envManifest(
  base: Omit<MetadataRoute.Manifest, 'name' | 'short_name' | 'theme_color' | 'background_color' | 'icons'>,
  env: ManifestEnvironment,
): MetadataRoute.Manifest {
  const icon = (size: 192 | 512) => `/icon-${size}${env.iconSuffix}.png`;
  return {
    ...base,
    name: env.name,
    short_name: env.shortName,
    theme_color: env.themeColor,
    background_color: env.backgroundColor,
    icons: [
      { src: icon(192), sizes: '192x192', type: 'image/png' },
      { src: icon(512), sizes: '512x512', type: 'image/png' },
      { src: icon(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
