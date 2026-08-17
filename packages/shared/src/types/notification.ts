export const NOTIFICATION_TYPES = [
  'friend_request',
  'friend_accepted',
  'group_invite',
  'game_invite',
  'team_assigned',
  'ringers_open',
  'game_visible',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  friend_request: 'Friend requests',
  friend_accepted: 'Friend request accepted',
  group_invite: 'Group invites',
  game_invite: 'Game invites',
  team_assigned: 'Team assignments',
  ringers_open: 'Ringers needed',
  game_visible: 'New games available',
};

export type NotificationChannel = 'push_enabled' | 'email_enabled';

export interface NotificationChannelPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
}

export type NotificationPreferences = Record<NotificationType, NotificationChannelPreferences>;

export interface NotificationPreferenceRow extends NotificationChannelPreferences {
  notification_type: NotificationType;
}
