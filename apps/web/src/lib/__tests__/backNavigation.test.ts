import { getBackHref } from '../backNavigation';

describe('getBackHref', () => {
  it('returns null for a top-level tab route', () => {
    expect(getBackHref('/games')).toBeNull();
    expect(getBackHref('/friends')).toBeNull();
    expect(getBackHref('/groups')).toBeNull();
    expect(getBackHref('/profile')).toBeNull();
  });

  it('goes up one segment for a game detail page', () => {
    expect(getBackHref('/games/123')).toBe('/games');
  });

  it('goes up one segment for a nested game sub-page', () => {
    expect(getBackHref('/games/123/team-assignment')).toBe('/games/123');
    expect(getBackHref('/games/123/result')).toBe('/games/123');
  });

  it('goes up one segment for friends sub-pages', () => {
    expect(getBackHref('/friends/search')).toBe('/friends');
    expect(getBackHref('/friends/requests')).toBe('/friends');
    expect(getBackHref('/friends/ringers')).toBe('/friends');
  });

  it('goes up one segment for group sub-pages, including nested ones', () => {
    expect(getBackHref('/groups/new')).toBe('/groups');
    expect(getBackHref('/groups/456')).toBe('/groups');
    expect(getBackHref('/groups/456/members')).toBe('/groups/456');
    expect(getBackHref('/groups/456/invite')).toBe('/groups/456');
    expect(getBackHref('/groups/456/games')).toBe('/groups/456');
  });

  it('goes up one segment for profile sub-pages', () => {
    expect(getBackHref('/profile/edit')).toBe('/profile');
    expect(getBackHref('/profile/change-password')).toBe('/profile');
    expect(getBackHref('/profile/about')).toBe('/profile');
    expect(getBackHref('/profile/report-bug')).toBe('/profile');
  });

  it('returns null for the root path', () => {
    expect(getBackHref('/')).toBeNull();
  });

  it('ignores a trailing slash', () => {
    expect(getBackHref('/games/123/')).toBe('/games');
  });
});
