import { SignUpForm } from './SignUpForm';

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <h1 className="text-2xl font-semibold text-text">Create your Temur account</h1>
      <SignUpForm />
    </main>
  );
}
