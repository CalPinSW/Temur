import { resolveDeepLinkRoute } from '@/utils/deepLinkRouting';

describe('resolveDeepLinkRoute', () => {
  it.each([
    ['https://www.temur.app/friends/requests', 'temur://friends/requests'],
    ['https://www.temur.app/friends', 'temur://friends'],
  ])('resolves %s and %s to the matching friends screen', (webUrl, appUrl) => {
    const expected = webUrl.includes('requests')
      ? { screen: 'FriendRequests' }
      : { screen: 'Friends' };

    expect(resolveDeepLinkRoute(webUrl)).toEqual(expected);
    expect(resolveDeepLinkRoute(appUrl)).toEqual(expected);
  });

  it('resolves a group invites link to GroupInvites', () => {
    expect(resolveDeepLinkRoute('https://www.temur.app/groups/invites')).toEqual({
      screen: 'GroupInvites',
    });
    expect(resolveDeepLinkRoute('temur://groups/invites')).toEqual({ screen: 'GroupInvites' });
  });

  it('ignores group links that are not invites', () => {
    expect(resolveDeepLinkRoute('https://www.temur.app/groups/abc123')).toBeNull();
  });

  it('resolves a game detail link to GameDetail with the game id', () => {
    expect(resolveDeepLinkRoute('https://www.temur.app/games/abc-123')).toEqual({
      screen: 'GameDetail',
      params: { gameId: 'abc-123' },
    });
    expect(resolveDeepLinkRoute('temur://games/abc-123')).toEqual({
      screen: 'GameDetail',
      params: { gameId: 'abc-123' },
    });
  });

  it('resolves a bare games link to the Games list', () => {
    expect(resolveDeepLinkRoute('https://www.temur.app/games')).toEqual({ screen: 'Games' });
  });

  it('ignores query strings and fragments when matching the path', () => {
    expect(resolveDeepLinkRoute('https://www.temur.app/games/abc-123?foo=bar#section')).toEqual({
      screen: 'GameDetail',
      params: { gameId: 'abc-123' },
    });
  });

  it('returns null for paths with no matching screen', () => {
    expect(resolveDeepLinkRoute('https://www.temur.app/profile/edit')).toBeNull();
    expect(resolveDeepLinkRoute('https://www.temur.app/login')).toBeNull();
    expect(resolveDeepLinkRoute('https://www.temur.app')).toBeNull();
  });
});
