import { buildInfoResponse } from '@/lib/pwa-env/build-route';

// Always evaluated fresh — the deployed build's identity, not a cached one.
export const dynamic = 'force-dynamic';

/** What the installed PWA polls (useUpdateCheck) to notice a newer deploy, and what the
 *  promote workflow polls to confirm a commit is live. See src/lib/pwa-env/. */
export const GET = () => buildInfoResponse();
