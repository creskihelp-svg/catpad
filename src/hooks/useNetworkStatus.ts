import { useEffect, useState } from 'react';

export interface NetworkStatusState {
  online: boolean;
  network: string;
}

/** Polls the server-side Solana RPC health endpoint once on mount. */
export const useNetworkStatus = (): NetworkStatusState => {
  const [status, setStatus] = useState<NetworkStatusState>({ online: false, network: 'devnet' });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/network-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || cancelled) return;
        setStatus({
          online: Boolean(data.rpcHealthy),
          network: typeof data.network === 'string' ? data.network : 'devnet',
        });
      })
      .catch(() => {
        /* keep offline state */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
};
