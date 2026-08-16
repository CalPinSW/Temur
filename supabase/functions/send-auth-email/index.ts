import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { buildAuthEmail, sendEmail, type AuthEmailActionType } from '../_shared/email.ts';

interface SendEmailHookPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: AuthEmailActionType;
    site_url: string;
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

///*** Supabase Auth's "Send Email" hook (Auth → Hooks in the dashboard):
// replaces Supabase's own built-in auth email sending entirely, for every
// email_action_type, so it must handle all of them even though only
// `recovery` is triggered by the app today (see resetPassword() in
// apps/mobile/src/store/authStore.ts). Verified via the Standard Webhooks
// signature (SEND_EMAIL_HOOK_SECRET), since these requests carry no user
// JWT. Configured on the remote project only — see README's "Auth Emails
// (Resend)" section for why this isn't wired into local dev. ***///
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: { http_code: 405, message: 'Method not allowed' } }, 405);
  }

  const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let verified: SendEmailHookPayload;
  try {
    const wh = new Webhook(hookSecret);
    verified = wh.verify(payload, headers) as SendEmailHookPayload;
  } catch (error) {
    console.error('send-auth-email: webhook verification failed', error);
    return jsonResponse({ error: { http_code: 401, message: 'Invalid webhook signature' } }, 401);
  }

  const { user, email_data } = verified;
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? email_data.site_url;
  const verifyUrl =
    `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}` +
    `&type=${email_data.email_action_type}` +
    `&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

  const { subject, html } = buildAuthEmail(email_data.email_action_type, verifyUrl, email_data.token);

  const result = await sendEmail(user.email, subject, html);
  if (!result.ok) {
    console.error('send-auth-email: delivery failed', result.error);
    return jsonResponse({ error: { http_code: 500, message: result.error ?? 'Failed to send email' } }, 500);
  }

  return jsonResponse({}, 200);
});
