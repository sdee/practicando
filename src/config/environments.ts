/**
 * Practicando's per-environment identity — the only app-specific part of the dev/prod
 * pattern (mechanism lives in `src/lib/pwa-env/`, copied from Lengua). Database selection is
 * NOT here: see SCHEMA in src/lib/supabase.ts.
 */
import type { AppEnvName } from '@/lib/pwa-env/build-info';
import { getBuildInfo } from '@/lib/pwa-env/build-info';

export interface PracticandoEnvironment {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  /** Appended to icon filenames: '' → icon-192.png, '-dev' → icon-192-dev.png. */
  iconSuffix: string;
  /** Persistent top banner config, or null to render nothing (production). */
  banner: { label: string; background: string; color: string } | null;
}

export const ENVIRONMENTS: Record<AppEnvName, PracticandoEnvironment> = {
  production: {
    name: 'Practicando',
    shortName: 'Practicando',
    themeColor: '#fbcfe8',
    backgroundColor: '#fbcfe8',
    iconSuffix: '',
    banner: null,
  },
  dev: {
    name: 'Practicando Dev',
    shortName: 'Practicando Dev',
    themeColor: '#f59e0b',
    backgroundColor: '#fbcfe8',
    iconSuffix: '-dev',
    banner: { label: 'DEV', background: '#f59e0b', color: '#1c1917' },
  },
};

export function currentEnvironment(): PracticandoEnvironment {
  return ENVIRONMENTS[getBuildInfo().env];
}
