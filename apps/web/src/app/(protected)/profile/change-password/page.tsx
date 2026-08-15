import { ChangePasswordForm } from './ChangePasswordForm';

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Change Password</h1>
      <ChangePasswordForm />
    </div>
  );
}
