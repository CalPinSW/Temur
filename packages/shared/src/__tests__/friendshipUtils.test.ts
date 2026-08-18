import { getFriendshipStatuses } from '../utils/friendshipUtils';

describe('getFriendshipStatuses', () => {
  const me = 'user-me';

  it('reports accepted friendships regardless of which side initiated', () => {
    const statuses = getFriendshipStatuses(
      [
        { user_id: me, friend_id: 'user-a', status: 'accepted' },
        { user_id: 'user-b', friend_id: me, status: 'accepted' },
      ],
      me
    );

    expect(statuses.get('user-a')).toBe('friends');
    expect(statuses.get('user-b')).toBe('friends');
  });

  it('distinguishes a request I sent from one I received', () => {
    const statuses = getFriendshipStatuses(
      [
        { user_id: me, friend_id: 'user-a', status: 'pending' },
        { user_id: 'user-b', friend_id: me, status: 'pending' },
      ],
      me
    );

    expect(statuses.get('user-a')).toBe('pending_outgoing');
    expect(statuses.get('user-b')).toBe('pending_incoming');
  });

  it('omits blocked rows', () => {
    const statuses = getFriendshipStatuses(
      [{ user_id: me, friend_id: 'user-a', status: 'blocked' }],
      me
    );

    expect(statuses.has('user-a')).toBe(false);
  });

  it('returns an empty map for no rows', () => {
    expect(getFriendshipStatuses([], me).size).toBe(0);
  });
});
