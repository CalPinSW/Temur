import { GameSignupEvent } from '../types/game';
import { APP_TIME_ZONE } from './gameUtils';

export const GAME_SIGNUP_EVENT_SELECT = `
  id, game_id, event_type, user_id, guest_name, actor_id, waitlisted, created_at,
  user:profiles!game_signup_events_user_id_fkey ( id, username, display_name ),
  actor:profiles!game_signup_events_actor_id_fkey ( id, username, display_name )
`;

const profileName = (profile: GameSignupEvent['user']): string | null =>
  profile ? profile.display_name || profile.username : null;

export const describeGameSignupEvent = (event: GameSignupEvent): string => {
  const player = profileName(event.user) ?? 'A deleted user';
  const actor = profileName(event.actor);
  const guest = event.guest_name ?? 'a guest';

  switch (event.event_type) {
    case 'joined':
      return event.waitlisted ? `${player} joined the waitlist` : `${player} signed up`;
    case 'withdrew':
      return event.waitlisted ? `${player} left the waitlist` : `${player} withdrew`;
    case 'removed':
      return actor ? `${player} was removed by ${actor}` : `${player} was removed`;
    case 'ringer_added':
      return actor ? `${actor} added ringer ${guest}` : `Ringer ${guest} was added`;
    case 'ringer_removed':
      return actor ? `${actor} removed ringer ${guest}` : `Ringer ${guest} was removed`;
    case 'account_deleted':
      return 'A player deleted their account';
  }
};

export const formatSignupEventTime = (dateString: string): string =>
  new Date(dateString).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  });
