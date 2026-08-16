import Link from 'next/link';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/login" className="text-sm text-text-secondary hover:text-text">
          ← Back to log in
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-text">Reset your password</h1>
      <ForgotPasswordForm />
    </main>
  );
}
