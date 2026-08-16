import { ResetPasswordForm } from './ResetPasswordForm';

// No server-side session check here — the recovery link delivers its
// session tokens as a URL hash fragment, which the server never sees, so
// gating on getUser() at request time would redirect away before the
// client ever gets a chance to process the fragment. ResetPasswordForm
// handles both establishing the session from the fragment and redirecting
// to /login when there's no fragment and no existing session.
export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <h1 className="text-2xl font-semibold text-text">Set a new password</h1>
      <ResetPasswordForm />
    </main>
  );
}
