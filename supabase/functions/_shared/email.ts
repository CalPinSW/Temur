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

function escapeHtml(value: string): string {
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

export interface SendEmailResult {
  attempted: boolean;
  ok: boolean;
  error?: string;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
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
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      return { attempted: true, ok: false, error: await response.text() };
    }
    return { attempted: true, ok: true };
  } catch (error) {
    return { attempted: true, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
