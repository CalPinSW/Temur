'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { recordError } from '@temur/shared';
import { getBackHref } from '@/lib/backNavigation';
import { useToast } from '@/components/toast/ToastProvider';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    Sentry.captureException(error);
    recordError(error.message);
    showToast('Something went wrong. Please try again.');
    router.replace(getBackHref(pathname) ?? '/');
  }, [error, pathname, router, showToast]);

  return null;
}
