import { useEffect, useState } from 'react';
import type { DownloadQuality } from '../types';

interface NetworkConnection extends EventTarget {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
}

export interface NetworkStatus {
  online: boolean;
  saveData: boolean;
  effectiveType: string | null;
  downlinkMbps: number | null;
  roundTripMs: number | null;
  lowBandwidth: boolean;
  recommendedAudioQuality: DownloadQuality;
}

function readNetworkStatus(): NetworkStatus {
  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  const effectiveType = connection?.effectiveType ?? null;
  const downlinkMbps = Number.isFinite(connection?.downlink) ? connection?.downlink ?? null : null;
  const saveData = connection?.saveData === true;
  const online = navigator.onLine;
  const lowBandwidth = saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || (downlinkMbps !== null && downlinkMbps <= 1);

  return {
    online,
    saveData,
    effectiveType,
    downlinkMbps,
    roundTripMs: Number.isFinite(connection?.rtt) ? connection?.rtt ?? null : null,
    lowBandwidth,
    recommendedAudioQuality: lowBandwidth ? 'low' : 'high',
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState(readNetworkStatus);

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    const update = () => setStatus(readNetworkStatus());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    connection?.addEventListener('change', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      connection?.removeEventListener('change', update);
    };
  }, []);

  return status;
}
