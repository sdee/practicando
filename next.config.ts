import type { NextConfig } from 'next';
// Relative import (not the `@/` alias): next.config.ts loads before path aliases are wired up.
import { withPwaEnv } from './src/lib/pwa-env/next-plugin';

const nextConfig: NextConfig = {};

export default withPwaEnv(nextConfig, { productionBranch: 'main' });
