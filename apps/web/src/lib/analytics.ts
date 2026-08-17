import { track } from '@vercel/analytics/server';

export const AnalyticsEvent = {
  SignedUp: 'Signed Up',
  GameCreated: 'Game Created',
  SignedUpForGame: 'Signed Up For Game',
  WithdrewFromGame: 'Withdrew From Game',
  GroupCreated: 'Group Created',
  FriendRequestSent: 'Friend Request Sent',
  FriendRequestAccepted: 'Friend Request Accepted',
  GameResultSubmitted: 'Game Result Submitted',
  PlayerRated: 'Player Rated',
  BugReportSubmitted: 'Bug Report Submitted',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export async function trackEvent(
  name: AnalyticsEventName,
  properties?: Record<string, string | number | boolean | null>
): Promise<void> {
  await track(name, properties);
}
