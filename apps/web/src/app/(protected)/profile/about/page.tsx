import Image from 'next/image';
import webPackageJson from '../../../../../package.json';

export default function AboutPage() {
  const version = webPackageJson.version;
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-1">
        <Image src="/icon.png" alt="" width={88} height={88} className="mb-4 rounded-2xl" />
        <span className="text-xl font-bold text-text">Temur</span>
        <span className="text-text-secondary">Get your game together.</span>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <span className="text-text-secondary">Version</span>
          <span className="font-semibold text-text">{version}</span>
        </div>
        {commitSha && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-secondary">Build</span>
            <span className="font-semibold text-text">{commitSha}</span>
          </div>
        )}
      </div>

      {process.env.NEXT_PUBLIC_GITHUB_REPO_URL && (
        <a
          href={process.env.NEXT_PUBLIC_GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-lg border border-border px-4 py-2 text-center font-medium text-text transition-colors hover:bg-background-secondary"
        >
          View on GitHub
        </a>
      )}

      <span className="text-sm text-text-tertiary">
        © {new Date().getFullYear()} Temur. All rights reserved.
      </span>
    </div>
  );
}
