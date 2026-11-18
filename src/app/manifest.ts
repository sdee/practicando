import type { MetadataRoute } from 'next';
import { currentEnvironment } from '@/config/environments';
import { envManifest } from '@/lib/pwa-env/manifest';

// Name, colors and icons come from the build's environment so the production and dev
// installs are unmistakable and separately installable.
export default function manifest(): MetadataRoute.Manifest {
  return envManifest(
    {
      description: 'Practice Spanish verb conjugations with endless, customizable flashcards.',
      start_url: '/practice',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
    },
    currentEnvironment(),
  );
}
