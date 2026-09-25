import { describeGameSignupEvent, formatSignupEventTime } from '../utils/signupEventUtils';
import { GameSignupEvent } from '../types/game';

const alice = { id: 'user-alice', username: 'alice', display_name: 'Alice' };
const bob = { id: 'user-bob', username: 'bob', display_name: null };

function makeEvent(overrides: Partial<GameSignupEvent>): GameSignupEvent {
  return {
    id: 'event-1',
    game_id: 'game-1',
    event_type: 'joined',
    user_id: alice.id,
    guest_name: null,
    actor_id: alice.id,
    waitlisted: false,
    created_at: '2026-10-03T17:04:00.000Z',
    user: alice,
    actor: alice,
    ...overrides,
  };
}

describe('describeGameSignupEvent', () => {
  it('describes a signup, distinguishing a waitlisted one', () => {
    expect(describeGameSignupEvent(makeEvent({}))).toBe('Alice signed up');
    expect(describeGameSignupEvent(makeEvent({ waitlisted: true }))).toBe(
      'Alice joined the waitlist'
    );
    expect(describeGameSignupEvent(makeEvent({ waitlisted: null }))).toBe('Alice signed up');
  });

  it('describes a withdrawal, distinguishing one from the waitlist', () => {
    expect(describeGameSignupEvent(makeEvent({ event_type: 'withdrew' }))).toBe('Alice withdrew');
    expect(describeGameSignupEvent(makeEvent({ event_type: 'withdrew', waitlisted: true }))).toBe(
      'Alice left the waitlist'
    );
  });

  it('names the admin who removed a player, falling back to username', () => {
    expect(
      describeGameSignupEvent(makeEvent({ event_type: 'removed', actor_id: bob.id, actor: bob }))
    ).toBe('Alice was removed by bob');
    expect(
      describeGameSignupEvent(makeEvent({ event_type: 'removed', actor_id: null, actor: null }))
    ).toBe('Alice was removed');
  });

  it('describes ringers by guest name and who added or removed them', () => {
    const ringer = { user_id: null, user: null, guest_name: 'Dave' };
    expect(describeGameSignupEvent(makeEvent({ ...ringer, event_type: 'ringer_added' }))).toBe(
      'Alice added ringer Dave'
    );
    expect(
      describeGameSignupEvent(
        makeEvent({
          ...ringer,
          event_type: 'ringer_removed',
          actor_id: null,
          actor: null,
        })
      )
    ).toBe('Ringer Dave was removed');
  });

  it('falls back to a placeholder once the player has deleted their account', () => {
    expect(
      describeGameSignupEvent(makeEvent({ event_type: 'withdrew', user_id: null, user: null }))
    ).toBe('A deleted user withdrew');
    expect(
      describeGameSignupEvent(
        makeEvent({
          event_type: 'account_deleted',
          user_id: null,
          user: null,
          actor: null,
        })
      )
    ).toBe('A player deleted their account');
  });
});

describe('formatSignupEventTime', () => {
  it('formats in UK time regardless of the runtime timezone', () => {
    expect(formatSignupEventTime('2026-10-03T17:04:00.000Z')).toBe('Sat 3 Oct, 18:04');
    expect(formatSignupEventTime('2026-12-05T17:04:00.000Z')).toBe('Sat 5 Dec, 17:04');
  });
});
