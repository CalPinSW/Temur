'use client';

import { useEffect } from 'react';
import { recordError } from '@temur/shared';

// Renders nothing — just wires window-level listeners once, mounted near
// the root layout, so a bug report can attach whatever uncaught errors
// happened recently in this session.
export function ErrorCapture() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      recordError(event.message);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      recordError(reason instanceof Error ? reason.message : String(reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
