'use client';

import { useState } from 'react';

export function CopyTeamSheetSection({
  message,
  singleTeam,
}: {
  message: string;
  singleTeam: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to the clipboard — select the message below and copy it manually.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {copied ? 'Copied!' : singleTeam ? 'Copy Squad Sheet' : 'Copy Team Sheet'}
        </button>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-text-secondary">Preview</summary>
        <pre
          data-testid="team-sheet-preview"
          className="mt-2 whitespace-pre-wrap rounded-lg border border-border-light bg-background-secondary p-3 font-sans text-text"
        >
          {message}
        </pre>
      </details>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
