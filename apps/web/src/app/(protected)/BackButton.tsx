'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getBackHref } from '@/lib/backNavigation';

export function BackButton() {
  const pathname = usePathname();
  const backHref = getBackHref(pathname);

  if (!backHref) return null;

  return (
    <Link
      href={backHref}
      aria-label="Back"
      className="flex items-center gap-1 text-sm text-text-secondary hover:text-text"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      <span className="hidden sm:inline">Back</span>
    </Link>
  );
}
