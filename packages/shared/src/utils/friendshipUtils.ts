export type FriendshipStatus = 'none' | 'friends' | 'pending_outgoing' | 'pending_incoming';

export interface FriendshipRow {
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
}

// Friendships are stored as a single directed row per pair (see the
// friendships table) rather than one row per direction, so "am I friends
// with this person" and "did I already send/receive a request" both need to
// check both directions. Returns a map from other-user-id to their status
// relative to `myId`, for every row myId is party to.
export const getFriendshipStatuses = (
  rows: FriendshipRow[],
  myId: string
): Map<string, FriendshipStatus> => {
  const statuses = new Map<string, FriendshipStatus>();

  for (const row of rows) {
    if (row.status === 'blocked') continue;

    const otherId = row.user_id === myId ? row.friend_id : row.user_id;
    if (row.status === 'accepted') {
      statuses.set(otherId, 'friends');
    } else {
      statuses.set(otherId, row.user_id === myId ? 'pending_outgoing' : 'pending_incoming');
    }
  }

  return statuses;
};
