import { NextResponse, type NextRequest } from 'next/server';
import { getAuthErrorMessage } from '@temur/shared';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/games';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(getAuthErrorMessage(error))}`
    );
  }

  // The provider (or Supabase itself) can redirect here with an error
  // instead of a code — e.g. a redirect URL that isn't on the allow list,
  // or the user declining the provider's consent screen.
  const providerError = searchParams.get('error_description') ?? searchParams.get('error');
  if (providerError) {
    console.error('[auth/callback] provider returned an error:', providerError);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
