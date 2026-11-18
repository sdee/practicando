import type { Metadata, Viewport } from 'next';
import './globals.css';
import { currentEnvironment } from '@/config/environments';
import { getBuildInfo } from '@/lib/pwa-env/build-info';
import { EnvBanner } from '@/lib/pwa-env/EnvBanner';
import { UpdateToast } from '@/lib/pwa-env/UpdateToast';
import { AuthGate } from '@/components/AuthGate';
import { AppShell } from '@/components/AppShell';

const env = currentEnvironment();
const build = getBuildInfo();

export const metadata: Metadata = {
  applicationName: env.name,
  title: env.name,
  description: 'Practice Spanish verb conjugations with endless, customizable flashcards.',
  // iOS ignores manifest icons for the Home Screen shortcut.
  icons: { icon: `/icon-192${env.iconSuffix}.png`, apple: `/icon-192${env.iconSuffix}.png` },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: env.name },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: env.themeColor,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-env-banner={env.banner ? 'true' : undefined}>
      <body className="min-h-dvh">
        {env.banner && (
          <EnvBanner
            label={env.banner.label}
            sha={build.sha}
            version={build.version}
            href={process.env.NEXT_PUBLIC_PROMOTE_URL || undefined}
            background={env.banner.background}
            color={env.banner.color}
          />
        )}
        <AuthGate appName={env.name} iconSrc={`/icon-192${env.iconSuffix}.png`}>
          <AppShell>{children}</AppShell>
        </AuthGate>
        <UpdateToast currentSha={build.sha} />
      </body>
    </html>
  );
}
