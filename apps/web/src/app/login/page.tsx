import { SocialSignInButtons } from '@/components/auth/SocialSignInButtons';
import { LoginForm } from './LoginForm';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { error, redirect } = await searchParams;
  const redirectTo = typeof redirect === 'string' ? redirect : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <h1 className="text-2xl font-semibold text-text">Sign in to Temur</h1>
      <LoginForm initialError={typeof error === 'string' ? error : undefined} redirectTo={redirectTo} />
      <SocialSignInButtons redirectTo={redirectTo} />
    </main>
  );
}
