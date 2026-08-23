import type { NotificationScreen } from '@/services/navigationService';

export interface DeepLinkRoute {
  screen: NotificationScreen;
  params?: Record<string, unknown>;
}

// Normalizes a temur://host/path custom-scheme URL or an
// https://www.temur.app/path universal link down to a leading-slash path,
// so the two forms an incoming deep link can arrive in (see
// useAuthDeepLinks) can be matched against the same route table below.
function extractPath(url: string): string {
  const withoutFragment = url.split(/[?#]/)[0];
  const schemeMatch = withoutFragment.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);
  if (!schemeMatch) return '';

  const rest = withoutFragment.slice(schemeMatch[0].length);
  const isWebScheme = /^https?:\/\//i.test(schemeMatch[0]);
  if (!isWebScheme) return `/${rest}`;

  const slashIndex = rest.indexOf('/');
  return slashIndex === -1 ? '' : rest.slice(slashIndex);
}

// Maps the paths notification emails actually link to (buildNotificationLink
// in supabase/functions/_shared/email.ts) to the in-app screen that shows
// the same thing. Anything else (login, profile, group detail, …) has no
// matching screen yet, so it resolves to null and the deep link is a no-op
// beyond opening the app — those paths also aren't claimed in the AASA/
// assetlinks.json files, so they never reach here from a real universal
// link anyway.
export function resolveDeepLinkRoute(url: string): DeepLinkRoute | null {
  const segments = extractPath(url).split('/').filter(Boolean);

  if (segments.length === 0) return null;

  switch (segments[0]) {
    case 'friends':
      return segments[1] === 'requests' ? { screen: 'FriendRequests' } : { screen: 'Friends' };
    case 'groups':
      if (segments[1] === 'invites') return { screen: 'GroupInvites' };
      if (segments[1] === 'join' && segments[2]) {
        return { screen: 'GroupJoin', params: { token: segments[2] } };
      }
      return null;
    case 'games':
      if (segments[1] === 'join') {
        return segments[2] ? { screen: 'GameJoin', params: { token: segments[2] } } : null;
      }
      return segments[1]
        ? { screen: 'GameDetail', params: { gameId: segments[1] } }
        : { screen: 'Games' };
    default:
      return null;
  }
}
