'use client';

import { useId, useState, type ReactNode } from 'react';

export function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-3 text-xs font-normal text-text shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
