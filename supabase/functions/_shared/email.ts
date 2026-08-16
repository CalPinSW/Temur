// Email delivery for notifications, via Resend's REST API (no SDK — same
// plain-fetch approach already used for Expo push). Second delivery path
// alongside push: web has no push story, so email is its only out-of-band
// channel; mobile users get both.

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'game_invite'
  | 'team_assigned'
  | 'ringers_open'
  | 'game_visible';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Reuses the title/body copy already built by each call site (mobile's
// NotificationTemplates, or web's inline equivalents) rather than
// maintaining a third parallel set of per-type templates just for email.
function buildNotificationLink(
  type: NotificationType,
  data: Record<string, unknown> | undefined,
  siteUrl: string
): string {
  const gameId = typeof data?.gameId === 'string' ? data.gameId : undefined;
  switch (type) {
    case 'friend_request':
      return `${siteUrl}/friends/requests`;
    case 'friend_accepted':
      return `${siteUrl}/friends`;
    case 'group_invite':
      return `${siteUrl}/groups/invites`;
    case 'game_invite':
    case 'team_assigned':
    case 'ringers_open':
    case 'game_visible':
      return gameId ? `${siteUrl}/games/${gameId}` : `${siteUrl}/games`;
    default:
      return siteUrl;
  }
}

export function buildNotificationEmail(
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, unknown> | undefined,
  siteUrl: string
): { subject: string; html: string } {
  const link = buildNotificationLink(type, data, siteUrl);

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #12231c;">
      <h2 style="color: #146b45; margin-bottom: 8px;">${escapeHtml(title)}</h2>
      <p style="font-size: 15px; line-height: 1.5;">${escapeHtml(body)}</p>
      <p style="margin-top: 24px;">
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background: #146b45; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Open Temur
        </a>
      </p>
    </div>
  `;

  return { subject: title, html };
}

export function buildBugReportEmail(
  description: string,
  context: Record<string, unknown> | undefined,
  reporterEmail: string,
  reporterUsername: string | undefined
): { subject: string; html: string } {
  const subject = `Bug report from ${reporterUsername ?? reporterEmail}`;

  const contextRows = context
    ? Object.entries(context)
        .map(([key, value]) => {
          const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
          return `<tr><td style="padding:4px 12px 4px 0;color:#586158;vertical-align:top;white-space:nowrap;">${escapeHtml(key)}</td><td style="padding:4px 0;">${escapeHtml(displayValue)}</td></tr>`;
        })
        .join('')
    : '';

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #12231c;">
      <h2 style="color: #146b45; margin-bottom: 8px;">Bug report</h2>
      <p style="font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(description)}</p>
      <p style="font-size: 13px; color: #586158;">
        From: ${escapeHtml(reporterEmail)}${reporterUsername ? ` (@${escapeHtml(reporterUsername)})` : ''}
      </p>
      ${
        contextRows
          ? `<table style="font-size: 13px; border-top: 1px solid #ded7c7; margin-top: 16px; padding-top: 8px; border-collapse: collapse;">${contextRows}</table>`
          : ''
      }
    </div>
  `;

  return { subject, html };
}

export type AuthEmailActionType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'reauthentication';

function buildAuthEmailCopy(
  actionType: AuthEmailActionType,
  token: string
): { subject: string; heading: string; body: string; cta: string } {
  switch (actionType) {
    case 'signup':
      return {
        subject: 'Confirm your email for Temur',
        heading: 'Confirm your email',
        body: 'Welcome to Temur! Click below to confirm your email address and finish setting up your account.',
        cta: 'Confirm email',
      };
    case 'recovery':
      return {
        subject: 'Reset your Temur password',
        heading: 'Reset your password',
        body: "We received a request to reset the password for your Temur account. Click below to choose a new one. If you didn't request this, you can safely ignore this email.",
        cta: 'Reset password',
      };
    case 'invite':
      return {
        subject: "You've been invited to Temur",
        heading: "You're invited",
        body: "You've been invited to join Temur. Click below to accept and set up your account.",
        cta: 'Accept invite',
      };
    case 'magiclink':
      return {
        subject: 'Your Temur sign-in link',
        heading: 'Sign in to Temur',
        body: `Click below to sign in. You can also enter this code instead: ${token}`,
        cta: 'Sign in',
      };
    case 'email_change':
      return {
        subject: 'Confirm your new email for Temur',
        heading: 'Confirm your new email',
        body: 'Click below to confirm this address as the new email for your Temur account.',
        cta: 'Confirm email change',
      };
    case 'reauthentication':
      return {
        subject: 'Your Temur confirmation code',
        heading: 'Confirm this was you',
        body: `Enter this code to continue: ${token}`,
        cta: '',
      };
  }
}

// Renders the Supabase Auth "Send Email" hook's payload (see
// supabase/functions/send-auth-email) with the same branding as
// buildNotificationEmail/buildBugReportEmail, instead of Supabase's plain
// default templates.
export function buildAuthEmail(
  actionType: AuthEmailActionType,
  verifyUrl: string,
  token: string
): { subject: string; html: string } {
  const { subject, heading, body, cta } = buildAuthEmailCopy(actionType, token);

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #12231c;">
      <h2 style="color: #146b45; margin-bottom: 8px;">${escapeHtml(heading)}</h2>
      <p style="font-size: 15px; line-height: 1.5;">${escapeHtml(body)}</p>
      ${
        cta
          ? `<p style="margin-top: 24px;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background: #146b45; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600;">
          ${escapeHtml(cta)}
        </a>
      </p>`
          : ''
      }
      <p style="margin-top: 24px; font-size: 13px; color: #586158;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  return { subject, html };
}

export interface SendEmailResult {
  attempted: boolean;
  ok: boolean;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { replyTo?: string }
): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return { attempted: false, ok: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = Deno.env.get('RESEND_FROM_EMAIL') || 'Temur <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(options?.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      return { attempted: true, ok: false, error: await response.text() };
    }
    return { attempted: true, ok: true };
  } catch (error) {
    return { attempted: true, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
