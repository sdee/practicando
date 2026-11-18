'use client';

/**
 * "New build available — Reload" toast, shown when `useUpdateCheck` finds a newer deployed
 * commit than the one currently running. App-agnostic — belongs in `@sdee/pwa-env`.
 */
import { shortSha } from './build-info';
import { useUpdateCheck, type UpdateInfo } from './useUpdateCheck';

export interface UpdateToastProps {
  currentSha: string;
  endpoint?: string;
}

export function UpdateToast({ currentSha, endpoint }: UpdateToastProps) {
  const update = useUpdateCheck(currentSha, endpoint);
  if (!update) return null;
  return <UpdateToastView update={update} />;
}

function UpdateToastView({ update }: { update: UpdateInfo }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: '#18181b',
        color: '#fff',
        borderRadius: '9999px',
        padding: '0.5rem 0.5rem 0.5rem 1rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        font: '500 13px system-ui, sans-serif',
        maxWidth: 'calc(100vw - 2rem)',
      }}
    >
      <span>New build available ({shortSha(update.sha)})</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: '#fff',
          color: '#18181b',
          border: 'none',
          borderRadius: '9999px',
          padding: '0.35rem 0.9rem',
          font: 'inherit',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}
