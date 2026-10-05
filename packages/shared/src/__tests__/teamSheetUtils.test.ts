import type { PlayerGameWithProfile } from '../types/game';
import { formatDate } from '../utils/gameUtils';
import {
  DEFAULT_SINGLE_TEAM_SHEET_TEMPLATE,
  DEFAULT_TEAM_SHEET_TEMPLATE,
  buildTeamSheetMessage,
  formatTeamSheetTime,
  getTeamSheetTemplateHelpText,
  normalizeTeamSheetTemplateForSave,
  resolveTeamSheetTemplate,
} from '../utils/teamSheetUtils';

const player = (
  overrides: Partial<PlayerGameWithProfile> & { name: string }
): PlayerGameWithProfile => {
  const { name, ...rest } = overrides;
  return {
    id: name,
    game_id: 'game-1',
    user_id: name,
    signup_order: 1,
    team: null,
    board_x: null,
    board_y: null,
    created_at: '',
    updated_at: '',
    is_ringer: false,
    guest_name: null,
    added_by: null,
    profile: { id: name, username: name.toLowerCase(), display_name: name, avatar_url: null },
    ...rest,
  };
};

// 10:45 BST (UTC+1) on a Saturday.
const game = {
  team1_name: 'White',
  team2_name: 'Black',
  kickoff_date: '2026-10-10T09:45:00.000Z',
};

const players = [
  player({ name: 'Cara', signup_order: 3, team: 1 }),
  player({ name: 'Alice', signup_order: 1, team: 1 }),
  player({ name: 'Bob', signup_order: 2, team: 2 }),
  player({ name: 'Unassigned', signup_order: 4, team: null }),
  player({
    name: 'ringer',
    signup_order: 5,
    team: 2,
    is_ringer: true,
    guest_name: 'Rick (guest)',
    user_id: null,
    profile: null,
  }),
];

describe('teamSheetUtils', () => {
  describe('formatTeamSheetTime', () => {
    it('formats as compact lowercase 12-hour UK time', () => {
      expect(formatTeamSheetTime(new Date('2026-10-10T09:40:00.000Z'))).toBe('10:40am');
      expect(formatTeamSheetTime(new Date('2026-12-05T19:05:00.000Z'))).toBe('7:05pm');
    });
  });

  describe('buildTeamSheetMessage', () => {
    it('recreates the standard team sheet from the default template', () => {
      expect(buildTeamSheetMessage(DEFAULT_TEAM_SHEET_TEMPLATE, game, players)).toBe(
        [
          'Teams are set:',
          '',
          '*White*:',
          'Alice',
          'Cara',
          '',
          '*Black*:',
          'Bob',
          'Rick (guest)',
          '',
          'Be ready to play 10:40am',
        ].join('\n')
      );
    });

    it('renders the single-team default with the opponent and squad', () => {
      expect(buildTeamSheetMessage(DEFAULT_SINGLE_TEAM_SHEET_TEMPLATE, game, players)).toBe(
        'Squad is set vs Black:\n\nAlice\nCara\n\nBe ready to play 10:40am'
      );
    });

    it('supports kickoff time with positive, negative and no offsets', () => {
      expect(
        buildTeamSheetMessage('{kickoff_time} {kickoff_time-15} {kickoff_time + 30}', game, [])
      ).toBe('10:45am 10:30am 11:15am');
    });

    it('fills in the date', () => {
      expect(buildTeamSheetMessage('{date}', game, [])).toBe(formatDate(game.kickoff_date));
    });

    it('leaves unknown placeholders and offsets on non-time placeholders untouched', () => {
      expect(buildTeamSheetMessage('{venue} {team1-5}', game, [])).toBe('{venue} {team1-5}');
    });
  });

  describe('resolveTeamSheetTemplate', () => {
    it('falls back to the mode-appropriate default when unset or blank', () => {
      expect(resolveTeamSheetTemplate(null, false)).toBe(DEFAULT_TEAM_SHEET_TEMPLATE);
      expect(resolveTeamSheetTemplate('  ', true)).toBe(DEFAULT_SINGLE_TEAM_SHEET_TEMPLATE);
      expect(resolveTeamSheetTemplate('Custom', false)).toBe('Custom');
    });
  });

  describe('normalizeTeamSheetTemplateForSave', () => {
    it('stores null for a blank or unchanged default template', () => {
      expect(normalizeTeamSheetTemplateForSave('  ', false)).toBeNull();
      expect(normalizeTeamSheetTemplateForSave(DEFAULT_TEAM_SHEET_TEMPLATE, false)).toBeNull();
      expect(
        normalizeTeamSheetTemplateForSave(DEFAULT_TEAM_SHEET_TEMPLATE.replace(/\n/g, '\r\n'), false)
      ).toBeNull();
    });

    it('keeps a customised template, trimmed', () => {
      expect(normalizeTeamSheetTemplateForSave('  Hi {team1}\n', false)).toBe('Hi {team1}');
    });
  });

  describe('getTeamSheetTemplateHelpText', () => {
    it('explains the templating and lists every placeholder', () => {
      const help = getTeamSheetTemplateHelpText();
      expect(help).toContain('curly braces');
      expect(help).toContain('{team1_players} — Team 1 players, one per line');
      expect(help).toContain('{kickoff_time-5}');
    });
  });
});
