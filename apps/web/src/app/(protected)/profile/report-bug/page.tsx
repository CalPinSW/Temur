import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { ReportBugForm } from './ReportBugForm';
import webPackageJson from '../../../../../package.json';

export default async function ReportBugPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-sm text-text-secondary hover:text-text">
          ← Back
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Report a Bug</h1>
        <p className="text-sm text-text-secondary">
          Found something broken? Let us know what happened.
        </p>
      </div>

      <ReportBugForm
        appVersion={webPackageJson.version}
        buildSha={process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)}
      />
    </div>
  );
}
