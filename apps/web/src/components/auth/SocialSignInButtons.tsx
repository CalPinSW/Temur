'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Script from 'next/script';
import { generateNonce } from '@/lib/auth/nonce';
import { signInWithIdToken, type SocialProvider } from '@/lib/auth/socialActions';

interface GoogleCredentialResponse {
  credential: string;
}

interface AppleSignInSuccessDetail {
  authorization: { id_token: string };
  user?: { name?: { firstName?: string; lastName?: string } };
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            nonce: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
          nonce: string;
        }) => void;
        signIn: () => void;
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

export function SocialSignInButtons() {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [nonce, setNonce] = useState<{ nonce: string; hashedNonce: string } | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    generateNonce().then(setNonce);
  }, []);

  const submit = (provider: SocialProvider, token: string, fullName?: string) => {
    if (!nonce) return;
    setError('');
    startTransition(async () => {
      const result = await signInWithIdToken(provider, token, nonce.nonce, fullName);
      if (result?.error) setError(result.error);
    });
  };

  useEffect(() => {
    if (!googleReady || !nonce || !GOOGLE_CLIENT_ID || !googleButtonRef.current || !window.google) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => submit('google', response.credential),
      nonce: nonce.hashedNonce,
      use_fedcm_for_prompt: true,
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, nonce]);

  useEffect(() => {
    if (!appleReady || !nonce || !APPLE_CLIENT_ID || !window.AppleID) return;

    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI: `${window.location.origin}/login`,
      usePopup: true,
      nonce: nonce.nonce,
    });
  }, [appleReady, nonce]);

  useEffect(() => {
    const handleSuccess = (event: Event) => {
      const detail = (event as CustomEvent<AppleSignInSuccessDetail>).detail;
      if (!detail?.authorization?.id_token) return;
      const fullName = [detail.user?.name?.firstName, detail.user?.name?.lastName]
        .filter(Boolean)
        .join(' ');
      submit('apple', detail.authorization.id_token, fullName || undefined);
    };
    const handleFailure = (event: Event) => {
      const errorCode = (event as CustomEvent<{ error?: string }>).detail?.error;
      if (errorCode !== 'popup_closed_by_user') {
        setError('Apple sign-in failed. Please try again.');
      }
    };

    document.addEventListener('AppleIDSignInOnSuccess', handleSuccess);
    document.addEventListener('AppleIDSignInOnFailure', handleFailure);
    return () => {
      document.removeEventListener('AppleIDSignInOnSuccess', handleSuccess);
      document.removeEventListener('AppleIDSignInOnFailure', handleFailure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setGoogleReady(true)}
      />
      <Script
        src="https://appleid.cdn-apple.com/appleauth/page/signin.js"
        strategy="afterInteractive"
        onReady={() => setAppleReady(true)}
      />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-tertiary">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div ref={googleButtonRef} className="flex justify-center" />

      <button
        type="button"
        onClick={() => window.AppleID?.auth.signIn()}
        disabled={isPending || !appleReady}
        className="rounded-lg bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-black/90 disabled:opacity-60"
      >
        Continue with Apple
      </button>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
